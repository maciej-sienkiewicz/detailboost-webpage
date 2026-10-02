// capture/optimize.mjs
// PNG z capture/raw → WebP w public/screens, w szerokościach pod srcset.
// 2880 px to pełny zrzut przy DPR 2 (okno ~860 px na Retinie), 1440 px - ekrany 1x.
// Szerokości większej niż źródło nie robimy: powiększony zrzut z telefonu (780 px)
// ważyłby kilka razy więcej i nie byłby ani trochę ostrzejszy - dostaje własną.
// Jakość 86: niżej zaczynają się brudzić cienkie linie siatki kalendarza.
//
// Uruchomienie:  node capture/optimize.mjs
import sharp from 'sharp';
import { mkdirSync, readdirSync } from 'node:fs';

const IN = 'capture/raw';
const OUT = 'public/screens';
const WIDTHS = [2880, 1440];

mkdirSync(OUT, { recursive: true });

for (const file of readdirSync(IN).filter((f) => f.endsWith('.png'))) {
    const name = file.replace(/\.png$/, '');
    const { width } = await sharp(`${IN}/${file}`).metadata();
    const widths = WIDTHS.filter((w) => w <= width);
    for (const w of widths.length ? widths : [width]) {
        const target = `${OUT}/${name}-${w}.webp`;
        const info = await sharp(`${IN}/${file}`).resize({ width: w }).webp({ quality: 86, effort: 6 }).toFile(target);
        console.log(target, `${Math.round(info.size / 1024)} KB`);
    }
}
