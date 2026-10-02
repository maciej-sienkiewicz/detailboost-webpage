// Scena 3: konkurencja uruchamia kampanię - CRM to zauważa.
// Widać: alert na Tablicy („w Twoim rejonie… nowa kampania"), przejście do reklam
// konkurencji (plakietka „Nowa kampania", kalendarz kampanii), szczegóły kampanii
// z treścią reklamy i tydzień u obserwowanych profili z postem-promocją.
import { BASE, click, moveTo, showCursorAt, wait } from './lib.mjs';
import { enableFullPlan, fixDemoTitles, seedCampaignHistory, seedCompetitorCampaign, seedTasks } from './seed.mjs';

export default {
    posterAt: 7.5,
    speed: 1.3,
    async prepare({ page, studioId, userId }) {
        enableFullPlan(studioId);
        seedCompetitorCampaign(studioId, userId);
        seedCampaignHistory(studioId);
        await seedTasks(page, BASE);
        fixDemoTitles(studioId);
        // Tablica pokazuje JEDNĄ podpowiedź naraz, a pierwsza w kolejce to leady demo
        // czekające na odpowiedź. Odkładamy ją tak, jak zrobiłby to użytkownik („×").
        await page.request.post(`${BASE}/api/v1/dashboard/hints/LEADS_AWAITING/dismiss`);
        // Bez rozgrzewki modułu Instagram: wejście w Reklamy oznacza nowe kampanie jako
        // obejrzane, a wejście w Tydzień tworzy raport tygodnia, którego podpowiedź
        // wyprzedza na Tablicy alert o kampaniach. Białe klatki pierwszego wejścia
        // wycina recorder.
        await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
        await page.getByText(/W Twoim rejonie/).first().waitFor({ timeout: 30000 });
        // Kadr zaczyna się od alertu, jakby użytkownik już przewinął.
        const scrolled = await page.evaluate(() => {
            const hint = [...document.querySelectorAll('*')].find((el) => el.childElementCount === 0 && /W Twoim rejonie/.test(el.textContent ?? ''));
            if (!hint) return 'brak alertu';
            // Przewija ten kontener, który faktycznie przewija treść (to nie musi być okno).
            let el = hint.parentElement;
            while (el && el !== document.body) {
                const oy = getComputedStyle(el).overflowY;
                if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) break;
                el = el.parentElement;
            }
            const box = hint.closest('[class]')?.getBoundingClientRect() ?? hint.getBoundingClientRect();
            const target = el && el !== document.body ? el : document.scrollingElement;
            target.scrollTop += box.top - 28;
            return `${target.tagName}.${target.className} ${target.scrollTop}/${target.scrollHeight - target.clientHeight}`;
        });
        console.log('[instagram] przewinięcie:', scrolled);
        await wait(page, 900);
        await showCursorAt(page, 760, 520);
    },
    async play({ page }) {
        await wait(page, 500);
        await moveTo(page, page.getByText(/W Twoim rejonie/).first(), 900);
        await wait(page, 1300);
        await click(page, page.getByRole('button', { name: /Zobacz, kto/ }).first(), { ms: 800, settle: 200 });
        await page.getByText('Reklamodawcy w okolicy').waitFor({ timeout: 20000 });
        await wait(page, 900);
        await moveTo(page, page.getByText('Nowa kampania', { exact: true }).first(), 900);
        await wait(page, 1300);
        await click(page, page.getByLabel(/shinestudio_waw: Jesienna promocja/).first(), { ms: 900, settle: 1500 });
        await moveTo(page, page.getByText('kont w Polsce').first(), 800);
        await wait(page, 900);
        await click(page, page.getByRole('button', { name: /Pokaż/ }).first(), { ms: 800, settle: 500 });
        await moveTo(page, page.getByText(/Zabezpiecz lakier przed zimą/).first(), 700);
        await wait(page, 1700);
        await page.keyboard.press('Escape');
        await wait(page, 500);
        await click(page, page.getByRole('tab', { name: /Tydzień/ }).or(page.getByText('Tydzień', { exact: true })).first(), { ms: 800, settle: 900 });
        await page.getByText(/shinestudio_waw/).first().waitFor({ timeout: 15000 });
        await moveTo(page, page.getByText(/Uruchomił 1 kampanię/).first(), 900);
        await wait(page, 2600);
    },
};
