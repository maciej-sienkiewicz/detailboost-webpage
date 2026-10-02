// Scena 2: przyjęcie pojazdu na tablecie w recepcji.
// Widać: przyjęcie z rezerwacji (klient i auto już wpisane), przebieg i depozyt,
// uwagi do protokołu, zdjęcia auta, mapę uszkodzeń na schemacie 911, a potem podpis
// klienta na tablecie - pod protokołem przyjęcia i pod zgodami marketingowymi.
//
// Całe nagranie jest w oknie tabletu (1180 × 820, poziomo) i trafia do filmu w ramce
// tabletu (capture/device.mjs). Osobna aplikacja „DetailBoost Tablet" (kiosk do
// podpisu) nie jest częścią repozytoriów CRM - podpis pokazujemy na stronie podpisu
// klienta, tej samej treści dokumentów, otwartej na tablecie.
import { BASE, beat, click, drawSignature, moveTo, release, showCursorAt, type, wait, waitForLogo } from './lib.mjs';
import { sql, q } from './db.mjs';
import { enableFullPlan, enableSmsAutomation } from './seed.mjs';

const PHOTOS = ['p911white', 'gt3', 'p911dark', 'wheel'].map((f) => `capture/fixtures/${f}.jpg`);

const smoothTo = async (page, locator, block = 'center') => {
    release();
    await locator.evaluate((el, block) => el.scrollIntoView({ behavior: 'smooth', block }), block);
    await wait(page, 900);
};

async function signOnTablet(tablet, rec, id, token) {
    rec.pause(0.25);
    await tablet.goto(`${BASE}/sign/${token}`, { waitUntil: 'networkidle' });
    await tablet.locator('canvas').first().waitFor({ timeout: 30000 });
    await wait(tablet, 2200);
    await showCursorAt(tablet, 900, 420);
    rec.resume();
    await wait(tablet, 300);
    await beat(tablet, rec, id, tablet.getByText('Dokument', { exact: true }).first().locator('xpath=ancestor::*[2]'));
    await wait(tablet, 1500);
    const pad = tablet.getByLabel('Pole podpisu');
    await smoothTo(tablet, pad);
    await click(tablet, tablet.locator('input[type=checkbox]').first(), { ms: 700, settle: 300 });
    await drawSignature(tablet, await pad.boundingBox());
    await wait(tablet, 250);
    await click(tablet, tablet.getByRole('button', { name: 'Podpisz dokument' }), { ms: 600, settle: 100 });
    rec.pause(0.2);
    await tablet.getByText(/Dziękujemy, dokument został podpisany/).waitFor({ timeout: 20000 });
    await wait(tablet, 300);
    rec.resume();
    await wait(tablet, 1100);
}

