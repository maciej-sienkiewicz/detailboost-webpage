// capture/lib.mjs
// Wspólne narzędzia nagrań: przeglądarka z sesją konta demo, „kursor" rysowany
// w stronie i płynne ruchy do elementów.
//
// Chrome bez okna nie rysuje kursora systemowego, a screencast i tak by go nie
// złapał. Rysujemy więc własny wskaźnik - pierścień z tłem, bez strzałki - jako
// element strony. Dzięki temu jest na każdej klatce nagrania, dokładnie tam,
// gdzie trafia kliknięcie Playwrighta.
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { FRAME, deviceLayout } from './device.mjs';

export const BASE = process.env.CRM_URL ?? 'http://localhost:5173';
const CHROME = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const CURSOR_SCRIPT = `
(() => {
    if (window.__cursor) return;
    const css = \`
        #__cur { position: fixed; left: 0; top: 0; width: 26px; height: 26px; margin: -13px 0 0 -13px;
            border-radius: 50%; z-index: 2147483647; pointer-events: none;
            background: rgba(255,255,255,0.28); border: 2px solid rgba(15,23,42,0.78);
            box-shadow: 0 2px 10px rgba(15,23,42,0.28), inset 0 0 0 1px rgba(255,255,255,0.6);
            transition: transform 120ms ease, opacity 200ms ease; opacity: 0; will-change: left, top; }
        #__cur.down { transform: scale(0.72); }
        .__ripple { position: fixed; width: 26px; height: 26px; margin: -13px 0 0 -13px; border-radius: 50%;
            border: 2px solid rgba(15,23,42,0.55); z-index: 2147483646; pointer-events: none;
            animation: __rip 520ms cubic-bezier(.2,.7,.3,1) forwards; }
        @keyframes __rip { from { transform: scale(0.6); opacity: .9 } to { transform: scale(2.4); opacity: 0 } }
        [data-hide-for-reel] { display: none !important; }
    \`;
    const boot = () => {
        if (document.getElementById('__cur')) return;
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        const el = document.createElement('div');
        el.id = '__cur';
        document.body.appendChild(el);
    };
    const pos = { x: innerWidth * 0.6, y: innerHeight * 0.55 };
    window.__cursor = {
        show(x, y) { boot(); const el = document.getElementById('__cur'); pos.x = x; pos.y = y;
            el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.opacity = '1'; },
        hide() { const el = document.getElementById('__cur'); if (el) el.style.opacity = '0'; },
        move(x, y, ms) {
            boot();
            const el = document.getElementById('__cur');
            el.style.opacity = '1';
            const x0 = pos.x, y0 = pos.y, t0 = performance.now();
            // Ruch po lekkim łuku z wygaszaniem prędkości - prosta linia ze stałą
            // prędkością od razu zdradza automat.
            const bend = Math.min(80, Math.hypot(x - x0, y - y0) * 0.12);
            return new Promise((done) => {
                const step = (now) => {
                    const t = Math.min(1, (now - t0) / ms);
                    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                    const arc = Math.sin(Math.PI * e) * bend;
                    pos.x = x0 + (x - x0) * e;
                    pos.y = y0 + (y - y0) * e - arc;
                    el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px';
                    if (t < 1) requestAnimationFrame(step); else done();
                };
                requestAnimationFrame(step);
            });
        },
        press() { const el = document.getElementById('__cur'); el.classList.add('down');
            const r = document.createElement('div'); r.className = '__ripple';
            r.style.left = pos.x + 'px'; r.style.top = pos.y + 'px'; document.body.appendChild(r);
            setTimeout(() => r.remove(), 600); },
        release() { document.getElementById('__cur')?.classList.remove('down'); },
    };
    // Pływający przełącznik PIN (prawy dolny róg) nie należy do kadru.
    setInterval(() => {
        for (const el of document.querySelectorAll('body *')) {
            if (el.id === '__cur' || el.classList.contains('__ripple')) continue;
            const cs = getComputedStyle(el);
            if (cs.position !== 'fixed') continue;
            const r = el.getBoundingClientRect();
            if (r.width < 90 && r.height < 90 && r.width > 20 && r.right > innerWidth - 120 && r.bottom > innerHeight - 120) el.style.display = 'none';
        }
    }, 250);
})();
`;

