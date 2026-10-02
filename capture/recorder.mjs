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
    const cdp = await page.context().newCDPSession(page);
    const frames = [];
    let n = 0;
    // Przerwa w nagraniu (np. przygotowanie danych między ujęciami) nie może trwać
    // w filmie. Pierwsza klatka po wznowieniu ustawia przesunięcie tak, żeby wypadła
    // `hold` sekund po ostatniej klatce sprzed przerwy - cięcie, nie dziura. Liczone
    // w zegarze screencastu, nie `Date.now()`: to dwa różne zegary.
    let offset = 0;
    let paused = false;
    let rebase = false;
    let hold = 0.15;
    cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
        await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
        if (paused) return;
        if (rebase) {
            const last = frames.at(-1);
            if (last) offset = metadata.timestamp - (last.t + hold);
            rebase = false;
        }
        const file = `${dir}/${String(n++).padStart(5, '0')}.jpg`;
        writeFileSync(file, Buffer.from(data, 'base64'));
        frames.push({ file, t: metadata.timestamp - offset });
    });
    const vp = page.viewportSize();
    const dpr = await page.evaluate(() => devicePixelRatio);
    await cdp.send('Page.startScreencast', {
        format: 'jpeg', quality: 95, everyNthFrame: 1,
        maxWidth: Math.round(vp.width * dpr), maxHeight: Math.round(vp.height * dpr),
    });
    return {
        frames,
        /** Zatrzymuje zapis klatek; ostatnia klatka przed przerwą trwa `holdFor` sekund. */
        pause(holdFor = 0.15) {
            paused = true;
            hold = holdFor;
        },
        resume() {
            rebase = true;
            paused = false;
        },
        async stop() {
            await cdp.send('Page.stopScreencast');
            await new Promise((r) => setTimeout(r, 300));
            await dropBlankFrames(frames);
            // Chrome wysyła klatkę tylko, gdy obraz się zmienił - na nieruchomym
            // ekranie przerwa między klatkami bywa długa. Plik concat odtwarza te
            // przerwy co do milisekundy, więc tempo nagrania = tempo przebiegu.
            const list = frames.map((f, i) => {
                const next = frames[i + 1]?.t ?? f.t + 0.5;
                return `file '${f.file.split('/').pop()}'\nduration ${Math.max(0.001, next - f.t).toFixed(4)}`;
            });
            list.push(`file '${frames.at(-1).file.split('/').pop()}'`);
            writeFileSync(`${dir}/list.txt`, list.join('\n'));
            return frames.length;
        },
    };
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
