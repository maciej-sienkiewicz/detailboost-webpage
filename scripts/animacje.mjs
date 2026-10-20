/**
 * Przenosi animacje-instrukcje z folderu projektu animacji na podstronę „Poznaj program".
 *
 *   node scripts/animacje.mjs [folder-animacji] [slug ...]
 *
 * Folder animacji domyślnie: $ANIMACJE_DIR albo /mnt/project-files/animacje. Bez slugów
 * przetwarza wszystkie pozycje z `src/poznaj/animacje.json`, ze slugami tylko te.
 *
 * Dla każdej pozycji:
 * - `rodzaj: "html"`: bierze zbudowany `index.html` (a gdy go nie ma, buduje go z `build.py`
 *   w kopii roboczej, żeby nie ruszać plików w folderze animacji), dopisuje nagłówek
 *   dokumentu i tryb osadzenia (`public/animacje/osadzenie.css`), czcionki kieruje do
 *   wspólnego `public/animacje/a/` i zapisuje `public/animacje/<slug>/index.html`;
 * - `rodzaj: "mp4"`: kopiuje film do `public/animacje/<slug>/film.mp4`;
 * - robi plakat `plakat.webp` (kadr z 40% animacji albo filmu) i zapisuje długość
 *   i rozdziały (z odtwarzacza HTML, przy filmie z pola `rozdzialy` w manifeście)
 *   do `src/poznaj/animacje.gen.json`.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [srcArg, ...only] = process.argv.slice(2);
const SRC = path.resolve(srcArg || process.env.ANIMACJE_DIR || '/mnt/project-files/animacje');
const OUT = path.join(ROOT, 'public/animacje');
const MANIFEST = path.join(ROOT, 'src/poznaj/animacje.json');
const GEN = path.join(ROOT, 'src/poznaj/animacje.gen.json');

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const gen = fs.existsSync(GEN) ? JSON.parse(fs.readFileSync(GEN, 'utf8')) : {};
const todo = only.length ? manifest.filter((a) => only.includes(a.slug)) : manifest;
if (only.length && todo.length !== only.length) throw new Error(`Nie ma w manifeście: ${only.filter((s) => !todo.some((a) => a.slug === s))}`);

/** Plakat: kadr z mniej więcej 40% animacji - po wstępie, w środku pierwszej czynności. */
const POSTER_AT = 0.4;
const POSTER_W = 960;

/** Nagłówek dopisywany do animacji. Tryb osadzenia włącza się tylko w ramce na stronie. */
const HEAD = `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<link rel="stylesheet" href="../osadzenie.css">
<script>if (window.self !== window.top) { document.documentElement.classList.add('osadzona'); document.documentElement.dataset.theme = 'dark'; }</script>
`;

function builtHtml(dir) {
    const built = path.join(dir, 'index.html');
    if (fs.existsSync(built)) return { html: fs.readFileSync(built, 'utf8'), fonts: path.join(dir, 'a') };
    if (!fs.existsSync(path.join(dir, 'build.py'))) throw new Error(`Brak index.html i build.py w ${dir}`);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'animacja-'));
    fs.cpSync(dir, tmp, { recursive: true });
    execFileSync('python3', ['-I', path.join(tmp, 'build.py')], { stdio: 'inherit' });
    return { html: fs.readFileSync(path.join(tmp, 'index.html'), 'utf8'), fonts: path.join(tmp, 'a') };
}

function wrap(html) {
    const body = html.replaceAll('url(a/', 'url(../a/').replace(/^<!doctype[^>]*>\s*/i, '');
    return `${HEAD}</head>\n<body>\n${body}\n</body>\n</html>\n`;
}

function duration(file) {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
    return Number(out.toString().trim());
}

async function poster(input, dest) {
    await sharp(input).resize({ width: POSTER_W }).webp({ quality: 78 }).toFile(dest);
}

const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined),
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1, colorScheme: 'dark' });
page.on('pageerror', (e) => console.warn('  błąd strony:', e.message));

fs.mkdirSync(path.join(OUT, 'a'), { recursive: true });
for (const a of todo) {
    const dir = path.join(OUT, a.slug);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const from = path.join(SRC, a.zrodlo);
    console.log(`${a.slug}  ←  ${a.zrodlo}`);

    if (a.rodzaj === 'mp4') {
        fs.copyFileSync(from, path.join(dir, 'film.mp4'));
        const czas = duration(from);
        const frame = path.join(os.tmpdir(), `${a.slug}-plakat.png`);
        execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(czas * POSTER_AT), '-i', from, '-frames:v', '1', frame]);
        await poster(frame, path.join(dir, 'plakat.webp'));
        gen[a.slug] = { czas: Math.round(czas), rozdzialy: a.rozdzialy ?? [] };
        continue;
    }

    const { html, fonts } = builtHtml(from);
    for (const f of fs.readdirSync(fonts)) fs.copyFileSync(path.join(fonts, f), path.join(OUT, 'a', f));
    const file = path.join(dir, 'index.html');
    fs.writeFileSync(file, wrap(html));

    // Strona otwarta wprost (nie w ramce) nie ma trybu osadzenia: kadr robimy z samej sceny.
    await page.goto(pathToFileURL(file).href);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => typeof window.__dur === 'number');
    const info = await page.evaluate((at) => {
        window.__seek(window.__dur * at);
        return {
            czas: Math.round(window.__dur),
            rozdzialy: [...document.querySelectorAll('#chaps button')].map((b) => b.textContent.replace(/^\d+\.\s*/, '')),
        };
    }, POSTER_AT);
    await page.waitForTimeout(300);
    const shot = path.join(os.tmpdir(), `${a.slug}-plakat.png`);
    await page.locator('#player').screenshot({ path: shot });
    await poster(shot, path.join(dir, 'plakat.webp'));
    gen[a.slug] = info;
}
await browser.close();

// Wpisy usunięte z manifestu znikają też z wygenerowanych danych.
const known = new Set(manifest.map((a) => a.slug));
const sorted = Object.fromEntries(Object.entries(gen).filter(([s]) => known.has(s)).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(GEN, `${JSON.stringify(sorted, null, 4)}\n`);
console.log(`gotowe: ${todo.length} z ${manifest.length}`);
