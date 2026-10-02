// capture/run.mjs
// Uruchamia scenę: konto demo → przygotowanie (poza nagraniem) → nagranie →
// kodowanie do public/scenes/<nazwa>.{webm,mp4} + plakat .webp.
//
// Uruchomienie:  node capture/run.mjs reservation|ksef|instagram
// Samo kodowanie z zapisanych klatek (bez nagrywania):  ENCODE_ONLY=1 node capture/run.mjs …
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { openDemo } from './lib.mjs';
import { startRecording, encode } from './recorder.mjs';

const name = process.argv[2];
const scene = (await import(`./scene-${name}.mjs`)).default;
const RAW = process.env.REC_TMP ?? `/tmp/detailboost-rec/${name}`;
const OUT = 'public/scenes';
mkdirSync(OUT, { recursive: true });

if (!process.env.ENCODE_ONLY) {
    const demo = await openDemo();
    try {
        await scene.prepare(demo);
        const rec = await startRecording(demo.page, RAW);
        await scene.play({ ...demo, rec });
        const frames = await rec.stop();
        console.log(`[${name}] klatek: ${frames}`);
        writeFileSync(`${RAW}/marks.json`, JSON.stringify(rec.marks));
    } finally {
        await demo.browser.close();
    }
}

const speed = scene.speed ?? 1;
// Screencast oddaje klatki w pikselach CSS (1440 px) - kodujemy w tej szerokości;
// skalowanie w górę dokładało tylko wagi, nie ostrości.
encode(RAW, `${OUT}/${name}`, { width: 1440, speed });
// Czasy kroków dla warstwy „motion" na stronie - już po przyspieszeniu sceny.
const marks = JSON.parse(readFileSync(`${RAW}/marks.json`, 'utf8'));
mkdirSync('src/scenes', { recursive: true });
writeFileSync(`src/scenes/${name}.timing.json`, `${JSON.stringify(
    Object.fromEntries(marks.map(({ id, t, focus }) => [id, { at: Math.round((t / speed) * 100) / 100, ...(focus ? { focus } : {}) }])),
    null, 4)}\n`);
// Plakat: kadr, który sam opowiada scenę (podaje go scena), w dwóch szerokościach.
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(scene.posterAt), '-i', `${OUT}/${name}.mp4`,
    '-frames:v', '1', '-c:v', 'libwebp', '-quality', '82', `${OUT}/${name}-poster.webp`]);
console.log(`[${name}] gotowe`);
