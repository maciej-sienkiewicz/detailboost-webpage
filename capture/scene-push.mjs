// Scena 7: powiadomienia na telefonie właściciela.
// Nie da się jej nagrać z CRM: powiadomienia pokazuje system telefonu, nie strona.
// Nagrywamy więc animację (capture/anim/push.html) z treściami z szablonów backendu
// i ikonami, które wysyła service worker CRM.
import { beat, wait } from './lib.mjs';

const ANIM = new URL('./anim/push.html', import.meta.url).href;
const KEYS = ['earned', 'no-show', 'campaign', 'report', 'lead', 'checkin'];

export default {
    posterAt: 17,
    speed: 1,
    async prepare({ page }) {
        await page.goto(ANIM);
        await page.evaluate(() => document.fonts.ready);
        await wait(page, 300);
    },
    async play({ page, rec }) {
        await wait(page, 300);
        await page.evaluate(() => window.start());
        const T = await page.evaluate(() => window.TIMELINE);
        let now = 0;
        await beat(page, rec, 'intro');
        for (const [i, t] of T.notes.entries()) {
            await wait(page, t - now + 250);
            now = t + 250;
            // Ramka na powiadomieniu, które właśnie wskoczyło (pierwsze w stosie).
            await beat(page, rec, KEYS[i], page.locator('.note').first(), 6);
        }
        await wait(page, T.notes.at(-1) + 2000 - now);
        now = T.notes.at(-1) + 2000;
        await beat(page, rec, 'control', page.locator('#end'), 16);
        await wait(page, T.end - now);
    },
};
