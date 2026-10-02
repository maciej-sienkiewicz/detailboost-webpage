// Scena 4: faktura kosztowa przychodzi z KSeF i sama trafia do kategorii.
// (Przed nagraniem strona pokazuje animację: kontrahent wystawia fakturę → KSeF → CRM.)
// Widać: nową fakturę w „Dokumentach kosztowych" po odświeżeniu, koszty bieżącego
// miesiąca jako „Nieprzypisane", reguły dopasowania po NIP dostawcy, przypisanie
// silnikiem reguł („Zastosuj wszystkie reguły teraz") i koszty z 12 miesięcy
// w podziale na kategorie: chemia, paliwo, folie PPF, leasing, media, narzędzia.
import { BASE, beat, click, moveTo, showCursorAt, wait } from './lib.mjs';
import { enableFullPlan, insertNewCostInvoice, markKsefSynced, seedCostData } from './seed.mjs';

const ancestor = (loc, n) => loc.locator(`xpath=ancestor::*[${n}]`);

export default {
    posterAt: 12,
    speed: 1.35,
    async prepare({ page, studioId }) {
        enableFullPlan(studioId);
        markKsefSynced(studioId);
        const { buyer } = await seedCostData(page, BASE, studioId);
        // Rozgrzewka widoku kosztów (leniwa paczka, wykresy) poza nagraniem.
        await page.goto(`${BASE}/statistics/costs`, { waitUntil: 'networkidle' });
        await page.getByText('Struktura kosztów wg kategorii').first().waitFor({ timeout: 30000 });
        await page.goto(`${BASE}/finance?tab=expenses`, { waitUntil: 'networkidle' });
        await page.getByText('Dokumenty kosztowe').first().waitFor({ timeout: 30000 });
        await wait(page, 1200);
        // Faktura „dochodzi" z KSeF teraz - lista pokaże ją po odświeżeniu.
        insertNewCostInvoice(studioId, buyer);
        await showCursorAt(page, 880, 640);
    },
    async play({ page, rec }) {
        await wait(page, 500);
        const refresh = page.getByTitle('Odśwież').first();
        await beat(page, rec, 'refresh', ancestor(refresh, 2));
        await click(page, refresh, { ms: 900, settle: 200 });
        const row = page.getByText('FV/PP/2026/0915').first();
        await row.waitFor({ timeout: 15000 });
        await wait(page, 300);
        await beat(page, rec, 'arrived', page.locator('tr', { has: row }).first());
        await moveTo(page, row, 700, { dx: 160 });
        await wait(page, 2200);

        // Cięcie do Statystyk → Koszta (sam przeskok menu nic nie mówi).
        rec.pause(0.2);
        await page.goto(`${BASE}/statistics/costs`, { waitUntil: 'networkidle' });
        await page.getByText('Struktura kosztów wg kategorii').first().waitFor({ timeout: 30000 });
        await wait(page, 1500);
        await page.evaluate(() => window.__cursor.show(innerWidth * 0.5, innerHeight * 0.6));
        rec.resume();
        await wait(page, 400);
        const donut = ancestor(page.getByText('Struktura kosztów wg kategorii').first(), 1);
        await beat(page, rec, 'unassigned', donut);
        await moveTo(page, donut, 800, { dx: 120 });
        await wait(page, 2000);

        const rulesHeader = page.getByText('Automatyczne przypisywanie faktur wg dostawcy').first();
        await click(page, rulesHeader, { ms: 800, settle: 700 });
        await page.evaluate(() => {
            const el = [...document.querySelectorAll('*')].find((n) => n.childElementCount === 0 && n.textContent === 'Automatyczne przypisywanie faktur wg dostawcy');
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        await wait(page, 1000);
        const apply = page.getByRole('button', { name: 'Zastosuj wszystkie reguły teraz' });
        await beat(page, rec, 'rules', ancestor(apply, 3));
        await moveTo(page, page.getByText('PPF Protect Dystrybucja Sp. z o.o.').first(), 800);
        await wait(page, 2200);
        await click(page, apply, { ms: 800, settle: 200 });
        await page.getByText(/Przypisano \d+/).first().waitFor({ timeout: 15000 });
        await beat(page, rec, 'applied', ancestor(apply, 3));
        await wait(page, 1600);

        await page.evaluate(() => {
            const el = [...document.querySelectorAll('*')].find((n) => n.childElementCount === 0 && n.textContent === 'Pozycje kosztowe');
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        await wait(page, 1000);
        const item = page.getByText('FV/PP/2026/0915').first();
        await beat(page, rec, 'category', ancestor(item, 3));
        await moveTo(page, item, 700, { dx: 380 });
        await wait(page, 2200);

        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        await wait(page, 900);
        await click(page, page.getByRole('button', { name: /Bieżący miesiąc/ }).first(), { ms: 800, settle: 500 });
        await click(page, page.getByText('Ostatnie 12 miesięcy').first(), { ms: 700, settle: 1600 });
        await beat(page, rec, 'year', ancestor(page.getByText('Struktura kosztów wg kategorii').first(), 2));
        await moveTo(page, donut, 800);
        await wait(page, 2400);
        await page.evaluate(() => {
            const el = [...document.querySelectorAll('*')].find((n) => n.childElementCount === 0 && n.textContent === 'Kategorie kosztów');
            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        await wait(page, 1000);
        await beat(page, rec, 'totals', ancestor(page.getByText('Leasing', { exact: true }).first(), 4));
        await moveTo(page, page.getByText('Folie PPF', { exact: true }).first(), 800);
        await wait(page, 2800);
    },
};
