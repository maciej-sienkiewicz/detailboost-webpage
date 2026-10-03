// Scena 2: klient przyjeżdża - przyjęcie pojazdu na tablecie w recepcji.
// Widać: kalendarz → rezerwacja → „ROZPOCZNIJ", przyjęcie z rezerwacji (klient i auto
// już wpisane), przebieg, depozyt i uwagi do protokołu; zdjęcia robione telefonem po
// zeskanowaniu kodu QR, które wpadają na tablet jedno po drugim; mapę uszkodzeń na
// schemacie 911; dokumenty wysłane na tablet i podpisane przez klienta (protokół
// przyjęcia i zgody marketingowe); na koniec cała wizyta, sekcja po sekcji.
//
// Recepcja pracuje na tablecie poziomo (1180 × 820, ramka tabletu). Do podpisu tablet
// trafia do klienta pionowo. Osobna aplikacja „DetailBoost Tablet" (kiosk do podpisu)
// nie jest częścią repozytoriów CRM - dokumenty wysłane na sparowany tablet podpisujemy
// na stronie podpisu klienta (te same dokumenty, ta sama treść), otwartej na tablecie.
import { BASE, beat, click, drawSignature, moveTo, panelOf, release, showCursorAt, type, wait, waitForLogo } from './lib.mjs';
import { sql, q } from './db.mjs';
import { enableFullPlan, enableSmsAutomation } from './seed.mjs';

const PHOTOS = ['p911white', 'gt3', 'p911dark', 'wheel'].map((f) => `capture/fixtures/${f}.jpg`);
const EVENT = 'Full detail Porsche 911';

const smoothTo = async (page, locator, block = 'center', ms = 1100) => {
    release();
    await locator.evaluate((el, block) => el.scrollIntoView({ behavior: 'smooth', block }), block);
    await wait(page, ms);
};

async function signOnTablet(tablet, rec, id, token, first) {
    rec.pause(0.3);
    await tablet.goto(`${BASE}/sign/${token}`, { waitUntil: 'networkidle' });
    await tablet.locator('canvas').first().waitFor({ timeout: 30000 });
    await wait(tablet, 2200);
    await showCursorAt(tablet, 600, 700);
    if (first) await rec.switchTo(tablet, 0.3, { device: 'tablet-portrait' });
    else rec.resume();
    await wait(tablet, 500);
    await beat(tablet, rec, id, tablet.getByText('Dokument', { exact: true }).first().locator('xpath=ancestor::*[2]'));
    await wait(tablet, 2200);
    const pad = tablet.getByLabel('Pole podpisu');
    await smoothTo(tablet, pad, 'center', 1400);
    await click(tablet, tablet.locator('input[type=checkbox]').first(), { ms: 800, settle: 500 });
    await drawSignature(tablet, await pad.boundingBox());
    await wait(tablet, 500);
    await click(tablet, tablet.getByRole('button', { name: 'Podpisz dokument' }), { ms: 700, settle: 100 });
    rec.pause(0.2);
    await tablet.getByText(/Dziękujemy, dokument został podpisany/).waitFor({ timeout: 20000 });
    await wait(tablet, 300);
    rec.resume();
    await wait(tablet, 1600);
}

