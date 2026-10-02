// Scena 4: koszty z KSeF same trafiają do kategorii.
// Kolejność opowieści (prośba biznesu): właściciel zakłada kategorię „Paliwo", potem
// regułę „NIP ORLEN → Paliwo"; cięcie na stację - tankowanie i faktura z terminala
// (capture/anim/fuel.html); powrót do CRM: faktura przychodzi z KSeF do „Dokumentów
// kosztowych", sama dostaje kategorię „Paliwo" i rosną statystyki.
// Cała scena stoi na ostatnich 30 dniach, w których jest kilkanaście faktur od sześciu
// dostawców - ani tabela, ani wykres nie mogą być w żadnym kadrze puste.
import { BASE, beat, release, click, moveTo, showCursorAt, type, wait } from './lib.mjs';
import { enableFullPlan, insertNewFuelInvoice, markKsefSynced, seedCostData } from './seed.mjs';

const ancestor = (loc, n) => loc.locator(`xpath=ancestor::*[${n}]`);
const FUEL_ANIM = new URL('./anim/fuel.html', import.meta.url).href;

async function scrollToText(page, text, block = 'start') {
    await page.evaluate(([t, block]) => {
        const el = [...document.querySelectorAll('*')].find((n) => n.childElementCount === 0 && n.textContent.trim() === t);
        el?.scrollIntoView({ behavior: 'smooth', block });
    }, [text, block]);
    await wait(page, 1000);
}

async function costsLast30(page) {
    await page.goto(`${BASE}/statistics/costs`, { waitUntil: 'networkidle' });
    await page.getByText('Struktura kosztów wg kategorii').first().waitFor({ timeout: 30000 });
    await page.getByRole('button', { name: /Bieżący miesiąc/ }).first().click();
    await page.getByText('Ostatnie 30 dni').first().click();
    await page.waitForLoadState('networkidle');
    await wait(page, 1500);
}

/**
 * Panel okna modalnego (rola `dialog` to całe przyciemnione tło, więc ramka kroku
 * objęłaby cały ekran): najmniejszy przodek tytułu szerszy niż 400 px.
 */
async function modal(page, title) {
    await page.getByText(title, { exact: true }).first().evaluate((el) => {
        document.querySelectorAll('[data-modal-panel]').forEach((n) => n.removeAttribute('data-modal-panel'));
        let n = el;
        while (n.parentElement && n.getBoundingClientRect().width < 400) n = n.parentElement;
        while (n.parentElement && n.getBoundingClientRect().height < 200) n = n.parentElement;
        n.setAttribute('data-modal-panel', '');
    });
    return page.locator('[data-modal-panel]');
}

/**
 * Wiersz kategorii w tabeli „Kategorie kosztów" (kropka, nazwa, suma). Nazwa „Paliwo"
 * stoi też na plakietkach faktur, więc wiersz poznajemy po przełączniku statystyk.
 */
const catRow = (page, name) => page.locator('div', {
    has: page.getByText(name, { exact: true }),
}).filter({ has: page.getByTitle('Nie uwzględniaj w statystykach') }).last();
const catName = (page, name) => catRow(page, name).getByText(name, { exact: true });