/*
 * Logo marki w nagłówku wizyty i leada CRM pobiera z CDN (jsDelivr, zbiór
 * car-logos-dataset), a przy błędzie wstawia zastępczą ikonę auta. W tym środowisku
 * ruch wychodzący idzie przez proxy, z którym przeglądarka bywa kapryśna - nagranie
 * raz miało logo, raz ikonę. Dlatego te same pliki z tego samego CDN pobiera raz curl
 * (do pamięci podręcznej), a przeglądarka dostaje je z niej, z nagłówkiem CORS, którego
 * CRM potrzebuje do przycięcia marginesów logo.
 */
const LOGO_CACHE = '/tmp/detailboost-car-logos';

function cachedLogo(url) {
    mkdirSync(LOGO_CACHE, { recursive: true });
    const file = `${LOGO_CACHE}/${url.split('/').pop()}`;
    if (!existsSync(file)) execFileSync('curl', ['-sSfL', '--retry', '3', '-o', file, url]);
    return readFileSync(file);
}

export async function openDemo({ width = 1440, height = 900, dpr = 1.5 } = {}) {
    const browser = await chromium.launch({ executablePath: CHROME });
    const ctx = await browser.newContext({
        viewport: { width, height },
        deviceScaleFactor: dpr,
        locale: 'pl-PL',
        timezoneId: 'Europe/Warsaw',
    });
    await ctx.addInitScript(CURSOR_SCRIPT);
    await ctx.route(/car-logos-dataset@master\/logos\//, (route) => {
        try {
            route.fulfill({
                status: 200,
                contentType: 'image/png',
                headers: { 'access-control-allow-origin': '*', 'cache-control': 'max-age=86400' },
                body: cachedLogo(route.request().url()),
            });
        } catch {
            route.fulfill({ status: 404, body: '' });
        }
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.warn('[page]', e.message));
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    const res = await page.request.post(`${BASE}/api/v1/demo`);
    if (!res.ok()) throw new Error(`POST /api/v1/demo: ${res.status()}`);
    const { auth } = await res.json();
    return { browser, ctx, page, studioId: auth.user.studioId, userId: auth.user.userId };
}

export const wait = (page, ms) => page.waitForTimeout(ms);

async function center(locator) {
    await locator.waitFor({ state: 'visible', timeout: 20000 });
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    if (!box) throw new Error('Element bez położenia');
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Płynny ruch wskaźnika do elementu; prawdziwa mysz jedzie razem z nim (hover). */
export async function moveTo(page, locator, ms = 650, { dx = 0, dy = 0 } = {}) {
    const c = await center(locator);
    const x = c.x + dx;
    const y = c.y + dy;
    await Promise.all([
        page.evaluate(([x, y, ms]) => window.__cursor.move(x, y, ms), [x, y, ms]),
        page.mouse.move(x, y, { steps: Math.max(4, Math.round(ms / 40)) }),
    ]);
    return { x, y };
}

/**
 * `end: true` - kliknięcie kończy to, co obrysowuje ramka (zapis zamykający okno,
 * otwarcie okna NAD obrysowanym miejscem). Kliknięcie wewnątrz ramki samo jej nie gasi,
 * więc bez tego ramka zostawała na zamkniętym oknie aż do następnego kroku.
 */
export async function click(page, locator, { ms = 650, settle = 250, end = false } = {}) {
    const at = await moveTo(page, locator, ms);
    await wait(page, 120);
    await page.evaluate(() => window.__cursor.press());
    // Kliknięcie poza obrysowanym obszarem zmienia ekran gdzie indziej - ramka
    // poprzedniego kroku nie może tam zostać.
    if (open && (open.page !== page || at.x < open.box.x || at.x > open.box.x + open.box.width
        || at.y < open.box.y || at.y > open.box.y + open.box.height)) release();
    await locator.click();
    if (end) release();
    await page.evaluate(() => window.__cursor.release());
    await wait(page, settle);
}

/** Pisanie w tempie człowieka: krótkie, nierówne odstępy między znakami. */
export async function type(page, text, base = 55) {
    for (const ch of text) {
        await page.keyboard.type(ch);
        await wait(page, base + Math.round(Math.random() * base * 0.8));
    }
}

export async function showCursorAt(page, x, y) {
    await page.evaluate(([x, y]) => window.__cursor.show(x, y), [x, y]);
    await page.mouse.move(x, y);
}

/**
 * Krok sceny dla warstwy „motion" na stronie: chwila + obszar kadru (w % okna), na
 * którym ma spocząć kamera i złota ramka. Obszar brany z prawdziwego położenia
 * elementu, nie wpisywany ręcznie - zmiana układu CRM nie rozjedzie ramki z treścią.
 */
/** Krok z ramką, który trwa: jego obszar na stronie, żeby kliknięcie obok go kończyło. */
let open = null;

/** Koniec ramki bieżącego kroku (przed przewinięciem, zamknięciem okna itp.). */
export function release() {
    open?.rec.release();
    open = null;
}

/**
 * Położenie elementu, gdy przestanie się ruszać. Okna wjeżdżają, powiadomienia
 * rozsuwają stos, paragon się drukuje - pomiar w trakcie ruchu dawał ramkę obok treści.
 */
async function stableBox(locator, timeout = 1500) {
    let prev = await locator.boundingBox();
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
        await new Promise((r) => setTimeout(r, 90));
        const box = await locator.boundingBox();
        const same = prev && box && ['x', 'y', 'width', 'height'].every((k) => Math.abs(box[k] - prev[k]) < 0.5);
        prev = box;
        if (same) break;
    }
    return prev;
}

