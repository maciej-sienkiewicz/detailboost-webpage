// Scena 6: Karta Wizyty - strona wizyty, którą klient dostaje SMS-em.
// Studio proponuje usługę dodatkową i wysyła kartę; klient na telefonie widzi postęp
// prac, protokół, zdjęcia i propozycję, wybiera ją, potwierdza SMS-em „TAK", a usługa
// sama trafia do wizyty w studiu.
//
// SMS-y są prawdziwe w treści: lokalnie SMSAPI jest wyłączone (`--smsapi.enabled=false`)
// i backend zapisuje w logu, co by wysłał - stamtąd bierzemy tekst do ekranu wiadomości
// (capture/anim/sms.html). Odpowiedź „TAK" wraca webhookiem SMSAPI, który wołamy sami
// (`SMSAPI_INBOUND_WEBHOOK_SECRET` w środowisku backendu).
import { readFileSync } from 'node:fs';
import { BASE, beat, release, click, moveTo, showCursorAt, type, wait } from './lib.mjs';
import { sql, q } from './db.mjs';
import { enableFullPlan, enableSmsAutomation, seedVisitCardVisit } from './seed.mjs';

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8080';
const BACKEND_LOG = process.env.BACKEND_LOG ?? '/tmp/claude-0/-home-user/412e4c60-1520-5c11-8512-fa8879c145f7/scratchpad/backend.log';
const WEBHOOK_SECRET = process.env.SMSAPI_INBOUND_WEBHOOK_SECRET ?? 'local-recording';
const SMS = new URL('./anim/sms.html', import.meta.url).href;
const UPSELL = 'Impregnacja szyb nano';

const ancestor = (loc, n) => loc.locator(`xpath=ancestor::*[${n}]`);

/** Ostatni SMS, który backend „wysłał" na ten numer (log trybu bez SMSAPI). */
function lastSms(phone, contains) {
    const digits = phone.replace(/\D/g, '').slice(-9);
    const lines = readFileSync(BACKEND_LOG, 'utf8').split('\n')
        .filter((l) => l.includes('[SMS DISABLED]') && l.replace(/\D/g, '').includes(digits) && l.includes(contains));
    const m = lines.at(-1)?.match(/Message: (.*)$/);
    if (m) return m[1].trim();
    // SMS poza oknem wysyłki (wieczorem) czeka w kolejce - treść jest już ustalona.
    const queued = sql(`select body from outbound_message_queue where channel='SMS'
        and regexp_replace(recipient, '\\D', '', 'g') like ${q(`%${digits}`)} and body like ${q(`%${contains}%`)}
        order by created_at desc limit 1`);
    if (!queued) throw new Error(`Brak SMS-a „${contains}" w logu backendu ani w kolejce`);
    return queued;
}

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

/** Karta na telefonie: sekcja po nagłówku (kafel z nagłówkiem i treścią). */
const section = (phone, title) => ancestor(phone.getByText(title, { exact: true }).first(), 1);

async function scrollTo(page, locator, block = 'start') {
    await locator.evaluate((el, block) => el.scrollIntoView({ behavior: 'smooth', block }), block);
    await wait(page, 1000);
}