export default {
    posterAt: 4,
    speed: 1.3,
    async prepare({ page, ctx, studioId }) {
        enableFullPlan(studioId);
        markKsefSynced(studioId);
        // Bez kategorii „Paliwo" i bez reguły dla ORLEN - założy je właściciel w nagraniu.
        const { buyer } = await seedCostData(page, BASE, studioId, { without: ['paliwo'] });
        this.studioId = studioId;
        this.buyer = buyer;

        // Karta „Dokumenty kosztowe" czeka w tle z zakresem 30 dni; po animacji
        // nagranie przełącza się na nią i odświeża listę.
        const finance = await ctx.newPage();
        await finance.goto(`${BASE}/finance?tab=expenses`, { waitUntil: 'networkidle' });
        await finance.getByText('Dokumenty kosztowe').first().waitFor({ timeout: 30000 });
        await finance.getByTitle('Bieżący miesiąc').first().click();
        await finance.getByRole('button', { name: /^Ostatni miesiąc/ }).first().click();
        await finance.waitForLoadState('networkidle');
        this.finance = finance;

        // Animacja ze stacji: fonty muszą być gotowe, zanim ruszy nagranie.
        const anim = await ctx.newPage();
        await anim.goto(FUEL_ANIM);
        await anim.evaluate(() => document.fonts.ready);
        this.anim = anim;

        await page.bringToFront();
        await costsLast30(page);
        await showCursorAt(page, 900, 620);
    },
    async play({ page, rec }) {
        await wait(page, 500);
        // a) Przegląd: kilka kategorii, kilkanaście dni z kosztami. Paliwo jeszcze bez kategorii.
        await beat(page, rec, 'overview', ancestor(page.getByText('Struktura kosztów wg kategorii').first(), 2));
        await moveTo(page, page.getByText('Struktura kosztów wg kategorii').first(), 900, { dx: 60, dy: 120 });
        await wait(page, 2600);

        // a) Nowa kategoria - zakłada ją właściciel.
        release();
        await scrollToText(page, 'Podział według kategorii');
        await click(page, page.getByRole('button', { name: /Nowa kategoria/ }).first(), { ms: 900, settle: 500 });
        const dialog = page.getByRole('dialog').first();
        await beat(page, rec, 'new-category', await modal(page, 'Nowa kategoria kosztów'));
        await click(page, dialog.getByPlaceholder('np. Rolki folii PPF'), { ms: 600, settle: 150 });
        await type(page, 'Paliwo', 80);
        await click(page, dialog.getByPlaceholder('Krótki opis tej kategorii wydatków...'), { ms: 600, settle: 150 });
        await type(page, 'Auto serwisowe i odbiór aut od klientów', 38);
        // Pomarańczowy kolor z palety (próbki nie mają podpisów - poznajemy je po tle).
        await dialog.evaluate((d) => [...d.querySelectorAll('button')]
            .find((b) => getComputedStyle(b).backgroundColor === 'rgb(249, 115, 22)')?.setAttribute('data-swatch', 'orange'));
        await click(page, dialog.locator('[data-swatch=orange]'), { ms: 600, settle: 400 });
        await click(page, dialog.getByRole('button', { name: 'Zapisz' }), { ms: 700, settle: 900 });
        await beat(page, rec, 'category-added', catRow(page, 'Paliwo'), 8);
        await moveTo(page, catName(page, 'Paliwo'), 700, { dx: 80 });
        await wait(page, 1800);

        // b) Reguła: wszystko z NIP-u ORLEN to paliwo, także faktury, które już są.
        release();
        await scrollToText(page, 'Reguły automatyczne');
        await click(page, page.getByText('Automatyczne przypisywanie faktur wg dostawcy').first(), { ms: 800, settle: 600 });
        await click(page, page.getByRole('button', { name: /Dodaj regułę/ }).first(), { ms: 800, settle: 500 });
        const ruleDlg = page.getByRole('dialog').first();
        await beat(page, rec, 'new-rule', await modal(page, 'Nowa reguła automatycznego przypisywania'));
        await click(page, ruleDlg.getByPlaceholder('np. 5270103391'), { ms: 600, settle: 150 });
        await type(page, '774', 110);
        await wait(page, 500);
        // Podpowiedź z NIP-ów sprzedawców, od których są już faktury.
        await click(page, ruleDlg.getByText('ORLEN S.A.').first(), { ms: 700, settle: 400 });
        await click(page, ruleDlg.getByRole('button', { name: 'Paliwo', exact: true }), { ms: 700, settle: 500 });
        await moveTo(page, ruleDlg.getByText('Zastosuj teraz do już istniejących faktur od tego dostawcy'), 700);
        await wait(page, 900);
        await click(page, ruleDlg.getByRole('button', { name: 'Dodaj regułę' }), { ms: 700, settle: 300 });
        await page.getByText(/Przypisano \d+/).first().waitFor({ timeout: 15000 });
        await wait(page, 300);
        await beat(page, rec, 'rule-added', await modal(page, 'Reguła dodana'));
        await wait(page, 2000);
        await click(page, page.getByRole('dialog').getByRole('button', { name: 'Zamknij', exact: true }).last(), { ms: 700, settle: 700 });
        await beat(page, rec, 'rule-row', ancestor(page.getByText('7740001454').first(), 1), 8);
        await wait(page, 1600);

        // Kategoria już coś znaczy: suma paliwa z ostatnich 30 dni.
        release();
        await scrollToText(page, 'Podział według kategorii');
        await beat(page, rec, 'fuel-before', catRow(page, 'Paliwo'), 8);
        await moveTo(page, catName(page, 'Paliwo'), 700, { dx: 120 });
        await wait(page, 2200);

        // c) Cięcie na stację paliw.
        const anim = this.anim;
        await rec.switchTo(anim, 0.3);
        await anim.evaluate(() => window.start());
        const T = await anim.evaluate(() => window.TIMELINE);
        await beat(anim, rec, 'station');
        await wait(anim, T.print + 3600 - T.story);
        await beat(anim, rec, 'receipt', anim.locator('#receipt'));
        await wait(anim, T.ksef - (T.print + 3600));
        await beat(anim, rec, 'ksef', anim.locator('#ksef'), 14);
        await wait(anim, T.end - T.ksef);

        // d) Synchronizacja KSeF zapisuje fakturę i od razu stosuje reguły dostawców
        //    (FetchKsefInvoicesHandler → applyRulesForInvoices); lokalnie robimy to samo.
        insertNewFuelInvoice(this.studioId, this.buyer);
        const res = await page.request.post(`${BASE}/api/v1/cost-categories/auto-rules/apply`, { data: {} });
        if (!res.ok()) throw new Error(`apply rules: ${res.status()}`);

        const finance = this.finance;
        await showCursorAt(finance, 900, 640);
        await rec.switchTo(finance, 0.3);
        await wait(finance, 500);
        const refresh = finance.getByTitle('Odśwież').first();
        await beat(finance, rec, 'refresh', ancestor(refresh, 2));
        await click(finance, refresh, { ms: 900, settle: 200 });
        const row = finance.getByText('F/4412/26/183577').first();
        await row.waitFor({ timeout: 15000 });
        await wait(finance, 300);
        await beat(finance, rec, 'arrived', finance.locator('tr', { has: row }).first());
        await moveTo(finance, row, 700, { dx: 160 });
        await wait(finance, 2600);

        // Statystyki: faktura już w „Paliwie", suma i wykres urosły.
        rec.pause(0.2);
        await page.bringToFront();
        await page.evaluate(() => window.scrollTo(0, 0));
        await costsLast30(page);
        await scrollToText(page, 'Podział według kategorii');
        await showCursorAt(page, 900, 500);
        await rec.switchTo(page, 0.2);
        await wait(page, 500);
        const item = page.getByText('F/4412/26/183577').first();
        await beat(page, rec, 'auto-category', ancestor(item, 2), 8);
        await moveTo(page, item, 800, { dx: 330 });
        await wait(page, 2400);
        await beat(page, rec, 'fuel-after', catRow(page, 'Paliwo'), 8);
        await moveTo(page, catName(page, 'Paliwo'), 700, { dx: 120 });
        await wait(page, 2200);

        release();
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
        await wait(page, 1100);
        await beat(page, rec, 'stats', ancestor(page.getByText('Struktura kosztów wg kategorii').first(), 2));
        await moveTo(page, page.getByText('Struktura kosztów wg kategorii').first(), 900, { dx: 80, dy: 120 });
        await wait(page, 3000);
    },
};
