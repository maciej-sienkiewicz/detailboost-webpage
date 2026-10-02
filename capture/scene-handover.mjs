// Scena 2: wydanie auta z podpisem protokołu na telefonie klienta i fakturą do KSeF.
// Widać: „Pojazd gotowy" z SMS-em do klienta, protokół wydania wysłany do podpisu,
// stronę podpisu na telefonie klienta (dokument, oświadczenie, podpis palcem), powrót
// do wydania z potwierdzeniem podpisu, fakturę VAT z „Wyślij fakturę do KSeF",
// a po cięciu - fakturę w Finansach ze statusem „W KSeF" i kodem QR.
import { BASE, beat, click, drawSignature, moveTo, showCursorAt, wait, waitForLogo } from './lib.mjs';
import { sql, q } from './db.mjs';
import {
    enableFullPlan, enableSmsAutomation, markInvoiceAccepted, markKsefSynced, setupInvoicing, visitIdByTitle,
} from './seed.mjs';

const VISIT = 'Korekta lakieru Mercedes S-Klasa';

export default {
    posterAt: 9.2,
    speed: 1.6,
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
        await waitForLogo(page);
        await showCursorAt(page, 900, 560);
    },
    async play({ page, ctx, studioId, rec }) {
        await wait(page, 500);
        await beat(page, rec, 'ready', page.getByRole('button', { name: /oznacz jako gotowe/i }).first().locator('xpath=ancestor::header[1] | ancestor::*[4]').first());
        await click(page, page.getByRole('button', { name: /oznacz jako gotowe/i }).first(), { ms: 800, settle: 900 });
        await beat(page, rec, 'notify', page.getByRole('dialog').first());
        await moveTo(page, page.getByRole('dialog').getByText('SMS', { exact: true }).first(), 700);
        await wait(page, 900);
        await click(page, page.getByRole('dialog').getByRole('button', { name: /oznacz jako gotowe/i }).last(), { ms: 700, settle: 1200 });
        await click(page, page.getByRole('button', { name: /Wydaj pojazd/ }).first(), { ms: 800, settle: 600 });
        const send = page.getByRole('button', { name: 'Wyślij prośbę na telefon klienta' });
        await send.waitFor({ timeout: 20000 });
        await wait(page, 500);
        await beat(page, rec, 'protocol', page.getByRole('dialog').first());
        await click(page, send, { ms: 800, settle: 700 });
        await click(page, page.getByRole('button', { name: /Tak, stan zgodny/ }), { ms: 700, settle: 400 });
        await click(page, page.getByRole('button', { name: 'Zapisz i wyślij do podpisu' }), { ms: 600, settle: 250 });

        // Cięcie na telefon klienta: strona z linku SMS. Uzupełnienie PDF i podgląd
        // (pdf.js) trwają kilka sekund - czekamy na nie poza nagraniem.
        rec.pause(0.25);
        await page.getByText(/SMS z linkiem do podpisu został wysłany/).first().waitFor({ timeout: 30000 });
        const token = sql(`select link_token from signature_requests where studio_id=${q(studioId)} order by created_at desc limit 1`);
        const phone = await ctx.newPage();
        await phone.setViewportSize({ width: 390, height: 844 });
        await phone.goto(`${BASE}/sign/${token}`, { waitUntil: 'networkidle' });
        await phone.locator('canvas').first().waitFor({ timeout: 30000 });
        await wait(phone, 2500);
        await showCursorAt(phone, 300, 520);
        await rec.switchTo(phone, 0.25, { phone: true });
        await wait(phone, 400);
        await beat(phone, rec, 'document', phone.getByText('Dokument', { exact: true }).first().locator('xpath=ancestor::*[2]'));
        await wait(phone, 1300);
        const pad = phone.getByLabel('Pole podpisu');
        await phone.evaluate(() => {
            const el = document.querySelector('[aria-label="Pole podpisu"]');
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        await wait(phone, 1100);
        await beat(phone, rec, 'sign', phone.getByText('Oświadczenie i podpis').first().locator('xpath=ancestor::*[2]'));
        await click(phone, phone.locator('input[type=checkbox]').first(), { ms: 700, settle: 400 });
        await drawSignature(phone, await pad.boundingBox());
        await wait(phone, 300);
        await click(phone, phone.getByRole('button', { name: 'Podpisz dokument' }), { ms: 700, settle: 150 });
        // Złożenie podpisanego PDF trwa - w filmie cięcie prosto na podziękowanie.
        rec.pause(0.2);
        await phone.getByText(/Dziękujemy, dokument został podpisany/).waitFor({ timeout: 20000 });
        await wait(phone, 300);
        rec.resume();
        await wait(phone, 200);
        await beat(phone, rec, 'signed', phone.getByText(/Dziękujemy, dokument został podpisany/).first().locator('xpath=ancestor::*[2]'));
        await wait(phone, 1500);

        // Z powrotem w studiu: wydanie widzi podpis (WebSocket) i przechodzi dalej.
        await page.getByRole('button', { name: /^Przejdź do płatności/ }).first().waitFor({ timeout: 20000 });
        await rec.switchTo(page, 0.25);
        await wait(page, 400);
        await beat(page, rec, 'back', page.getByRole('dialog').first());
        await wait(page, 1100);
        await click(page, page.getByRole('button', { name: /Przejdź do płatności/ }).first(), { ms: 800, settle: 800 });
        await click(page, page.getByRole('button', { name: /^Karta$/ }).first(), { ms: 700, settle: 300 });
        await click(page, page.getByRole('button', { name: /Faktura VAT/ }).first(), { ms: 600, settle: 800 });
        await beat(page, rec, 'invoice', page.getByText('Wyślij fakturę do KSeF').first().locator('xpath=ancestor::*[3]'));
        await moveTo(page, page.getByText('Wyślij fakturę do KSeF').first(), 700);
        await wait(page, 1500);
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
        await wait(page, 500);
        await click(page, row, { ms: 800, settle: 1400 });
        await page.getByText('Podgląd faktury').first().waitFor({ timeout: 15000 });
        await beat(page, rec, 'ksef', page.getByText(/^KSeF: /).first().locator('xpath=ancestor::*[2]'));
        await moveTo(page, page.getByText('W KSeF', { exact: true }).first(), 900, { dx: 70, dy: 6 });
        await wait(page, 1600);
        await page.evaluate(() => {
            const qr = [...document.querySelectorAll('*')].find((el) => el.childElementCount === 0 && /Weryfikacja w KSeF/.test(el.textContent ?? ''));
            qr?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        await wait(page, 900);
        await beat(page, rec, 'qr', page.getByText('Weryfikacja w KSeF', { exact: true }).first().locator('xpath=ancestor::*[2]'));
        await wait(page, 2200);
    },
};
