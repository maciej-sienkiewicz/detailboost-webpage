// Scena 7: powiadomienia na telefonie właściciela.
// Nie da się jej nagrać z CRM: powiadomienia pokazuje system telefonu, nie strona.
// Nagrywamy więc animację (capture/anim/push.html) z treściami z szablonów backendu
// i ikonami, które wysyła service worker CRM.
import { beat, release, wait } from './lib.mjs';

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
        const t0 = Date.now();
        // Czas od startu animacji liczony zegarem, nie sumą odczekań - pomiar ramki
        // (beat czeka, aż powiadomienie przestanie się ruszać) też zajmuje chwilę.
        const until = (ms) => wait(page, Math.max(0, ms - (Date.now() - t0)));
        const T = await page.evaluate(() => window.TIMELINE);
        await beat(page, rec, 'intro');
        for (const [i, t] of T.notes.entries()) {
            await until(t + 150);
            // Ramka na powiadomieniu, które właśnie wskoczyło (pierwsze w stosie)...
            await beat(page, rec, KEYS[i], page.locator('.note').first(), 6);
            // ...i gaśnie tuż przed następnym: nowe powiadomienie przesuwa stos w dół,
            // a ramka zostałaby w miejscu, na cudzej treści.
            const next = T.notes[i + 1] ?? T.notes.at(-1) + 2000;
            await until(next - 120);
            release();
        }
        await until(T.notes.at(-1) + 2000);
        await beat(page, rec, 'control', page.locator('#end'), 16);
        await until(T.end);
    },
};