export async function beat(page, rec, id, locator, pad = 10) {
    open = null;
    if (!locator) return rec.mark(id);
    const box = await stableBox(locator);
    const vp = page.viewportSize();
    if (!box) return rec.mark(id);
    open = { rec, page, box };
    let x = Math.max(0, box.x - pad);
    let y = Math.max(0, box.y - pad);
    let w = Math.min(vp.width - x, box.width + pad * 2);
    let h = Math.min(vp.height - y, box.height + pad * 2);
    let W = vp.width;
    let H = vp.height;
    const device = page.__device;
    if (device) {
        // Ekran urządzenia stoi w kadrze 1440 × 900 w ramce (capture/device.mjs).
        const L = deviceLayout(device, vp);
        W = FRAME.width;
        H = FRAME.height;
        [x, y, w, h] = [L.sx + x * L.scale, L.sy + y * L.scale, w * L.scale, h * L.scale];
    }
    const r = (v) => Math.round(v * 10) / 10;
    rec.mark(id, { x: r((x / W) * 100), y: r((y / H) * 100), w: r((w / W) * 100), h: r((h / H) * 100) });
}

/** Odręczny podpis myszą: kilka pociągnięć z wygładzonymi punktami, pierścień jedzie razem. */
export async function drawSignature(page, box) {
    const strokes = [
        // „M" z zawijasem, potem „Sz", potem kreska podkreślenia.
        [[0.08, 0.62], [0.12, 0.3], [0.17, 0.6], [0.22, 0.28], [0.27, 0.64], [0.31, 0.5], [0.36, 0.52]],
        [[0.4, 0.42], [0.46, 0.36], [0.44, 0.5], [0.5, 0.58], [0.47, 0.66], [0.42, 0.62]],
        [[0.53, 0.4], [0.6, 0.4], [0.54, 0.6], [0.62, 0.6], [0.66, 0.46], [0.7, 0.58], [0.74, 0.44], [0.8, 0.54]],
        [[0.12, 0.76], [0.4, 0.73], [0.7, 0.71], [0.86, 0.7]],
    ];
    for (const stroke of strokes) {
        const pts = stroke.map(([fx, fy]) => [box.x + fx * box.width, box.y + fy * box.height]);
        await page.evaluate(([x, y]) => window.__cursor.move(x, y, 220), pts[0]);
        await page.mouse.move(pts[0][0], pts[0][1]);
        await page.mouse.down();
        for (let i = 1; i < pts.length; i++) {
            const [x0, y0] = pts[i - 1];
            const [x1, y1] = pts[i];
            for (let k = 1; k <= 4; k++) {
                const x = x0 + ((x1 - x0) * k) / 4;
                const y = y0 + ((y1 - y0) * k) / 4;
                await page.mouse.move(x, y);
                await page.evaluate(([x, y]) => window.__cursor.show(x, y), [x, y]);
            }
        }
        await page.mouse.up();
        await page.waitForTimeout(80);
    }
}

/** Czeka, aż logo marki w nagłówku naprawdę się narysuje (CRM przycina je w canvas). */
export async function waitForLogo(page) {
    await page.waitForFunction(() => [...document.images].some((img) =>
        (img.src.startsWith('blob:') || img.src.includes('car-logos')) && img.complete && img.naturalWidth > 0), null, { timeout: 15000 });
    await page.waitForTimeout(400);
}
