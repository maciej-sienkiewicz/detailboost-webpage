// capture/recorder.mjs
// Nagrywanie przebiegu w CRM jako wideo - z klatek screencastu Chrome (CDP), nie z
// `recordVideo` Playwrighta. Wbudowane nagrywanie koduje VP8 z bitrate ok. 1 Mbit/s,
// co rozmywa drobny tekst interfejsu; tu dostajemy każdą klatkę jako JPEG q95
// z jej znacznikiem czasu i składamy ją ffmpegiem w stałe 30 kl./s.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

export async function startRecording(page, dir) {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const frames = [];
    let n = 0;
    // Przerwa w nagraniu (np. przygotowanie danych między ujęciami albo przejście
    // na inną kartę) nie może trwać w filmie. Pierwsza klatka po wznowieniu ustawia
    // przesunięcie tak, żeby wypadła `hold` sekund po ostatniej klatce sprzed
    // przerwy - cięcie, nie dziura. Czas klatek to zegar screencastu; zegar ścienny
    // służy tylko do policzenia, ile minęło od ostatniej klatki (patrz `now`).
    let offset = 0;
    let paused = false;
    let rebase = false;
    let hold = 0.15;
    let cdp = null;
    let kind = 'screen';
    let pausedAt = null;
    // Chrome wysyła klatkę tylko przy zmianie obrazu, więc „teraz" w czasie filmu
    // to ostatnia klatka + czas zegarowy, który od niej minął. Bez tego nieruchome
    // przytrzymanie tuż przed cięciem znikało z filmu, a znaczniki kroków po
    // spokojnym fragmencie wypadały za wcześnie.
    const now = () => {
        const last = frames.at(-1);
        return last ? last.t + (Date.now() / 1000 - last.wall) : 0;
    };

    const attach = async (target) => {
        cdp = await target.context().newCDPSession(target);
        const session = cdp;
        session.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
            await session.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
            if (paused || session !== cdp) return;
            if (rebase) {
                if (frames.length) offset = metadata.timestamp - ((pausedAt ?? now()) + hold);
                rebase = false;
                pausedAt = null;
            }
            const file = `${dir}/${String(n++).padStart(5, '0')}.jpg`;
            writeFileSync(file, Buffer.from(data, 'base64'));
            frames.push({ file, t: metadata.timestamp - offset, kind, wall: Date.now() / 1000 });
        });
        const vp = target.viewportSize();
        const dpr = await target.evaluate(() => devicePixelRatio);
        await session.send('Page.startScreencast', {
            format: 'jpeg', quality: 95, everyNthFrame: 1,
            maxWidth: Math.round(vp.width * dpr), maxHeight: Math.round(vp.height * dpr),
        });
    };
    await attach(page);

    const marks = [];
    return {
        frames,
        marks,
        /**
         * Znacznik kroku: chwila nagrania, od której na stronie obowiązuje podpis
         * i ramka. Liczony w zegarze klatek (z przesunięciem po przerwach), więc
         * zgadza się z tym, co wyjdzie z ffmpeg.
         */
        mark(id, focus) {
            const first = frames[0]?.t ?? 0;
            marks.push({ id, t: Math.max(0, (pausedAt ?? now()) - first), ...(focus ? { focus } : {}) });
        },
        /** Zatrzymuje zapis klatek; ostatnia klatka przed przerwą trwa `holdFor` sekund. */
        pause(holdFor = 0.15) {
            pausedAt = now();
            paused = true;
            hold = holdFor;
        },
        resume() {
            rebase = true;
            paused = false;
        },
        /**
         * Przełącza nagrywanie na inną kartę (np. telefon klienta otwierający link do
         * podpisu) - w filmie to cięcie. Obie karty muszą mieć ten sam rozmiar okna.
         */
        async switchTo(target, holdFor = 0.15, { phone = false } = {}) {
            const prev = cdp;
            pausedAt = pausedAt ?? now();
            paused = true;
            await prev.send('Page.stopScreencast').catch(() => {});
            hold = holdFor;
            rebase = true;
            kind = phone ? 'phone' : 'screen';
            paused = false;
            await attach(target);
        },
        async stop() {
            const end = now();
            await cdp.send('Page.stopScreencast').catch(() => {});
            await new Promise((r) => setTimeout(r, 300));
            await dropBlankFrames(frames);
            await composePhoneFrames(frames);
            // Chrome wysyła klatkę tylko, gdy obraz się zmienił - na nieruchomym
            // ekranie przerwa między klatkami bywa długa. Plik concat odtwarza te
            // przerwy co do milisekundy, więc tempo nagrania = tempo przebiegu.
            const list = frames.map((f, i) => {
                const next = frames[i + 1]?.t ?? Math.max(end, f.t + 0.2);
                return `file '${f.file.split('/').pop()}'\nduration ${Math.max(0.001, next - f.t).toFixed(4)}`;
            });
            list.push(`file '${frames.at(-1).file.split('/').pop()}'`);
            writeFileSync(`${dir}/list.txt`, list.join('\n'));
            return frames.length;
        },
    };
}