export default {
    posterAt: 14,
    speed: 1.3,
    async prepare({ page, ctx, studioId }) {
        enableFullPlan(studioId);
        await enableSmsAutomation(page, BASE, studioId);
        // Nazwa studia jest w nagłówku karty klienta - „(DEMO)" by tam raziło.
        sql(`update studios set name='Studio Połysk' where id=${q(studioId)}`);
        sql(`update studio_settings set name='Studio Połysk' where studio_id=${q(studioId)}`);
        const visit = seedVisitCardVisit(studioId);
        // Przyjęcie w poniedziałek rano, odbiór dziś wieczorem.
        sql(`update visits set created_at = timestamptz '2026-09-29 09:10+02', scheduled_date = timestamptz '2026-09-29 09:00+02'
             where id=${q(visit)}`);
        sql(`update visit_photos set uploaded_at = timestamptz '2026-09-29 09:20+02' + (random() * interval '9 minutes') where visit_id=${q(visit)}`);
        sql(`update visit_protocols set created_at = timestamptz '2026-09-29 09:12+02', signed_at = timestamptz '2026-09-29 09:16+02' where visit_id=${q(visit)}`);
        this.visit = visit;
        this.customerPhone = sql(`select c.phone from visits v join customers c on c.id=v.customer_id where v.id=${q(visit)}`);

        this.phone = await ctx.newPage();
        await this.phone.setViewportSize({ width: 390, height: 844 });
        this.phone.__device = 'phone';

        // Okno „Karta Wizyty" składa link z adresu, pod którym działa CRM - lokalnie
        // to localhost. Klient dostaje adres z backendu (visitcard.frontend-base-url,
        // ten sam co w SMS-ie), więc w kadrze stoi właśnie on.
        await page.addInitScript((base) => {
            setInterval(() => {
                for (const el of document.querySelectorAll('input')) {
                    if (el.value.startsWith(base)) el.value = el.value.replace(base, 'https://detailboost.pl');
                }
            }, 50);
        }, BASE);
        await page.goto(`${BASE}/visits/${visit}`, { waitUntil: 'networkidle' });
        await page.getByText('Karta wizyty dla klienta').first().waitFor({ timeout: 20000 });
        await wait(page, 1500);
        await showCursorAt(page, 900, 600);
    },
    async play({ page, rec }) {
        const phone = this.phone;
        await wait(page, 400);
        // Studio: wizyta w realizacji. Karta wizyty i propozycja usługi dodatkowej.
        await beat(page, rec, 'visit', ancestor(page.getByText('W realizacji').first(), 3));
        await wait(page, 1600);
        await click(page, page.getByText('Karta wizyty dla klienta').first(), { ms: 900, settle: 800 });
        const panel = await modal(page, 'Karta Wizyty');
        await beat(page, rec, 'card-modal', panel);
        await moveTo(page, page.getByText('Sugerowane usługi dodatkowe').first(), 700, { dy: 30 });
        await wait(page, 1500);
        await click(page, page.getByPlaceholder('Wpisz nazwę usługi, aby dodać...'), { ms: 700, settle: 200 });
        await type(page, 'Impreg', 90);
        await wait(page, 500);
        await click(page, page.getByText(UPSELL).last(), { ms: 700, settle: 600 });
        const note = page.getByPlaceholder(/Notatka|notatk/i).first();
        if (await note.isVisible().catch(() => false)) {
            await click(page, note, { ms: 600, settle: 150 });
            await type(page, 'Woda spłynie z szyby już przy 60 km/h. Robimy przy okazji korekty.', 28);
        }
        await beat(page, rec, 'upsell', await modal(page, 'Karta Wizyty'));
        await click(page, page.getByRole('button', { name: /^Zapisz sugesti/ }).first(), { ms: 700, settle: 900 });
        await moveTo(page, page.getByText('Widoczna na karcie').first(), 700);
        await wait(page, 1200);
        await click(page, page.getByRole('button', { name: /Wyślij kartę/ }).first(), { ms: 800, settle: 700 });
        const sms = page.getByRole('button', { name: /^SMS/ }).or(page.getByText('SMS', { exact: true })).first();
        if (await sms.isVisible().catch(() => false)) {
            await beat(page, rec, 'send', await modal(page, 'Wyślij Kartę Wizyty'));
            // Wybór kanału od razu wysyła kartę.
            await click(page, sms, { ms: 700, settle: 500 });
        }
        const sent = page.getByText(/wysłana SMS/).first();
        await sent.waitFor({ timeout: 15000 });
        await beat(page, rec, 'sent', ancestor(sent, 1), 8);
        await wait(page, 2000);

        // Telefon klienta: karta wizyty z linku w SMS-ie. Ładowanie strony poza kadrem.
        rec.pause(0.2);
        const linkSms = lastSms(this.customerPhone, '/vc/');
        const token = sql(`select token from visit_card_tokens where visit_id=${q(this.visit)} order by created_at desc limit 1`);
        this.linkSms = linkSms;
        await phone.goto(`${BASE}/vc/${token}`, { waitUntil: 'networkidle' });
        await phone.getByText('Polecane usługi dodatkowe').first().waitFor({ timeout: 20000 });
        await phone.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 }).catch(() => {});
        await wait(phone, 1200);
        await showCursorAt(phone, 300, 600);
        await rec.switchTo(phone, 0.3, { device: 'phone' });
        await wait(phone, 400);
        await beat(phone, rec, 'progress', ancestor(phone.getByText('W realizacji').first(), 2));
        await wait(phone, 2600);

        // Dokumenty i zdjęcia z przyjęcia.
        release();
        await scrollTo(phone, phone.getByText('Protokoły i dokumenty', { exact: false }).first());
        await beat(phone, rec, 'documents', ancestor(phone.getByText('Protokół przyjęcia pojazdu').first(), 3));
        await moveTo(phone, phone.getByText('Pobierz').first(), 700);
        await wait(phone, 1600);
        release();
        await scrollTo(phone, phone.getByText('Dokumentacja zdjęciowa', { exact: false }).first(), 'center');
        await beat(phone, rec, 'photos', ancestor(phone.getByText('Dokumentacja zdjęciowa', { exact: false }).first(), 1));
        await wait(phone, 2200);

        // Propozycja studia i wybór klienta.
        release();
        await scrollTo(phone, phone.getByText('Polecane usługi dodatkowe', { exact: false }).first());
        const offer = section(phone, 'Polecane usługi dodatkowe');
        await beat(phone, rec, 'offer', offer);
        await wait(phone, 1400);
        await click(phone, phone.getByText(UPSELL).first(), { ms: 700, settle: 500 });
        const add = phone.getByRole('button', { name: /^Dodaj wybran/ }).first();
        await click(phone, add, { ms: 700, settle: 300 });
        await phone.getByText(/Wysłaliśmy SMS|Oczekuje na potwierdzenie SMS/).first().waitFor({ timeout: 20000 });
        await wait(phone, 500);
        await beat(phone, rec, 'requested', offer);
        await wait(phone, 2400);

        // SMS z prośbą o „TAK" - treść z backendu.
        const consentSms = lastSms(this.customerPhone, 'TAK');
        const messages = await phone.context().newPage();
        await messages.setViewportSize({ width: 390, height: 844 });
        messages.__device = 'phone';
        const qs = new URLSearchParams({ from: 'Studio Połysk', prev: this.linkSms, msg: consentSms });
        await messages.goto(`${SMS}?${qs}`);
        await messages.evaluate(() => document.fonts.ready);
        await rec.switchTo(messages, 0.3, { device: 'phone' });
        await messages.evaluate(() => window.start());
        const T = await messages.evaluate(() => window.TIMELINE);
        await wait(messages, T.arrive + 500);
        await beat(messages, rec, 'sms', messages.locator('#msg'), 8);
        await wait(messages, T.send - T.arrive - 500);
        await beat(messages, rec, 'yes', messages.locator('#reply'), 8);
        await wait(messages, T.end - T.send - 600);

        // Odpowiedź wraca do CRM (webhook SMSAPI) - usługa trafia do wizyty.
        const res = await page.request.post(`${BACKEND}/api/sms/inbound?secret=${encodeURIComponent(WEBHOOK_SECRET)}`, {
            form: { sms_from: this.customerPhone.replace(/\D/g, ''), sms_text: 'TAK' },
        });
        if (!res.ok()) throw new Error(`inbound SMS: ${res.status()} ${await res.text()}`);
        rec.pause(0.3);

        await phone.reload({ waitUntil: 'networkidle' });
        await phone.getByText('Dodano do wizyty').first().waitFor({ timeout: 20000 });
        await phone.getByText('Polecane usługi dodatkowe', { exact: false }).first().evaluate((el) => el.scrollIntoView({ block: 'start' }));
        await wait(phone, 600);
        await rec.switchTo(phone, 0.3, { device: 'phone' });
        await wait(phone, 300);
        await beat(phone, rec, 'added', section(phone, 'Polecane usługi dodatkowe'));
        await wait(phone, 2200);
        release();
        await scrollTo(phone, phone.getByText('Zakres usług i wycena', { exact: false }).first());
        await beat(phone, rec, 'total', ancestor(phone.getByText('Razem brutto').first(), 4));
        await wait(phone, 2200);

        // Studio: usługa jest w wizycie, bez telefonu do klienta.
        rec.pause(0.2);
        await page.keyboard.press('Escape');
        await page.reload({ waitUntil: 'networkidle' });
        await page.getByText(UPSELL).first().waitFor({ timeout: 20000 });
        await wait(page, 800);
        await rec.switchTo(page, 0.3);
        await wait(page, 300);
        await beat(page, rec, 'studio', ancestor(page.getByText(UPSELL).first(), 4));
        await moveTo(page, page.getByText(UPSELL).first(), 800, { dx: 200 });
        await wait(page, 2800);
    },
};
