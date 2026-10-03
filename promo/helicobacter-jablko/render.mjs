// promo/helicobacter-jablko/render.mjs
// Renderuje animację z index.html klatka po klatce (czas sterowany z zewnątrz, więc wynik
// jest deterministyczny i nie zależy od szybkości maszyny), a potem składa MP4 ffmpegiem.
//
//   node render.mjs                  -> out/helicobacter-jablko.mp4 (30 kl./s, 20 s)
//   node render.mjs --stills 3.5,11.6 -> out/still-3.5.jpg ... (podgląd wybranych chwil)
//
// Wymaga playwright-core i three w node_modules (npm i playwright-core three) oraz ffmpeg.
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const FPS = 30;
const args = process.argv.slice(2);
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium';

// three: z node_modules obok skryptu albo z katalogu wskazanego w THREE_DIR
const require = createRequire(join(process.env.NODE_MODULES_FROM || HERE, 'x.js'));
const THREE_DIR = process.env.THREE_DIR || dirname(dirname(require.resolve('three')));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.ttf': 'font/ttf', '.jpg': 'image/jpeg' };

const browser = await chromium.launch({
    executablePath: CHROME,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
// Cała strona serwowana lokalnie: pliki z katalogu promo, three z node_modules zamiast CDN.
await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    let file;
    const m = url.pathname.match(/^\/npm\/three@[^/]+\/(.*)$/);
    if (url.hostname === 'cdn.jsdelivr.net' && m) file = join(THREE_DIR, m[1]);
    else if (url.hostname === 'promo.local') file = join(HERE, decodeURIComponent(url.pathname));
    if (!file || !existsSync(file)) return route.abort();
    route.fulfill({ body: readFileSync(file), contentType: MIME[extname(file)] || 'application/octet-stream' });
});
await page.goto('http://promo.local/index.html?render=1');
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });

mkdirSync(OUT, { recursive: true });
if (stillsArg) {
    for (const t of stillsArg.split(',').map(Number)) {
        await page.evaluate((t) => window.__render(t), t);
        await page.screenshot({ path: join(OUT, `still-${t}.jpg`), type: 'jpeg', quality: 90 });
        console.log('still', t);
    }
    await browser.close();
    process.exit(0);
}

const FRAMES = join(OUT, 'frames');
rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });
const dur = await page.evaluate(() => window.__DUR);
const n = Math.round(dur * FPS);
const started = Date.now();
for (let f = 0; f < n; f++) {
    await page.evaluate((t) => window.__render(t), f / FPS);
    await page.screenshot({ path: join(FRAMES, `${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 94 });
    if (f % 30 === 0) console.log(`klatka ${f}/${n}  ${((Date.now() - started) / 1000).toFixed(0)} s`);
}
await browser.close();

const mp4 = join(OUT, 'helicobacter-jablko.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(FRAMES, '%05d.jpg'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', mp4]);
console.log('gotowe:', mp4);