/**
 * Klatki z telefonu klienta (strona podpisu nagrana w oknie 390 × 844) stawiamy
 * w ramce telefonu na przyciemnionym, rozmytym ekranie studia - tym, który był
 * ostatni przed cięciem. Widz ma zobaczyć, że to klient podpisuje u siebie, a nie
 * studio na swoim komputerze.
 */
async function composePhoneFrames(frames) {
    const first = frames.find((f) => f.kind === 'screen');
    if (!first || !frames.some((f) => f.kind === 'phone')) return;
    const { width: W, height: H } = await sharp(first.file).metadata();
    const backdrops = new Map();
    let lastScreen = first.file;
    for (const f of frames) {
        if (f.kind === 'screen') {
            lastScreen = f.file;
            continue;
        }
        if (!backdrops.has(lastScreen)) {
            backdrops.set(lastScreen, await sharp(lastScreen).resize(W, H).blur(14).modulate({ brightness: 0.42 }).toBuffer());
        }
        const ph = Math.round(H * 0.9);
        const screen = await sharp(f.file).resize({ height: ph - 24 }).toBuffer();
        const { width: sw, height: sh } = await sharp(screen).metadata();
        const pw = sw + 24;
        const r = 38;
        const round = Buffer.from(`<svg width="${sw}" height="${sh}"><rect width="${sw}" height="${sh}" rx="${r - 10}" ry="${r - 10}"/></svg>`);
        const masked = await sharp(screen).composite([{ input: round, blend: 'dest-in' }]).png().toBuffer();
        const bezel = Buffer.from(`<svg width="${pw}" height="${ph}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#2a2a30"/><stop offset="1" stop-color="#121216"/></linearGradient></defs>
            <rect x="0.5" y="0.5" width="${pw - 1}" height="${ph - 1}" rx="${r}" ry="${r}" fill="url(#g)" stroke="#3a3a42"/></svg>`);
        const x = Math.round((W - pw) / 2);
        const y = Math.round((H - ph) / 2);
        const out = await sharp(backdrops.get(lastScreen))
            .composite([{ input: bezel, left: x, top: y }, { input: masked, left: x + 12, top: y + 12 }])
            .jpeg({ quality: 94 })
            .toBuffer();
        writeFileSync(f.file, out);
    }
}

/**
 * Widoki CRM ładują dane po wejściu i przez ułamek sekundy pokazują pustą, białą
 * stronę. Na żywo to mrugnięcie, w nagraniu - biała klatka, która wybija z rytmu.
 * Wycinamy je: poprzednia klatka trwa wtedy dłużej, co wygląda jak natychmiastowe
 * przejście. Pusta = prawie biała i prawie jednolita w CAŁYM kadrze (pasek boczny
 * jest ciemny, więc kadr z menu i pustą treścią nie przechodzi tego testu - tniemy
 * po obszarze treści, na prawo od paska).
 */
async function dropBlankFrames(frames) {
    for (let i = frames.length - 1; i > 0; i--) {
        const img = sharp(frames[i].file);
        const { width, height } = await img.metadata();
        const left = Math.round(width * 0.2);
        const { channels } = await img.extract({ left, top: 0, width: width - left, height }).stats();
        const mean = channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3;
        const dev = channels.slice(0, 3).reduce((a, c) => a + c.stdev, 0) / 3;
        if (mean > 243 && dev < 9) frames.splice(i, 1);
    }
}

/**
 * VP9 w WebM (Chrome, Firefox, Edge; Chromium bez kodeków własnościowych, w którym
 * nagrania się sprawdza) i H.264 w MP4 jako zapas dla Safari. Przy tej samej
 * ostrości tekstu oba ważą podobnie; przeglądarka pobiera tylko jeden.
 * AV1 (SVT-AV1) ważył tyle samo albo więcej - nagranie interfejsu to głównie
 * nieruchome płaszczyzny, które x264 z `-tune stillimage` i VP9 kodują już oszczędnie.
 */
export function encode(dir, out, { width, speed = 1 } = {}) {
    // `speed` > 1 skraca scenę bez wycinania kroków: hero ma kilkanaście sekund
    // uwagi na nagranie, a przebieg w aplikacji trwa dłużej, bo czeka na serwer.
    const vf = `setpts=PTS/${speed},fps=30,scale=${width}:-2:flags=lanczos,format=yuv420p`;
    const input = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${dir}/list.txt`, '-vf', vf, '-an'];
    execFileSync('ffmpeg', [...input, '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-tune', 'stillimage',
        '-profile:v', 'high', '-movflags', '+faststart', `${out}.mp4`]);
    execFileSync('ffmpeg', [...input, '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0', '-row-mt', '1',
        '-deadline', 'good', '-cpu-used', '2', `${out}.webm`]);
}