export default {
    viewport: { width: 1180, height: 820, dpr: 1.5 },
    device: 'tablet',
    posterAt: 4,
    speed: 1.5,
    async prepare({ page, studioId, ctx }) {
        this.studioId = studioId;
        enableFullPlan(studioId);
        await enableSmsAutomation(page, BASE, studioId);
        // Tablet sparowany z CRM (Ustawienia → Tablety do podpisu) - tą samą drogą co
        // ekran ustawień: kod parowania, a potem parowanie z urządzenia.
        const code = (await (await page.request.post(`${BASE}/api/v1/tablets/pairing-codes`, { data: {} })).json()).code;
        const pair = await page.request.post(`${BASE}/api/tablet/pair`, { data: { pairingCode: code, deviceName: 'Recepcja' } });
        if (!pair.ok()) throw new Error(`pair: ${pair.status()} ${await pair.text()}`);
        // Na tablecie menu zwinięte do ikon - treść dostaje całą szerokość.
        await page.evaluate(() => localStorage.setItem('sidebar-collapsed', 'true'));
        const res = await page.request.get(`${BASE}/api/v1/appointments?status=CREATED&search=Porsche&limit=50`);
        const appt = (await res.json()).appointments.find((a) => a.appointmentTitle === EVENT);
        if (!appt) throw new Error(`Brak rezerwacji „${EVENT}"`);
        this.apptId = appt.id;
        // Dzień rezerwacji z bazy: dane demo układają się względem dnia nagrania, więc
        // data na sztywno („2026-10-04") przestaje działać już następnego dnia.
        this.day = sql(`select to_char(start_date_time at time zone 'Europe/Warsaw', 'YYYY-MM-DD') from appointments where id=${q(appt.id)}`);
        // Rozgrzewka formularza przyjęcia (leniwa paczka), poza nagraniem.
        await page.goto(`${BASE}/reservations/${appt.id}/checkin`, { waitUntil: 'networkidle' });
        await page.getByText('Przyjęcie pojazdu do studia').first().waitFor({ timeout: 30000 });
        await page.goto(`${BASE}/calendar`, { waitUntil: 'networkidle' });
        await page.locator(`.fc-daygrid-day[data-date="${this.day}"] .fc-daygrid-event`, { hasText: EVENT }).first().waitFor({ timeout: 30000 });
        await wait(page, 1500);
        // Telefon pracownika do zdjęć - przygotowany wcześniej, otwierany po QR.
        this.phone = await ctx.newPage();
        await this.phone.setViewportSize({ width: 390, height: 844 });
        this.phone.__device = 'phone';
        await showCursorAt(page, 700, 520);
    },
    async play({ page, ctx, rec }) {
        await wait(page, 600);
        const event = page.locator(`.fc-daygrid-day[data-date="${this.day}"] .fc-daygrid-event`, { hasText: EVENT }).first();
        await beat(page, rec, 'calendar', page.locator(`.fc-daygrid-day[data-date="${this.day}"]`).first());
        await moveTo(page, event, 1000);
        await wait(page, 1200);
        await click(page, event, { ms: 300, settle: 900, end: true });
        const start = page.getByRole('button', { name: 'ROZPOCZNIJ' });
        await start.waitFor({ timeout: 15000 });
        await beat(page, rec, 'popover', await panelOf(start, { minW: 300, minH: 260 }));
        await wait(page, 2000);
        const token = page.waitForResponse((r) => r.url().includes('/upload-token'), { timeout: 60000 }).catch(() => null);
        await click(page, start, { ms: 800, settle: 0, end: true });
        // Formularz przyjęcia ładuje się chwilę („Ładowanie…") - cięcie na gotowy ekran.
        rec.pause(0.2);
        await page.getByText('Przyjęcie pojazdu do studia').first().waitFor({ timeout: 30000 });
        await page.getByText('Dane klienta', { exact: true }).first().waitFor({ timeout: 30000 });
        await wait(page, 1200);
        rec.resume();
        await wait(page, 300);

        await beat(page, rec, 'reservation', page.getByText('Dane klienta', { exact: true }).first().locator('xpath=ancestor::*[3]'));
        await moveTo(page, page.getByText('Dane klienta', { exact: true }).first(), 900, { dx: 200 });
        await wait(page, 2600);

        const mileage = page.getByPlaceholder('np. 45230');
        await smoothTo(page, mileage);
        await beat(page, rec, 'vehicle', page.getByText('Dane pojazdu', { exact: true }).first().locator('xpath=ancestor::*[3]'));
        await click(page, mileage, { ms: 800, settle: 200 });
        await type(page, '12480', 110);
        await wait(page, 1200);

        const doc = page.getByText('Dowód rejestracyjny', { exact: true }).first();
        await smoothTo(page, doc);
        await beat(page, rec, 'deposit', page.getByText('Depozyt', { exact: true }).first().locator('xpath=ancestor::*[3]'));
        await click(page, doc.locator('xpath=..').locator('label').first(), { ms: 800, settle: 1400 });

        const notes = page.getByPlaceholder('Treść widoczna na protokole przyjęcia pojazdu');
        await smoothTo(page, notes);
        await beat(page, rec, 'notes', notes.locator('xpath=ancestor::*[2]'));
        await click(page, notes, { ms: 800, settle: 200 });
        await type(page, 'Odprysk lakieru na masce, rysa na lewych drzwiach.', 45);
        await wait(page, 1200);
        await click(page, page.getByRole('button', { name: 'Dalej' }), { ms: 800, settle: 1000 });

        // Zdjęcia telefonem: kod QR na tablecie, telefon pracownika robi zdjęcia,
        // a tablet dostaje je na żywo (WebSocket), jedno po drugim.
        const qr = page.getByText('Zeskanuj, aby przesłać zdjęcia telefonem').first();
        await qr.waitFor({ timeout: 20000 });
        await smoothTo(page, qr);
        await beat(page, rec, 'qr', qr.locator('xpath=ancestor::*[3]'));
        await moveTo(page, qr.locator('xpath=ancestor::*[3]').locator('svg').first(), 900);
        await wait(page, 2600);
        const t = await (await token)?.json().then((j) => j.token).catch(() => null);
        if (!t) throw new Error('Brak tokenu zdjęć z QR');

        const phone = this.phone;
        rec.pause(0.3);
        await phone.goto(`${BASE}/m/upload?t=${t}`, { waitUntil: 'networkidle' });
        await phone.getByText('Zrób zdjęcie').first().waitFor({ timeout: 30000 });
        await wait(phone, 1200);
        await showCursorAt(phone, 200, 600);
        await rec.switchTo(phone, 0.3, { device: 'phone' });
        await wait(phone, 600);
        await beat(phone, rec, 'phone', phone.getByText('Zrób zdjęcie').first().locator('xpath=ancestor::*[3]'));
        // Stuknięcie „Zrób zdjęcie" (wskaźnik + fala), a zdjęcie trafia do tego samego
        // pola aparatu, które otwiera przycisk - Chrome bez okna nie ma aparatu.
        const shoot = async (file) => {
            const btn = phone.getByText('Zrób zdjęcie').first();
            await moveTo(phone, btn, 700);
            await phone.evaluate(() => window.__cursor.press());
            await wait(phone, 150);
            await phone.evaluate(() => window.__cursor.release());
            await phone.locator('#camera-input-mobile').setInputFiles([file]);
        };
        await shoot(PHOTOS[0]);
        await phone.getByText(/Wysłane/).first().waitFor({ timeout: 30000 });
        await wait(phone, 1600);
        await shoot(PHOTOS[1]);
        await phone.getByText(/Wysłane/).nth(1).waitFor({ timeout: 30000 });
        await wait(phone, 1400);

        // Z powrotem na tablet: dwa zdjęcia już są, kolejne dwa wpadają na oczach.
        const grid = page.getByText('Zdjęcia z telefonu').first();
        await grid.waitFor({ timeout: 30000 });
        await rec.switchTo(page, 0.3, { device: 'tablet' });
        await smoothTo(page, grid, 'center', 900);
        await beat(page, rec, 'photos', grid.locator('xpath=ancestor::*[2]'));
        await wait(page, 1200);
        for (const file of PHOTOS.slice(2)) {
            await phone.locator('#camera-input-mobile').setInputFiles([file]);
            await wait(page, 2200);
        }
        await wait(page, 1500);

        // Mapa uszkodzeń: schemat 911 (nadwozie coupe), kliknięcie = punkt uszkodzenia.
        const expand = page.getByRole('switch', { name: 'Rozwiń' }).first();
        await smoothTo(page, expand);
        await click(page, expand.locator('xpath=ancestor::label[1]'), { ms: 800, settle: 700 });
        await moveTo(page, page.locator('#vehicle-body-type'), 700);
        await page.locator('#vehicle-body-type').selectOption('coupe');
        await wait(page, 800);
        const img = page.getByAltText(/Schemat pojazdu/);
        await smoothTo(page, img, 'start');
        const box = await img.boundingBox();
        await beat(page, rec, 'damage', img, 4);
        for (const [fx, fy] of [[0.81, 0.16], [0.53, 0.84], [0.85, 0.57]]) {
            const x = box.x + fx * box.width;
            const y = box.y + fy * box.height;
            await page.evaluate(([x, y]) => window.__cursor.move(x, y, 750), [x, y]);
            await page.mouse.move(x, y);
            await wait(page, 200);
            await page.evaluate(() => window.__cursor.press());
            await page.mouse.click(x, y);
            await page.evaluate(() => window.__cursor.release());
            await wait(page, 900);
        }
        const descs = page.getByPlaceholder(/Opis uszkodzenia/);
        await smoothTo(page, descs.first(), 'center');
        await beat(page, rec, 'damage-notes', descs.first().locator('xpath=ancestor::*[3]'));
        for (const [i, text] of ['Odprysk na masce', 'Rysa na lewych drzwiach', 'Otarcie tylnego zderzaka'].entries()) {
            await click(page, descs.nth(i), { ms: 600, settle: 100 });
            await type(page, text, 40);
        }
        await wait(page, 1000);

        await click(page, page.getByRole('button', { name: /Utwórz wizytę/ }), { ms: 800, settle: 200 });
        await page.getByText('Dokumentacja i Podpisy').first().waitFor({ timeout: 30000 });
        const toTablet = page.getByRole('button', { name: /Wyślij wszystkie na tablet/ });
        await toTablet.waitFor({ timeout: 30000 });
        await wait(page, 1000);
        await beat(page, rec, 'documents', page.getByText('Dokumentacja i Podpisy').first().locator('xpath=ancestor::*[3]'));
        await moveTo(page, page.getByText('Zgody marketingowe').first(), 900);
        await wait(page, 2200);
        await click(page, toTablet, { ms: 800, settle: 1500 });

        // Tablet w rękach klienta. Prośby poszły na sparowany tablet; jego aplikacji
        // nie ma w repozytoriach, więc te same prośby otwieramy na stronie podpisu
        // (kanał SMS_LINK z tokenem) - podpis i jego skutek w CRM są prawdziwe.
        rec.pause(0.3);
        const ids = sql(`select id from signature_requests where studio_id=${q(this.studioId)} and channel='TABLET'
            and status in ('PENDING_DISPLAY','DISPLAYED') order by created_at`).split('\n').filter(Boolean);
        if (ids.length < 2) throw new Error(`Prośby na tablet: ${ids.length}`);
        const tokens = ids.map((id, i) => {
            const tok = `tablet${i}${id.replace(/-/g, '')}`;
            // Prośba z tabletu jest przypięta do urządzenia (tablet_id) - strona podpisu
            // przyjmuje tylko prośby bez przypięcia.
            sql(`update signature_requests set channel='SMS_LINK', link_token=${q(tok)}, tablet_id=null where id=${q(id)}`);
            return tok;
        });
        const tablet = await ctx.newPage();
        await tablet.setViewportSize({ width: 820, height: 1180 });
        tablet.__device = 'tablet-portrait';
        await signOnTablet(tablet, rec, 'sign-protocol', tokens[0], true);
        await signOnTablet(tablet, rec, 'sign-consent', tokens[1], false);

        // W recepcji: oba dokumenty podpisane (WebSocket), wizyta startuje.
        await wait(page, 1500);
        await rec.switchTo(page, 0.3, { device: 'tablet' });
        await wait(page, 500);
        await beat(page, rec, 'signed', page.getByText('Dokumentacja i Podpisy').first().locator('xpath=ancestor::*[3]'));
        await wait(page, 2400);
        await click(page, page.getByRole('button', { name: /Zatwierdź i rozpocznij wizytę/ }), { ms: 900, settle: 200 });
        rec.pause(0.2);
        await page.waitForURL(/\/visits\//, { timeout: 30000 });
        await waitForLogo(page).catch(() => {});
        await wait(page, 1500);
        await page.evaluate(() => window.__cursor.show(innerWidth * 0.6, innerHeight * 0.5));
        rec.resume();

        // Wizyta, sekcja po sekcji.
        await beat(page, rec, 'visit', page.getByText(EVENT).first().locator('xpath=ancestor::*[4]'));
        await moveTo(page, page.getByText(EVENT).first(), 900);
        await wait(page, 3000);
        const tour = [
            ['visit-services', page.locator('#visit-services').first()],
            ['visit-intake', page.getByText('Przyjęcie pojazdu', { exact: true }).first().locator('xpath=ancestor::*[3]')],
            ['visit-photos', page.locator('#visit-docs').first()],
        ];
        for (const [id, loc] of tour) {
            if (!(await loc.count())) continue;
            await smoothTo(page, loc, 'start', 1400);
            await beat(page, rec, id, loc);
            await moveTo(page, loc, 900, { dy: -40 });
            await wait(page, 3200);
        }
        await wait(page, 1500);
    },
};
