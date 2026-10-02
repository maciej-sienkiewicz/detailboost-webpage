// capture/recorder.mjs
// Nagrywanie przebiegu w CRM jako wideo - z klatek screencastu Chrome (CDP), nie z
// `recordVideo` Playwrighta. Wbudowane nagrywanie koduje VP8 z bitrate ok. 1 Mbit/s,
// co rozmywa drobny tekst interfejsu; tu dostajemy każdą klatkę jako JPEG q95
// z jej znacznikiem czasu i składamy ją ffmpegiem w stałe 30 kl./s.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { FRAME, deviceLayout } from './device.mjs';

export async function startRecording(page, dir, { device = 'screen' } = {}) {
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
    let kindVp = null;
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
            frames.push({ file, t: metadata.timestamp - offset, kind, vp: kindVp, wall: Date.now() / 1000 });
        });
        const vp = target.viewportSize();
        const dpr = await target.evaluate(() => devicePixelRatio);
        await session.send('Page.startScreencast', {
            format: 'jpeg', quality: 95, everyNthFrame: 1,
            maxWidth: Math.round(vp.width * dpr), maxHeight: Math.round(vp.height * dpr),
        });
    };
    kind = device;
    kindVp = page.viewportSize();
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
            this.release();
            const first = frames[0]?.t ?? 0;
            marks.push({ id, t: Math.max(0, (pausedAt ?? now()) - first), ...(focus ? { focus } : {}) });
        },
        /**
         * Koniec ramki bieżącego kroku: od tej chwili obrysowany obszar przestaje
         * pokazywać to, o czym mowa (kliknięcie gdzie indziej, przewinięcie, cięcie).
         * Podpis kroku zostaje do następnego znacznika.
         */
        release(lag = 0.1) {
            const m = marks.at(-1);
            if (!m || m.until != null) return;
            const first = frames[0]?.t ?? 0;
            m.until = Math.max(m.t, (pausedAt ?? now()) - first + lag);
        },
        /** Zatrzymuje zapis klatek; ostatnia klatka przed przerwą trwa `holdFor` sekund. */
        pause(holdFor = 0.15) {
            this.release(0);
            // Druga pauza bez wznowienia nie przesuwa chwili cięcia.
            pausedAt = pausedAt ?? now();
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
        async switchTo(target, holdFor = 0.15, { device = 'screen' } = {}) {
            this.release(0);
            const prev = cdp;
            pausedAt = pausedAt ?? now();
            paused = true;
            await prev.send('Page.stopScreencast').catch(() => {});
            hold = holdFor;
            rebase = true;
            kind = device;
            kindVp = target.viewportSize();
            paused = false;
            await attach(target);
        },
        async stop() {
            const end = now();
            await cdp.send('Page.stopScreencast').catch(() => {});
            await new Promise((r) => setTimeout(r, 300));
            await dropBlankFrames(frames);
            await composeDeviceFrames(frames);
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
 * Klatki z urządzeń stawiamy w ramce urządzenia:
 *  - telefon klienta (strona podpisu z linku SMS) - na przyciemnionym, rozmytym
 *    ekranie studia, tym ostatnim przed cięciem: widz ma zobaczyć, że to klient
 *    podpisuje u siebie, a nie studio na swoim komputerze;
 *  - tablet w recepcji (przyjęcie pojazdu) - na ciemnym tle strony.
 */
async function composeDeviceFrames(frames) {
    const devices = frames.filter((f) => f.kind !== 'screen');
    if (!devices.length) return;
    const { width: W, height: H } = FRAME;
    const backdrops = new Map();
    const plain = await sharp(Buffer.from(`<svg width="${W}" height="${H}"><defs><radialGradient id="g" cx="50%" cy="42%" r="75%">
        <stop offset="0" stop-color="#1b1b21"/><stop offset="1" stop-color="#09090b"/></radialGradient></defs>
        <rect width="${W}" height="${H}" fill="url(#g)"/></svg>`)).png().toBuffer();
    const bezels = new Map();
    // Tło urządzenia „podanego klientowi" (telefon, tablet pionowo) to ostatnia klatka
    // ekranu pod nim - już złożona, więc tablet w recepcji też trafia na rozmyte tło.
    let lastScreen = null;
    for (const f of frames) {
        if (f.kind === 'screen') {
            lastScreen = f.file;
            continue;
        }
        const L = deviceLayout(f.kind, f.vp);
        let back = plain;
        if (!L.overlay) lastScreen = f.file;
        if (L.overlay && lastScreen) {
            if (!backdrops.has(lastScreen)) {
                backdrops.set(lastScreen, await sharp(lastScreen).resize(W, H).blur(14).modulate({ brightness: 0.42 }).toBuffer());
            }
            back = backdrops.get(lastScreen);
        }
        const key = `${f.kind}-${L.ow}x${L.oh}`;
        if (!bezels.has(key)) {
            bezels.set(key, Buffer.from(`<svg width="${L.ow}" height="${L.oh}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#2a2a30"/><stop offset="1" stop-color="#111115"/></linearGradient></defs>
                <rect x="0.5" y="0.5" width="${L.ow - 1}" height="${L.oh - 1}" rx="${L.radius}" ry="${L.radius}" fill="url(#g)" stroke="#3a3a42"/>
                ${f.kind.startsWith('tablet') ? (L.ow > L.oh
                    ? `<circle cx="${L.bezel / 2}" cy="${L.oh / 2}" r="2.6" fill="#3d3d46"/>`
                    : `<circle cx="${L.ow / 2}" cy="${L.bezel / 2}" r="2.6" fill="#3d3d46"/>`) : ''}</svg>`));
        }
        const r = Math.max(6, L.radius - L.bezel + 4);
        const screen = await sharp(f.file).resize(L.sw, L.sh).toBuffer();
        const round = Buffer.from(`<svg width="${L.sw}" height="${L.sh}"><rect width="${L.sw}" height="${L.sh}" rx="${r}" ry="${r}"/></svg>`);
        const masked = await sharp(screen).composite([{ input: round, blend: 'dest-in' }]).png().toBuffer();
        const out = await sharp(back)
            .composite([{ input: bezels.get(key), left: L.ox, top: L.oy }, { input: masked, left: L.sx, top: L.sy }])
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
