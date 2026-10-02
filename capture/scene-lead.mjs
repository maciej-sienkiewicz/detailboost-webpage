// Scena 1: zapytanie mailowe od stałego klienta → termin w kalendarzu.
// Widać od razu: mail klienta z pytaniem o usługę i termin, usługi podsunięte z cennika,
// naszą odpowiedź z wyceną i zgodę klienta - a potem ustalenie terminu w kalendarzu
// i rezerwację wypełnioną z leada, z SMS-ami potwierdzenia i przypomnienia.
import { BASE, beat, click, moveTo, showCursorAt, type, wait, waitForLogo } from './lib.mjs';
import { enableFullPlan, enableSmsAutomation, seedReturningCustomerLead } from './seed.mjs';

export default {
    posterAt: 2.6,
    speed: 1.4,
    async prepare({ page, studioId }) {
        enableFullPlan(studioId);
        await enableSmsAutomation(page, BASE, studioId);
        seedReturningCustomerLead(studioId);

        // Rozgrzewka poza nagraniem. Okno leada i formularz rezerwacji to osobne,
        // leniwie ładowane paczki - za pierwszym razem ekran jest przez sekundę
        // biały. Otwieramy je raz na INNYM leadzie i w kalendarzu, nic nie zapisując.
        await page.goto(`${BASE}/calendar`, { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: /Rezerwacja/ }).first().click();
        await page.getByPlaceholder('Dodaj tytuł rezerwacji').waitFor();
        await page.getByRole('button', { name: 'Anuluj' }).click();
        await page.goto(`${BASE}/leads`, { waitUntil: 'networkidle' });
        await page.getByText('Tesla Model 3').first().click();
        await page.getByText('Przebieg sprawy').first().waitFor();
        await wait(page, 800);
        await page.keyboard.press('Escape');
        await page.goto(`${BASE}/leads`, { waitUntil: 'networkidle' });
        await page.getByText('Porsche 911 Carrera 4S').first().waitFor({ timeout: 30000 });
        await wait(page, 1200);
        await showCursorAt(page, 1060, 660);
    },
    async play({ page, rec }) {
        await wait(page, 400);
        await beat(page, rec, 'inbox', page.getByText('Porsche 911 Carrera 4S').first().locator('xpath=ancestor::*[self::button or self::a or @role="button"][1]'));
        await click(page, page.getByText('Porsche 911 Carrera 4S').first(), { ms: 800, settle: 100 });
        await page.getByText('Pierwszy kontakt klienta').first().waitFor({ timeout: 15000 });
        await waitForLogo(page);
        const entry = (title) => page.getByText(title, { exact: true }).first().locator('xpath=ancestor::*[.//p or .//div][2]');
        await beat(page, rec, 'question', entry('Pierwszy kontakt klienta'));
        await moveTo(page, page.getByText('Pierwszy kontakt klienta').first(), 800, { dx: 120, dy: 22 });
        await wait(page, 2200);
        await beat(page, rec, 'suggested', page.getByText('Sugerowane usługi').first().locator('xpath=ancestor::*[3]'));
        await moveTo(page, page.getByText('Sugerowane usługi').first(), 800);
        await wait(page, 2000);
        await beat(page, rec, 'reply', entry('Odpisaliśmy'));
        await moveTo(page, page.getByText('Odpisaliśmy', { exact: true }).first(), 800, { dx: 140, dy: 22 });
        await wait(page, 2200);
        await beat(page, rec, 'consent', entry('Klient odpisał'));
        await moveTo(page, page.getByText('Klient odpisał', { exact: true }).first(), 800, { dx: 140, dy: 22 });
        await wait(page, 2200);
        await beat(page, rec, 'history', page.getByText('obrotu').first().locator('xpath=ancestor::*[3]'));
        await moveTo(page, page.getByText('obrotu').first(), 700);
        await wait(page, 1600);
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
        const steps = 14;
        for (let i = 1; i <= steps; i++) {
            const x = a.x + ((b.x + b.width / 2 - a.x) * i) / steps;
            await page.mouse.move(x, a.y);
            await page.evaluate(([x, y]) => window.__cursor.show(x, y), [x, a.y]);
            await wait(page, 35);
        }
        await wait(page, 250);
        await page.mouse.up();
        await page.evaluate(() => window.__cursor.release());
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
