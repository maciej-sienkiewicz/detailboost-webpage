// Scena 1: zapytanie od stałego klienta → rezerwacja.
// Widać: historię klienta (wizyty, obrót, ostatnia wizyta), usługi podsunięte
// z cennika na podstawie treści zapytania, i formularz rezerwacji wypełniony
// sam - klient, jego auto z kartoteki, usługi z cenami - z SMS-em przypominającym.
import { BASE, click, moveTo, showCursorAt, type, wait } from './lib.mjs';
import { enableFullPlan, enableSmsAutomation, seedReturningCustomerLead } from './seed.mjs';

export default {
    posterAt: 4.2,
    speed: 1.35,
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
        await wait(page, 1000);
        await showCursorAt(page, 1060, 660);
    },
    async play({ page }) {
        await wait(page, 500);
        await click(page, page.getByText('Porsche 911 Carrera 4S').first(), { ms: 800, settle: 100 });
        await page.getByText('obrotu').first().waitFor({ timeout: 15000 });
        await wait(page, 500);
        // Historia klienta: wzrok na trzy liczby.
        await moveTo(page, page.getByText('obrotu').first(), 700);
        await wait(page, 1000);
        await click(page, page.getByRole('button', { name: 'Akceptuj' }).first(), { ms: 650, settle: 500 });
        await click(page, page.getByRole('button', { name: 'Akceptuj' }).first(), { ms: 450, settle: 700 });
        await click(page, page.getByRole('button', { name: /Stwórz rezerwację/ }).first(), { ms: 700, settle: 700 });
        await click(page, page.locator('.fc-daygrid-day[data-date="2026-10-07"]').first(), { ms: 750, settle: 900 });
        await page.getByPlaceholder('Dodaj tytuł rezerwacji').waitFor();
        await wait(page, 600);
        await click(page, page.getByPlaceholder('Dodaj tytuł rezerwacji'), { ms: 600, settle: 100 });
        await type(page, 'Korekta + ceramika Porsche 911', 38);
        await wait(page, 300);
        await click(page, page.getByText('Wyślij SMS z potwierdzeniem rezerwacji').first(), { ms: 700, settle: 250 });
        await click(page, page.getByText('Wyślij SMS przypominający przed wizytą').first(), { ms: 400, settle: 600 });
        await click(page, page.getByRole('button', { name: 'Zapisz wizytę' }), { ms: 700, settle: 100 });
        await page.getByText('Rezerwacja utworzona').first().waitFor({ timeout: 15000 });
        // Wskaźnik schodzi z powiadomienia - ono jest puentą sceny.
        await page.evaluate(() => window.__cursor.move(innerWidth * 0.55, innerHeight * 0.55, 700));
        await wait(page, 3000);
    },
};
