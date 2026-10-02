// Scena 2: wydanie auta z fakturą VAT, która idzie do KSeF.
// Widać: „Oznacz jako gotowe" z powiadomieniem klienta, wydanie pojazdu, wybór
// faktury z włączonym „Wyślij fakturę do KSeF", a po cięciu - fakturę w Finansach
// ze statusem „W KSeF", numerem KSeF i kodem QR do weryfikacji.
import { BASE, click, moveTo, showCursorAt, wait } from './lib.mjs';
import {
    enableFullPlan, enableSmsAutomation, markInvoiceAccepted, markKsefSynced, setupInvoicing, visitIdByTitle,
} from './seed.mjs';

const VISIT = 'Korekta lakieru Mercedes S-Klasa';

export default {
    posterAt: 9.5,
    speed: 1.3,
    async prepare({ page, studioId }) {
        enableFullPlan(studioId);
        await enableSmsAutomation(page, BASE, studioId);
        await setupInvoicing(page, BASE);
        markKsefSynced(studioId);
        const id = visitIdByTitle(studioId, VISIT);
        if (!id) throw new Error(`Brak wizyty „${VISIT}"`);
        // Rozgrzewka Finansów (leniwa paczka + podgląd faktury) poza nagraniem.
        await page.goto(`${BASE}/finance`, { waitUntil: 'networkidle' });
        await wait(page, 800);
        await page.goto(`${BASE}/visits/${id}`, { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: /oznacz jako gotowe/i }).first().waitFor({ timeout: 30000 });
        await wait(page, 1200);
        await showCursorAt(page, 900, 560);
    },
    async play({ page, studioId, rec }) {
        await wait(page, 500);
        await click(page, page.getByRole('button', { name: /oznacz jako gotowe/i }).first(), { ms: 800, settle: 900 });
        await click(page, page.getByRole('dialog').getByRole('button', { name: /oznacz jako gotowe/i }).last(), { ms: 800, settle: 1200 });
        await click(page, page.getByRole('button', { name: /Wydaj pojazd/ }).first(), { ms: 800, settle: 1100 });
        await click(page, page.getByRole('button', { name: /Przejdź do płatności/ }).first(), { ms: 800, settle: 900 });
        await click(page, page.getByRole('button', { name: /^Karta$/ }).first(), { ms: 700, settle: 400 });
        await click(page, page.getByRole('button', { name: /Faktura VAT/ }).first(), { ms: 600, settle: 900 });
        await moveTo(page, page.getByText('Wyślij fakturę do KSeF').first(), 700);
        await wait(page, 900);
        const go = page.getByRole('dialog').getByRole('button', { name: /Wydaj pojazd/ }).last();
        await click(page, go, { ms: 700, settle: 350 });

        // Cięcie: zaślepka KSeF odkłada fakturę do kolejki offline24. Ten stan nie
        // trafia do filmu - przyjęcie przez KSeF wpisujemy w bazie (patrz seed.mjs).
        rec.pause(0.2);
        await page.getByText(/Pojazd wydany/).first().waitFor({ timeout: 30000 });
        markInvoiceAccepted(studioId);
        await page.goto(`${BASE}/finance`, { waitUntil: 'networkidle' });
        const row = page.getByText(/FV\/2026\//).first();
        await row.waitFor({ timeout: 30000 });
        await wait(page, 900);
        await page.evaluate(() => window.__cursor.show(innerWidth * 0.62, innerHeight * 0.7));
        rec.resume();

        await wait(page, 700);
        await moveTo(page, row, 800);
        await wait(page, 600);
        await click(page, row, { ms: 300, settle: 1400 });
        await page.getByText('Podgląd faktury').first().waitFor({ timeout: 15000 });
        // Wskaźnik na plakietkę „W KSeF", nie na numer - numer ma zostać czytelny.
        await moveTo(page, page.getByText('W KSeF', { exact: true }).first(), 900, { dx: 70, dy: 6 });
        await wait(page, 1500);
        // Na dole podglądu: kod QR „Weryfikacja w KSeF" - płynnie, jak kółkiem myszy.
        await page.evaluate(() => {
            const qr = [...document.querySelectorAll('*')].find((el) => el.childElementCount === 0 && /Weryfikacja w KSeF/.test(el.textContent ?? ''));
            qr?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        await wait(page, 2600);
    },
};
