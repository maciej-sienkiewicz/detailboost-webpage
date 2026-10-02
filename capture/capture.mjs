// capture/capture.mjs
// Zrzuty ekranu do okna aplikacji w sekcji Hero - z DZIAŁAJĄCEGO CRM, nie z makiety.
//
// Zakłada backend na :8080 (`./gradlew bootRun -PksefStub` w automotive-crm-v2-backend)
// i front na http://localhost:5173 (`npm run dev` w detailing-crm-v2). Musi to być
// `localhost`, bo CORS backendu nie wpuszcza 127.0.0.1.
//
// Konto zakłada `POST /api/v1/demo`: osobne studio z danymi demonstracyjnymi, usuwane
// po dwóch godzinach. Sesja żyje tylko w tym kontekście przeglądarki - nic nie trafia
// na dysk poza samymi zrzutami.
//
// Uruchomienie:  node capture/capture.mjs [katalog_wyjściowy]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.env.CRM_URL ?? 'http://localhost:5173';
const OUT = process.argv[2] ?? 'capture/raw';
const CHROME = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

// 1440 × 900 przy DPR 2. Okno w Hero ma ok. 860 px szerokości, więc interfejs
// pomniejsza się do ok. 60% - węższe okno łamało tytuł kalendarza na cztery linie,
// a DPR 2 trzyma ostrość na ekranach Retina.
const VIEWPORT = { width: 1440, height: 900 };

const SHOTS = [
    { name: 'calendar-week', path: '/calendar', prepare: async (page) => {
        await page.getByRole('button', { name: /^Tydzień$/ }).first().click().catch(() => {});
    } },
    { name: 'calendar-month', path: '/calendar' },
    { name: 'customers', path: '/customers' },
    // Telefon: kalendarz w układzie mobilnym CRM (tam domyślnie lista, widoku tygodnia
    // na telefonie nie ma). Pomniejszony zrzut z komputera ma na 350 px nieczytelne,
    // ok. 3-pikselowe litery.
    { name: 'calendar-mobile', path: '/calendar', viewport: { width: 390, height: 640 } },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw',
});
const page = await ctx.newPage();

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
const res = await page.request.post(`${BASE}/api/v1/demo`);
if (!res.ok()) throw new Error(`POST /api/v1/demo: ${res.status()} ${await res.text()}`);

// Pływający przełącznik PIN w prawym dolnym rogu i toasty nie należą do kadru.
const tidy = () => page.evaluate(() => {
    for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el);
        if (cs.position !== 'fixed') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 90 && r.height < 90 && r.right > innerWidth - 120 && r.bottom > innerHeight - 120) {
            el.style.display = 'none';
        }
    }
    document.querySelectorAll('[data-sonner-toaster], [role="status"]').forEach((el) => (el.style.display = 'none'));
});

for (const shot of SHOTS) {
    await page.setViewportSize(shot.viewport ?? VIEWPORT);
    await page.goto(BASE + shot.path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    if (shot.prepare) {
        await shot.prepare(page);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1200);
    }
    await page.mouse.move(1, (shot.viewport ?? VIEWPORT).height - 2);
    await tidy();
    await page.screenshot({ path: `${OUT}/${shot.name}.png` });
    console.log('zrzut', shot.name);
}

await browser.close();
