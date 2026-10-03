// Scena 1: zapytanie mailowe od klienta z historią → odpowiedź → rezerwacja.
// Część 1: lead tylko z pierwszym mailem klienta. CRM podsuwa usługi z cennika,
// pokazuje historię klienta i ostrzega o dwóch porzuconych rezerwacjach. Odpowiadamy
// z poczty CRM - prawdziwa wysyłka (lokalny SMTP), która wraca do leada jako „Odpisaliśmy".
// Część 2: klient odpisuje, że się zgadza. Wycena, termin w kalendarzu, rezerwacja
// wypełniona z leada, SMS-y, zapis.
import { BASE, beat, click, moveTo, release, showCursorAt, type, wait, waitForLogo } from './lib.mjs';
import { enableFullPlan, enableSmsAutomation, insertCustomerReply, seedReturningCustomerLead } from './seed.mjs';

const LEAD = 'Porsche 911 Carrera 4S';

async function openLead(page, rec) {
    await page.getByText(LEAD).first().waitFor({ timeout: 30000 });
    await click(page, page.getByText(LEAD).first(), { ms: 800, settle: 0, end: true });
    // Logo marki w nagłówku leada ładuje się i przycina (canvas) dopiero po otwarciu -
    // przez ok. sekundę stał tam szary pusty kwadrat. Cięcie na gotowy widok.
    rec.pause(0.15);
    await page.getByText('Przebieg sprawy').first().waitFor({ timeout: 15000 });
    // Logo przy NAGŁÓWKU leada (tytuł dużym pismem) - lista pod spodem ma swoje logo,
    // więc samo „jakiś obrazek się wczytał" niczego nie dowodzi.
    await page.waitForFunction((title) => [...document.querySelectorAll('body *')]
        .filter((el) => el.childElementCount === 0 && el.textContent.trim() === title && parseFloat(getComputedStyle(el).fontSize) >= 18)
        .some((el) => {
            for (let n = el.parentElement, i = 0; n && i < 5; n = n.parentElement, i++) {
                const img = n.querySelector('img');
                if (img) return img.complete && img.naturalWidth > 0;
            }
            return false;
        }), LEAD, { timeout: 15000 }).catch(() => console.warn('[lead] logo w nagłówku nie wczytało się'));
    await wait(page, 300);
    rec.resume();
}