export default {
    viewport: { width: 1180, height: 820, dpr: 1.5 },
    device: 'tablet',
    posterAt: 10,
    speed: 1.9,
    async prepare({ page, studioId }) {
        enableFullPlan(studioId);
        await enableSmsAutomation(page, BASE, studioId);
        // Na tablecie menu zwinięte do ikon - treść dostaje całą szerokość.
        await page.evaluate(() => localStorage.setItem('sidebar-collapsed', 'true'));
        const res = await page.request.get(`${BASE}/api/v1/appointments?status=CREATED&search=Porsche&limit=50`);
        const appt = (await res.json()).appointments.find((a) => a.appointmentTitle === 'Full detail Porsche 911');
        if (!appt) throw new Error('Brak rezerwacji „Full detail Porsche 911"');
        this.studioId = studioId;
        await page.goto(`${BASE}/reservations/${appt.id}/checkin`, { waitUntil: 'networkidle' });
        await page.getByText('Przyjęcie pojazdu do studia').first().waitFor({ timeout: 30000 });
        await wait(page, 1500);
        await showCursorAt(page, 760, 470);
    },
    async play({ page, ctx, rec }) {
        await wait(page, 400);
        await beat(page, rec, 'reservation', page.getByText('Dane klienta', { exact: true }).first().locator('xpath=ancestor::*[3]'));
        await moveTo(page, page.getByText('Dane klienta', { exact: true }).first(), 800, { dx: 200 });
        await wait(page, 1800);

        const mileage = page.getByPlaceholder('np. 45230');
        await smoothTo(page, mileage);
        await beat(page, rec, 'vehicle', page.getByText('Dane pojazdu', { exact: true }).first().locator('xpath=ancestor::*[3]'));
        await click(page, mileage, { ms: 700, settle: 100 });
        await type(page, '12480', 70);
        await wait(page, 500);

        const doc = page.getByText('Dowód rejestracyjny', { exact: true }).first();
        await smoothTo(page, doc);
        await beat(page, rec, 'deposit', page.getByText('Depozyt', { exact: true }).first().locator('xpath=ancestor::*[3]'));
        await click(page, doc.locator('xpath=..').locator('label').first(), { ms: 700, settle: 600 });

        const notes = page.getByPlaceholder('Treść widoczna na protokole przyjęcia pojazdu');
        await smoothTo(page, notes);
        await beat(page, rec, 'notes', notes.locator('xpath=ancestor::*[2]'));
        await click(page, notes, { ms: 700, settle: 100 });
        await type(page, 'Odprysk lakieru na masce, rysa na lewych drzwiach.', 32);
        await wait(page, 500);
        await click(page, page.getByRole('button', { name: 'Dalej' }), { ms: 700, settle: 900 });

        // Zdjęcia: „Wybierz z dysku" otwiera wybór plików - na tablecie aparat albo galeria.
        await page.getByText('Prześlij zdjęcia pojazdu').first().waitFor({ timeout: 15000 });
        await beat(page, rec, 'photos', page.getByText('Prześlij zdjęcia pojazdu').first().locator('xpath=ancestor::*[3]'));
        const chooser = page.waitForEvent('filechooser');
        await click(page, page.getByRole('button', { name: 'Wybierz z dysku' }).first(), { ms: 800, settle: 0 });
        await (await chooser).setFiles(PHOTOS);
        await page.getByText('Przesłane zdjęcia').first().waitFor({ timeout: 30000 });
        await page.waitForFunction(() => [...document.images].filter((i) => i.complete && i.naturalWidth > 0 && i.width > 60).length >= 4, null, { timeout: 30000 });
        const grid = page.getByText('Przesłane zdjęcia').first();
        await smoothTo(page, grid, 'start');
        await beat(page, rec, 'uploaded', grid.locator('xpath=ancestor::*[2]'));
        await wait(page, 1800);

        // Mapa uszkodzeń: schemat 911 (nadwozie coupe), kliknięcie = punkt uszkodzenia.
        const expand = page.getByRole('switch', { name: 'Rozwiń' }).first();
        await smoothTo(page, expand);
        await click(page, expand.locator('xpath=ancestor::label[1]'), { ms: 700, settle: 500 });
        await moveTo(page, page.locator('#vehicle-body-type'), 600);
        await page.locator('#vehicle-body-type').selectOption('coupe');
        await wait(page, 600);
        const img = page.getByAltText(/Schemat pojazdu/);
        await smoothTo(page, img, 'start');
        const box = await img.boundingBox();
        await beat(page, rec, 'damage', img, 4);
        for (const [fx, fy] of [[0.81, 0.16], [0.53, 0.84], [0.85, 0.57]]) {
            const x = box.x + fx * box.width;
            const y = box.y + fy * box.height;
            await page.evaluate(([x, y]) => window.__cursor.move(x, y, 650), [x, y]);
            await page.mouse.move(x, y);
            await wait(page, 150);
            await page.evaluate(() => window.__cursor.press());
            await page.mouse.click(x, y);
            await page.evaluate(() => window.__cursor.release());
            await wait(page, 500);
        }
        const descs = page.getByPlaceholder(/Opis uszkodzenia/);
        await smoothTo(page, descs.first(), 'center');
        await beat(page, rec, 'damage-notes', descs.first().locator('xpath=ancestor::*[3]'));
        for (const [i, text] of ['Odprysk na masce', 'Rysa na lewych drzwiach', 'Otarcie tylnego zderzaka'].entries()) {
            await click(page, descs.nth(i), { ms: 500, settle: 50 });
            await type(page, text, 30);
        }
        await wait(page, 500);

        await click(page, page.getByRole('button', { name: /Utwórz wizytę/ }), { ms: 700, settle: 200 });
        await page.getByText('Dokumentacja i Podpisy').first().waitFor({ timeout: 30000 });
        const send = page.getByRole('button', { name: 'Wyślij prośbę na telefon klienta' });
        await send.nth(1).waitFor({ timeout: 30000 });
        await wait(page, 700);
        await beat(page, rec, 'documents', page.getByText('Dokumentacja i Podpisy').first().locator('xpath=ancestor::*[3]'));
        await moveTo(page, page.getByText('Zgody marketingowe').first(), 800);
        await wait(page, 1600);
        await click(page, send.nth(0), { ms: 700, settle: 600 });
        await click(page, send.nth(1), { ms: 600, settle: 800 });

        // Tablet w rękach klienta: protokół przyjęcia, potem zgody marketingowe.
        rec.pause(0.25);
        const tokens = sql(`select link_token from signature_requests where studio_id=${q(this.studioId)}
            and channel='SMS_LINK' order by created_at`).split('\n').filter(Boolean);
        if (tokens.length < 2) throw new Error(`Tokeny podpisu: ${tokens.length}`);
        const tablet = await ctx.newPage();
        await tablet.setViewportSize({ width: 1180, height: 820 });
        tablet.__device = 'tablet';
        await tablet.goto(`${BASE}/sign/${tokens[0]}`, { waitUntil: 'networkidle' });
        await tablet.locator('canvas').first().waitFor({ timeout: 30000 });
        await rec.switchTo(tablet, 0.25, { device: 'tablet' });
        rec.pause(0.25);
        await signOnTablet(tablet, rec, 'sign-protocol', tokens[0]);
        await signOnTablet(tablet, rec, 'sign-consent', tokens[1]);

        // W studiu: oba dokumenty podpisane (WebSocket), wizyta startuje.
        await page.getByText(/Klient pomyślnie podpisał dokument/).first().waitFor({ timeout: 20000 }).catch(() => {});
        await wait(page, 1200);
        await rec.switchTo(page, 0.25, { device: 'tablet' });
        await wait(page, 400);
        await beat(page, rec, 'signed', page.getByText('Dokumentacja i Podpisy').first().locator('xpath=ancestor::*[3]'));
        await wait(page, 1600);
        await click(page, page.getByRole('button', { name: /Zatwierdź i rozpocznij wizytę/ }), { ms: 800, settle: 200 });
        rec.pause(0.2);
        await page.waitForURL(/\/visits\//, { timeout: 30000 });
        await waitForLogo(page).catch(() => {});
        await wait(page, 800);
        rec.resume();
        await beat(page, rec, 'visit', page.getByText('Full detail Porsche 911').first().locator('xpath=ancestor::*[3]'));
        await wait(page, 2600);
    },
};
