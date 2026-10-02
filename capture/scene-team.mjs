// Scena 5: zespół studia.
// Nowy pracownik z kontem i rolą, zatwierdzenie karty czasu pracy za wrzesień, lista
// obecności za wrzesień (PDF) i urlop zaznaczony prosto w kalendarzu.
// Zespół (3 osoby, role, godziny za sierpień i wrzesień, lista za sierpień) zakłada
// seedTeam prawdziwym API - nagranie zaczyna się w studiu, które już działa.
import { BASE, beat, release, click, moveTo, showCursorAt, type, wait } from './lib.mjs';
import { enableFullPlan, seedTeam } from './seed.mjs';

const ancestor = (loc, n) => loc.locator(`xpath=ancestor::*[${n}]`);

/** Panel okna modalnego (rola `dialog` bywa całym przyciemnionym tłem). */
async function modal(page, title) {
    // Najpierw w otwartym oknie: ten sam tekst (np. nazwisko) stoi zwykle też na liście pod nim.
    const inDialog = page.getByRole('dialog').getByText(title, { exact: true });
    const target = (await inDialog.count()) ? inDialog.last() : page.getByText(title, { exact: true }).first();
    await target.evaluate((el) => {
        document.querySelectorAll('[data-modal-panel]').forEach((n) => n.removeAttribute('data-modal-panel'));
        let n = el;
        while (n.parentElement && n.getBoundingClientRect().width < 400) n = n.parentElement;
        while (n.parentElement && n.getBoundingClientRect().height < 200) n = n.parentElement;
        n.setAttribute('data-modal-panel', '');
    });
    return page.locator('[data-modal-panel]');
}

async function tab(page, name) {
    await click(page, page.getByRole('link', { name: new RegExp(`^${name}`) }).or(page.getByRole('tab', { name: new RegExp(`^${name}`) })).first(), { ms: 800, settle: 300 });
    await page.waitForLoadState('networkidle');
    await wait(page, 500);
}