export default {
    posterAt: 3,
    speed: 1.5,
    async prepare({ page, studioId }) {
        enableFullPlan(studioId);
        await enableSmsAutomation(page, BASE, studioId);
        this.lead = seedReturningCustomerLead(studioId);

        // Rozgrzewka poza nagraniem: okno leada, poczta i formularz rezerwacji to
        // osobne, leniwie ładowane paczki - za pierwszym razem ekran jest biały.
        await page.goto(`${BASE}/calendar`, { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: /Rezerwacja/ }).first().click();
        await page.getByPlaceholder('Dodaj tytuł rezerwacji').waitFor();
        await page.getByRole('button', { name: 'Anuluj' }).click();
        await page.goto(`${BASE}/communication`, { waitUntil: 'networkidle' });
        await wait(page, 1200);
        await page.goto(`${BASE}/leads`, { waitUntil: 'networkidle' });
        await page.getByText('Tesla Model 3').first().click();
        await page.getByText('Przebieg sprawy').first().waitFor();
        await wait(page, 800);
        await page.keyboard.press('Escape');
        await page.goto(`${BASE}/leads`, { waitUntil: 'networkidle' });
        await page.getByText(LEAD).first().waitFor({ timeout: 30000 });
        await wait(page, 1200);
        await showCursorAt(page, 1060, 660);
    },
    async play({ page, rec }) {
        const entry = (title) => page.getByText(title, { exact: true }).first().locator('xpath=ancestor::*[.//p or .//div][2]');
        await wait(page, 400);
        await beat(page, rec, 'inbox', page.getByText(LEAD).first().locator('xpath=ancestor::*[self::button or self::a or @role="button"][1]'));
        await openLead(page, rec);
        await wait(page, 300);

        await beat(page, rec, 'question', entry('Pierwszy kontakt klienta'));
        await moveTo(page, page.getByText('Pierwszy kontakt klienta').first(), 800, { dx: 120, dy: 22 });
        await wait(page, 2600);
        await beat(page, rec, 'suggested', page.getByText('Sugerowane usługi').first().locator('xpath=ancestor::*[3]'));
        await moveTo(page, page.getByText('Sugerowane usługi').first(), 800);
        await wait(page, 2400);
        const warning = page.getByText('w historii tego kontaktu', { exact: false }).first();
        await beat(page, rec, 'warning', warning.locator('xpath=..'));
        await moveTo(page, warning, 800);
        await wait(page, 2600);
        await beat(page, rec, 'history', page.getByText('obrotu').first().locator('xpath=ancestor::*[3]'));
        await moveTo(page, page.getByText('obrotu').first(), 700);
        await wait(page, 2000);

        // Odpowiedź z poczty CRM.
        await click(page, page.getByRole('button', { name: /Odpisz klientowi/ }), { ms: 800, settle: 300 });
        const editor = page.getByRole('textbox', { name: 'Napisz odpowiedź…' });
        await editor.waitFor({ timeout: 20000 });
        await wait(page, 900);
        await beat(page, rec, 'thread', page.getByText(/odbył u nas/).first().locator('xpath=..'));
        await moveTo(page, page.getByText(/odbył u nas/).first(), 800);
        await wait(page, 1800);
        await click(page, editor, { ms: 700, settle: 100 });
        await beat(page, rec, 'compose', editor.locator('xpath=ancestor::*[3]'));
        const { totalPln } = this.lead;
        await type(page, `Dzień dobry Panie Piotrze, 14–15 października mamy wolne stanowisko. Korekta lakieru 2-etapowa i powłoka ceramiczna IGL Eclipse to łącznie ${totalPln} zł brutto. Auto przyjmujemy 14.10 o 9:00. Czy potwierdza Pan termin?`, 22);
        await wait(page, 600);
        await click(page, page.getByRole('button', { name: 'Wyślij', exact: true }), { ms: 700, settle: 100 });
        await page.getByText('Wysłano', { exact: true }).first().waitFor({ timeout: 20000 });
        await beat(page, rec, 'sent', page.getByText('Wysłano', { exact: true }).first().locator('xpath=ancestor::*[2]'));
        await wait(page, 1800);

        await click(page, page.getByRole('link', { name: /Leady/ }).first(), { ms: 800, settle: 200 });
        await openLead(page, rec);
        await wait(page, 300);
        await beat(page, rec, 'replied', entry('Odpisaliśmy'));
        await moveTo(page, page.getByText('Odpisaliśmy', { exact: true }).first(), 800, { dx: 120, dy: 22 });
        await wait(page, 2400);

        // Część 2: klient odpisał. Cięcie - jego mail przychodzi do skrzynki.
        rec.pause(0.3);
        insertCustomerReply(this.lead);
        await page.keyboard.press('Escape');
        await page.goto(`${BASE}/leads`, { waitUntil: 'networkidle' });
        await page.getByText(LEAD).first().waitFor({ timeout: 30000 });
        await page.getByText(LEAD).first().click();
        await page.getByText('Klient odpisał').first().waitFor({ timeout: 20000 });
        await waitForLogo(page).catch(() => {});
        await wait(page, 600);
        await page.evaluate(() => window.__cursor.show(innerWidth * 0.5, innerHeight * 0.6));
        rec.resume();
        await wait(page, 300);
        await beat(page, rec, 'consent', entry('Klient odpisał'));
        await moveTo(page, page.getByText('Klient odpisał', { exact: true }).first(), 800, { dx: 140, dy: 22 });
        await wait(page, 2600);

        await beat(page, rec, 'accept', page.getByText('Sugerowane usługi').first().locator('xpath=ancestor::*[3]'));
        await click(page, page.getByRole('button', { name: 'Akceptuj' }).first(), { ms: 650, settle: 500 });
        await click(page, page.getByRole('button', { name: 'Akceptuj' }).first(), { ms: 450, settle: 800 });
        await click(page, page.getByRole('button', { name: /Stwórz rezerwację/ }).first(), { ms: 700, settle: 700 });

        // Termin w kalendarzu: przeciągnięcie przez dwa dni = rezerwacja z godzinami
        // (pierwszy dzień od 9:00), dokładnie jak „14–15.10" z maila.
        const d14 = page.locator('.fc-daygrid-day[data-date="2026-10-14"]').first();
        const d15 = page.locator('.fc-daygrid-day[data-date="2026-10-15"]').first();
        await d14.waitFor();
        await wait(page, 500);
        const week = page.locator('.fc-daygrid-day[data-date="2026-10-12"]').first().locator('xpath=ancestor::tr[1]');
        await beat(page, rec, 'calendar', week);
        const a = await moveTo(page, d14, 800, { dy: 10 });
        await page.mouse.down();
        await page.evaluate(() => window.__cursor.press());
        const b = await d15.boundingBox();
        for (let i = 1; i <= 14; i++) {
            const x = a.x + ((b.x + b.width / 2 - a.x) * i) / 14;
            await page.mouse.move(x, a.y);
            await page.evaluate(([x, y]) => window.__cursor.show(x, y), [x, a.y]);
            await wait(page, 35);
        }
        await wait(page, 250);
        await page.mouse.up();
        await page.evaluate(() => window.__cursor.release());
        release();
        await page.getByPlaceholder('Dodaj tytuł rezerwacji').waitFor();
        await wait(page, 900);
        await beat(page, rec, 'form', page.getByPlaceholder('Dodaj tytuł rezerwacji').locator('xpath=ancestor::form[1]'), 4);
        await click(page, page.getByPlaceholder('Dodaj tytuł rezerwacji'), { ms: 600, settle: 100 });
        await type(page, 'Korekta + ceramika Porsche 911', 38);
        await wait(page, 300);
        await beat(page, rec, 'sms', page.getByText('Wyślij SMS z potwierdzeniem rezerwacji').first().locator('xpath=ancestor::*[3]'));
        await click(page, page.getByText('Wyślij SMS z potwierdzeniem rezerwacji').first(), { ms: 700, settle: 250 });
        await click(page, page.getByText('Wyślij SMS przypominający przed wizytą').first(), { ms: 400, settle: 600 });
        await click(page, page.getByRole('button', { name: 'Zapisz wizytę' }), { ms: 700, settle: 100 });
        await page.getByText('Rezerwacja utworzona').first().waitFor({ timeout: 15000 });
        await beat(page, rec, 'done', page.getByText(/Rezerwacja została zaplanowana/).first());
        await page.evaluate(() => window.__cursor.move(innerWidth * 0.55, innerHeight * 0.55, 700));
        await wait(page, 3000);
    },
};