export default {
    posterAt: 6,
    speed: 1.3,
    async prepare({ page, studioId }) {
        enableFullPlan(studioId);
        await seedTeam(page, BASE, studioId);
        // Rozgrzewka widoków poza nagraniem (leniwe paczki, PDF).
        for (const path of ['/calendar', '/employees/attendance-sheets', '/employees/worktime', '/employees']) {
            await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
            await wait(page, 800);
        }
        await page.getByText('Marek Zając').first().waitFor({ timeout: 20000 });
        await showCursorAt(page, 760, 520);
    },
    async play({ page, rec }) {
        await wait(page, 400);
        // a) Zespół i nowe konto.
        await beat(page, rec, 'team', ancestor(page.getByText('Marek Zając').first(), 4));
        await wait(page, 1800);
        await click(page, page.getByRole('button', { name: 'Dodaj pracownika' }).first(), { ms: 900, settle: 600 });
        const form = await modal(page, 'Nowy pracownik');
        await beat(page, rec, 'new-employee', form);
        await click(page, page.locator('#employee-first-name'), { ms: 600, settle: 100 });
        await type(page, 'Kacper', 70);
        await click(page, page.locator('#employee-last-name'), { ms: 500, settle: 100 });
        await type(page, 'Lewandowski', 60);
        await click(page, page.locator('#employee-phone'), { ms: 500, settle: 100 });
        await type(page, '+48 600 410 642', 40);
        await click(page, page.locator('#employee-email'), { ms: 500, settle: 100 });
        await type(page, 'kacper.lewandowski@studio-polysk.pl', 30);
        await click(page, page.getByRole('checkbox', { name: /Utwórz konto użytkownika/ }), { ms: 700, settle: 500 });

        // b) Rola: decyduje o uprawnieniach i o tym, czy liczy się czas pracy.
        await click(page, page.getByText('Wybierz rolę...').first(), { ms: 700, settle: 500 });
        const option = page.getByRole('option', { name: /^Detailer/ }).first();
        await beat(page, rec, 'role', await modal(page, 'Nowy pracownik'));
        await moveTo(page, option, 700);
        await wait(page, 900);
        await click(page, option, { ms: 300, settle: 600 });
        await click(page, page.getByRole('dialog').getByRole('button', { name: 'Dodaj pracownika' }).last(), { ms: 800, settle: 300, end: true });
        await page.getByText('Pracownik dodany').first().waitFor({ timeout: 20000 });
        await wait(page, 600);
        const row = page.getByText('Kacper Lewandowski').first();
        await beat(page, rec, 'added', ancestor(row, 2), 8);
        await moveTo(page, row, 700, { dx: 420 });
        await wait(page, 2200);

        // c) Czas pracy: karta Marka czeka na zatwierdzenie.
        release();
        await tab(page, 'Czas pracy');
        await beat(page, rec, 'worktime', ancestor(page.getByText('Marek Zając').first(), 3));
        await moveTo(page, page.getByText('Do zatwierdzenia').last(), 800);
        await wait(page, 1800);
        await click(page, page.getByText('Marek Zając').first(), { ms: 700, settle: 900, end: true });
        const approve = page.getByRole('button', { name: 'Zatwierdź kartę' });
        await approve.waitFor({ timeout: 15000 });
        await beat(page, rec, 'card', await modal(page, 'Marek Zając'));
        await wait(page, 2400);
        await click(page, approve, { ms: 800, settle: 300, end: true });
        await page.getByText('Karta zatwierdzona').first().waitFor({ timeout: 15000 });
        await page.keyboard.press('Escape').catch(() => {});
        await wait(page, 900);
        await beat(page, rec, 'approved', ancestor(page.getByText('Marek Zając').first(), 3));
        await moveTo(page, page.getByText('Marek Zając').first(), 700, { dx: 560 });
        await wait(page, 1800);

        // d) Lista obecności za wrzesień.
        release();
        await tab(page, 'Listy obecności');
        await click(page, page.getByRole('button', { name: 'Wygeneruj listę' }).first(), { ms: 800, settle: 600 });
        await page.locator('#attendance-month').selectOption({ label: 'Wrzesień' }).catch(() => page.locator('#attendance-month').selectOption({ label: 'wrzesień' }));
        await page.locator('#attendance-year').selectOption('2026');
        await beat(page, rec, 'sheet-new', await modal(page, 'Wygeneruj listę obecności'));
        await moveTo(page, page.getByText('Kto trafi na listę').first(), 700, { dy: 60 });
        await wait(page, 1800);
        await click(page, page.getByRole('dialog').getByRole('button', { name: /^Wygeneruj listę/ }).last(), { ms: 800, settle: 300, end: true });
        await page.getByText('Lista obecności wygenerowana').first().waitFor({ timeout: 30000 });
        await wait(page, 800);
        await click(page, page.getByRole('button', { name: 'Podgląd' }).first(), { ms: 800, settle: 300 });
        await page.locator('canvas, iframe, embed, object').first().waitFor({ timeout: 30000 });
        await wait(page, 1500);
        await beat(page, rec, 'sheet', await modal(page, 'Pobierz PDF'));
        await wait(page, 3200);
        release();
        await page.keyboard.press('Escape');
        await wait(page, 500);

        // e) Urlop prosto z kalendarza.
        release();
        rec.pause(0.2);
        await page.goto(`${BASE}/calendar`, { waitUntil: 'networkidle' });
        await page.locator('.fc-daygrid-day[data-date="2026-10-19"]').waitFor({ timeout: 20000 });
        await wait(page, 800);
        await showCursorAt(page, 1100, 300);
        rec.resume();
        await wait(page, 300);
        await click(page, page.getByRole('button', { name: /^Wydarzenie/ }).first(), { ms: 800, settle: 500 });
        await click(page, page.locator('text="Urlop" >> visible=true').first(), { ms: 700, settle: 600 });
        await beat(page, rec, 'leave', await modal(page, 'Urlop pracownika'));
        await page.locator('#leave-employee').selectOption({ label: 'Paweł Kamiński' });
        await moveTo(page, page.locator('#leave-employee'), 600);
        await wait(page, 700);
        await moveTo(page, page.locator('#leave-type'), 600);
        await wait(page, 900);
        await click(page, page.getByRole('button', { name: 'Dalej: zaznacz dni' }), { ms: 700, settle: 700, end: true });
        const from = page.locator('.fc-daygrid-day[data-date="2026-10-19"]');
        const to = page.locator('.fc-daygrid-day[data-date="2026-10-23"]');
        const a = await from.boundingBox();
        const b = await to.boundingBox();
        await beat(page, rec, 'leave-days', ancestor(from, 1));
        await moveTo(page, from, 700);
        await page.mouse.down();
        await page.evaluate(() => window.__cursor.press());
        for (let k = 1; k <= 24; k++) {
            const x = a.x + a.width / 2 + ((b.x - a.x) * k) / 24;
            const y = a.y + a.height / 2;
            await page.mouse.move(x, y);
            await page.evaluate(([x, y]) => window.__cursor.show(x, y), [x, y]);
            await wait(page, 35);
        }
        await page.mouse.up();
        await page.evaluate(() => window.__cursor.release());
        release();
        await wait(page, 900);
        const confirm = page.getByRole('button', { name: 'Zapisz urlop' });
        if (!(await confirm.isVisible().catch(() => false))) await click(page, page.getByRole('button', { name: 'Zakończ' }).first(), { ms: 700, settle: 600 });
        await confirm.waitFor({ timeout: 15000 });
        await beat(page, rec, 'leave-confirm', await modal(page, 'Potwierdź urlop'));
        await click(page, page.locator('#leave-note'), { ms: 600, settle: 100 });
        await type(page, 'Wyjazd rodzinny, zgłoszony we wrześniu', 35);
        await click(page, confirm, { ms: 700, settle: 300, end: true });
        await page.getByText('Urlop zapisany').first().waitFor({ timeout: 15000 });
        await wait(page, 900);
        await beat(page, rec, 'leave-saved', ancestor(page.locator('.fc-daygrid-day[data-date="2026-10-19"]'), 1));
        await moveTo(page, page.locator('.fc-daygrid-day[data-date="2026-10-21"]'), 800);
        await wait(page, 2600);
    },
};
