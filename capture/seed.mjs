// capture/seed.mjs
// Dosiewki do nagrań. Każda funkcja dotyczy JEDNEGO, świeżo założonego konta demo
// (POST /api/v1/demo zakłada osobne studio, kasowane po 2 h) i niczego poza nim.
import { execFileSync } from 'node:child_process';
import { sql, rows, q } from './db.mjs';

/**
 * Zapytanie od stałego klienta (Piotr Wiśniewski: 3 wizyty, 2 auta w danych demo).
 *
 * Sugestie usług w produkcji dobiera model językowy z treści maila, wybierając
 * POZYCJE CENNIKA (LeadServiceSuggestionService). Lokalnie modelu nie ma, więc
 * wpisujemy dokładnie to, co ta usługa zapisałaby dla tego maila: dwie pozycje
 * z cennika, z ceną z cennika i cytatem z treści jako uzasadnieniem.
 * Sekcja „Klient" (wizyty, obrót, ostatnia wizyta) NIE jest dosiewana - liczy ją
 * backend z prawdziwych wizyt klienta.
 */
export function seedReturningCustomerLead(studio) {
    const [[customerId, email, first, last]] = rows(
        `select id, email, first_name, last_name from customers where studio_id=${q(studio)} and first_name='Piotr' and last_name='Wiśniewski'`,
    );
    const [[userId, userName]] = rows(
        `select id, first_name || ' ' || last_name from users where studio_id=${q(studio)} limit 1`,
    );
    const leadId = sql('select gen_random_uuid()');
    const message =
        'Dzień dobry, po zimie chciałbym odświeżyć 911-kę: korekta lakieru i nowa powłoka ceramiczna. ' +
        'Czy znajdzie się termin w przyszłym tygodniu? Pozdrawiam, Piotr Wiśniewski';
    sql(`insert into leads (id, contact_identifier, created_at, customer_id, customer_name, estimated_value,
            initial_message, requires_verification, source, status, studio_id, updated_at, vehicle_brand,
            vehicle_model, vehicle_detection_status)
         values (${q(leadId)}, ${q(email)}, now() - interval '25 minutes', ${q(customerId)}, ${q(`${first} ${last}`)}, 0,
            ${q(message)}, false, 'EMAIL', 'NEW', ${q(studio)}, now() - interval '25 minutes', 'Porsche',
            '911 Carrera 4S', 'DONE')`);
    const services = [
        ['Korekta lakieru 2-etapowa', 'korekta lakieru'],
        ['Powłoka ceramiczna IGL Eclipse', 'nowa powłoka ceramiczna'],
    ];
    let total = 0;
    for (const [name, quote] of services) {
        const [[serviceId, net, gross, vat]] = rows(
            `select id, base_price_net, base_price_gross, vat_rate from services where studio_id=${q(studio)} and name=${q(name)}`,
        );
        total += Number(gross);
        sql(`insert into lead_service_items (id, created_at, evidence_quote, lead_id, name, price_gross, price_net,
                price_source, quantity, service_id, source, status, studio_id, vat_rate)
             values (gen_random_uuid(), now(), ${q(quote)}, ${q(leadId)}, ${q(name)}, ${gross}, ${net},
                'CATALOG', 1, ${q(serviceId)}, 'AI', 'SUGGESTED', ${q(studio)}, ${vat})`);
    }
    sql(`update leads set estimated_value=${total} where id=${q(leadId)}`);
    // Jedno zdarzenie w „Przebiegu sprawy" - bez niego lewa kolumna okna jest pusta.
    // Wątku mailowego lokalnie nie odtworzymy (wymaga podłączonej skrzynki IMAP).
    sql(`insert into lead_callbacks (id, called_by, called_by_name, created_at, lead_id, note, studio_id)
         values (gen_random_uuid(), ${q(userId)}, ${q(userName)}, now() - interval '20 minutes', ${q(leadId)},
            'Oddzwoniłem. Chce korektę i nową powłokę na 911, termin w przyszłym tygodniu.', ${q(studio)})`);
    return { leadId, customerId };
}

/**
 * Konto demo dostaje plan BASIC z kilkoma dodatkami - bez powiadomień SMS, przez co
 * formularz rezerwacji pokazuje kłódkę „Twój abonament nie obsługuje powiadomień SMS".
 * Strona sprzedaje pełny produkt, więc nagrywamy na planie FULL. Uprawnienia są
 * w Redisie (studio-entitlements::{id}, TTL 5 min) - bez skasowania klucza zmiana
 * planu dotarłaby do interfejsu dopiero po kilku minutach.
 */
export function enableFullPlan(studio) {
    // Studio demo nie ma wiersza planu wcale (backend schodzi wtedy do BASIC).
    sql(`delete from studio_subscription_plans where studio_id=${q(studio)}`);
    sql(`insert into studio_subscription_plans (id, activated_at, created_at, studio_id, plan_id)
         select gen_random_uuid(), now(), now(), ${q(studio)}, id from subscription_plans where plan_key='FULL'`);
    const keys = execFileSync('redis-cli', ['--scan', '--pattern', `*entitlements*${studio}*`], { encoding: 'utf8' })
        .split('\n').filter(Boolean);
    if (keys.length) execFileSync('redis-cli', ['DEL', ...keys]);
}

/**
 * Reguły SMS włączone tak, jak włączyłby je właściciel w Ustawieniach → SMS:
 * potwierdzenie rezerwacji, przypomnienie 24 h przed wizytą i „pojazd gotowy".
 * Fabrycznie każda reguła jest wyłączona, a formularz rezerwacji pokazuje wtedy
 * „Wyłączone globalnie w konfiguracji SMS". Przez API, nie SQL - ta sama ścieżka
 * co ekran ustawień, z jego walidacją.
 */
export async function enableSmsAutomation(page, base, studio) {
    // Pakiet kredytów, jak po zakupie w Ustawieniach → SMS. Bez niego okno „Pojazd
    // gotowy do odbioru" ostrzega „SMS nie wyjdzie. Kredyty SMS: 0 szt.".
    sql(`delete from sms_credit_balances where studio_id=${q(studio)}`);
    sql(`insert into sms_credit_balances (id, available_credits, created_at, studio_id, total_purchased, total_used, updated_at, version)
         values (gen_random_uuid(), 500, now(), ${q(studio)}, 500, 0, now(), 0)`);
    const url = `${base}/api/v1/sms-campaigns/automation`;
    const config = await (await page.request.get(url)).json();
    config.bookingConfirmation.enabled = true;
    config.preVisit.enabled = true;
    config.preVisit.offsetMinutes = 24 * 60;
    config.visitReadyForPickup.enabled = true;
    const res = await page.request.put(url, { data: config });
    if (!res.ok()) throw new Error(`PUT automation: ${res.status()} ${await res.text()}`);
}

/**
 * Dane firmy i token KSeF - to, co właściciel wpisuje raz w Ustawieniach.
 * Bez nich przełącznik „Wyślij fakturę do KSeF" jest wyłączony, a wydanie pojazdu
 * prosi o uzupełnienie danych firmy. Przez API, tą samą ścieżką co ekran ustawień.
 */
export async function setupInvoicing(page, base) {
    const nip = '5213870274';
    const company = await page.request.put(`${base}/api/v1/company`, {
        data: {
            name: 'Studio Połysk Sp. z o.o.', taxId: nip, regon: '146501234',
            street: 'ul. Puławska 145', postalCode: '02-715', city: 'Warszawa',
            phone: '+48 600 100 200', email: 'biuro@studiopolysk.pl', bankAccount: '61 1090 1014 0000 0712 1981 2874',
        },
    });
    if (!company.ok()) throw new Error(`PUT company: ${company.status()} ${await company.text()}`);
    const ksef = await page.request.post(`${base}/api/v1/ksef/credentials`, {
        data: { nip, ksefToken: 'demo-token' },
    });
    if (!ksef.ok()) throw new Error(`POST ksef/credentials: ${ksef.status()} ${await ksef.text()}`);
}

/**
 * Stan synchronizacji faktur z KSeF po udanym przebiegu. Zaślepka KSeF niczego nie
 * pobiera, więc Finanse pokazują „Nie pobrano jeszcze faktur z KSeF" - u studia
 * z prawdziwym tokenem ten pasek znika po pierwszej synchronizacji (co 15 min).
 */
export function markKsefSynced(studio) {
    sql(`delete from ksef_sync_cursor where studio_id=${q(studio)}`);
    sql(`insert into ksef_sync_cursor (studio_id, last_error, last_expense_sync, last_revenue_sync, sync_status, updated_at)
         values (${q(studio)}, null, now() - interval '4 minutes', now() - interval '4 minutes', 'SUCCESS', now())`);
}

export function visitIdByTitle(studio, title) {
    return sql(`select id from visits where studio_id=${q(studio)} and title=${q(title)} limit 1`);
}

/**
 * Lokalny backend ma SDK KSeF zastąpione zaślepką (-PksefStub), która nie łączy się
 * z Ministerstwem - faktura ląduje w kolejce offline24. W produkcji KSeF ją przyjmuje
 * i nadaje numer; tu wpisujemy ten stan wprost: status ACCEPTED i numer w formacie
 * KSeF (NIP-RRRRMMDD-12 hex-2 hex). Wszystko, co potem widać w Finansach, rysuje
 * już prawdziwy interfejs z tych danych.
 */
export function markInvoiceAccepted(studio) {
    sql(`update ksef_revenue_invoices
         set ksef_status='ACCEPTED',
             ksef_number = seller_nip || '-' || to_char(issue_date,'YYYYMMDD') || '-'
                 || upper(substr(md5(id::text),1,12)) || '-' || upper(substr(md5(id::text),13,2)),
             sent_at = coalesce(sent_at, now()), accepted_at = now(), last_send_error = null,
             first_queued_at = null, upo_xml = '<?xml version="1.0" encoding="UTF-8"?><Potwierdzenie/>',
             updated_at = now()
         where studio_id=${q(studio)} and source='CRM' and ksef_status <> 'ACCEPTED'`);
}

const AREA_PHRASES = [
    'powłoka ceramiczna', 'ceramika samochodowa', 'powłoka kwarcowa', 'powłoka grafenowa', 'powłoka hydrofobowa',
    'zabezpieczenie lakieru', 'ochrona lakieru', 'folia ppf', 'folia ochronna na lakier', 'bezbarwna folia ochronna',
    'zmiana koloru auta', 'oklejanie samochodu', 'car wrapping', 'folia na auto', 'przyciemnianie szyb',
    'folia przyciemniająca', 'przyciemnianie lamp', 'korekta lakieru', 'polerowanie lakieru', 'usuwanie rys z lakieru',
    'renowacja lakieru', 'dekontaminacja lakieru', 'polerowanie reflektorów', 'renowacja reflektorów', 'detailing wnętrza',
    'pranie tapicerki', 'czyszczenie tapicerki samochodowej', 'renowacja skóry w samochodzie', 'czyszczenie podsufitki',
    'ozonowanie', 'ozonowanie samochodu', 'odgrzybianie klimatyzacji', 'czyszczenie klimatyzacji samochodowej',
    'mycie detailingowe', 'myjnia ręczna', 'mycie ręczne samochodu', 'myjnia bezdotykowa', 'pielęgnacja samochodu',
    'czyszczenie felg', 'zabezpieczenie felg', 'konserwacja podwozia', 'detailing samochodowy', 'studio detailingu',
    'auto detailing', 'kosmetyka samochodowa', 'auto spa',
];

/**
 * Konkurent, który w tym tygodniu ogłosił promocję i puścił płatną kampanię.
 *
 * W produkcji te dane przychodzą z dwóch źródeł: posty z Instagrama (scraper przez
 * RapidAPI, co tydzień i codziennie) i reklamy z Biblioteki Reklam Meta (co dzień
 * dla obserwowanych profili, co 10 min dla okolicy). Lokalnie żadnego klucza nie ma,
 * więc wpisujemy wiersze, które te synchronizacje by zapisały. Klasyfikacja posta
 * jako promocji (regex „promocj…", rabat z „-30%") i wniosek „ogłasza promocję"
 * odpowiadają temu, co liczy TopicClassificationService / InsightEngine.
 *
 * Profile i reklamy z okolicy są w bazie wspólne dla wszystkich studiów (to dane
 * publiczne), stąd „wstaw albo użyj istniejącego".
 */
export function seedCompetitorCampaign(studio, userId) {
    const page = '100200300400';
    sql(`insert into instagram_profiles (id, username, follower_count, following_count, media_count, biography,
            has_contact_data, is_verified, is_business, has_highlight_reels, total_clips_count, is_private, api_error,
            facebook_page_id, facebook_page_name, facebook_page_linked_at, details_last_synced_at, created_at, updated_at,
            category, external_url)
         select gen_random_uuid(), 'shinestudio_waw', 18400, 312, 428, 'Detailing i powłoki ceramiczne. Warszawa, Mokotów.',
            true, false, true, true, 84, false, false, ${q(page)}, 'Shine Studio Warszawa', now() - interval '90 days',
            now() - interval '2 hours', now() - interval '120 days', now(), 'Car detailing', 'https://shinestudio.pl'
         where not exists (select 1 from instagram_profiles where username='shinestudio_waw')`);
    sql(`update instagram_profiles set details_last_synced_at = now() - interval '2 hours', api_error=false
         where username='shinestudio_waw'`);
    const profile = sql(`select id from instagram_profiles where username='shinestudio_waw'`);

    sql(`delete from studio_instagram_profiles where studio_id=${q(studio)} and profile_id=${q(profile)}`);
    sql(`insert into studio_instagram_profiles (id, studio_id, profile_id, status, added_by_user_id, is_self, created_at, updated_at)
         values (gen_random_uuid(), ${q(studio)}, ${q(profile)}, 'ACTIVE', ${q(userId)}, false, now() - interval '120 days', now())`);

    // Posty: osiem zwykłych z ostatnich tygodni (to z nich liczy się „norma" profilu)
    // i jeden z wczoraj - promocja, z zaangażowaniem kilka razy ponad normę.
    sql(`delete from instagram_post_topics where post_id in (select id from instagram_post_snapshots where profile_id=${q(profile)})`);
    sql(`delete from instagram_post_snapshots where profile_id=${q(profile)}`);
    const captions = [
        'Porsche Taycan po pełnej korekcie i ceramice. Efekt lustra 🪞 #detailing',
        'Wnętrze Range Rovera po praniu i zabezpieczeniu skór.',
        'BMW M3 - folia PPF na cały przód. Kamienie już nie straszne.',
        'Mycie detailingowe + dekontaminacja. Zobaczcie różnicę na masce.',
        'Audi RS6: korekta jednoetapowa, nowy blask w 1 dzień.',
        'Mercedes GLE po ozonowaniu i czyszczeniu klimatyzacji.',
        'Felgi Volvo XC90 - czyszczenie i zabezpieczenie ceramiką.',
        'Tesla Model Y - przyciemnianie szyb i ochrona lakieru.',
    ];
    captions.forEach((caption, i) => {
        sql(`insert into instagram_post_snapshots (id, profile_id, post_pk, post_code, like_count, comment_count, view_count,
                caption, taken_at, scraped_at, product_type, carousel_media_count, hashtags)
             values (gen_random_uuid(), ${q(profile)}, 'shine_pk_${i}', 'ShInE${i}code', ${190 + i * 13}, ${11 + i}, null,
                ${q(caption)}, now() - interval '${7 * (i + 1) + 3} days', now(), ${i % 3 === 0 ? "'clips'" : 'null'}, null, 'detailing')`);
    });
    const promo = sql('select gen_random_uuid()');
    sql(`insert into instagram_post_snapshots (id, profile_id, post_pk, post_code, like_count, comment_count, view_count,
            caption, taken_at, scraped_at, product_type, carousel_media_count, hashtags)
         values (${q(promo)}, ${q(profile)}, 'shine_pk_promo', 'ShInEpromo', 1460, 164, 32800,
            'JESIENNA PROMOCJA! Powłoka ceramiczna -30% tylko do końca października. Zapisy w DM 📩',
            now() - interval '1 day', now(), 'clips', null, 'promocja,ceramika')`);
    sql(`insert into instagram_post_topics (id, post_id, topic, is_promo, is_contest, discount_pct, method, classified_at)
         values (gen_random_uuid(), ${q(promo)}, 'PROMOCJA', true, false, 30, 'REGEX', now())`);
    sql(`delete from instagram_insights where studio_id=${q(studio)} and profile_id=${q(profile)}`);
    sql(`insert into instagram_insights (id, studio_id, type, severity, title, body, action_text, profile_id, post_id,
            probable_cause, dedup_key, status, week_start, created_at, updated_at)
         values (gen_random_uuid(), ${q(studio)}, 'PROMO_DETECTED', 'HIGH', '@shinestudio_waw ogłasza promocję (−30%)',
            'W poście z wczoraj pojawiła się oferta promocyjna. Klienci z Twojej okolicy właśnie ją widzą.',
            'Zajrzyj do posta i zdecyduj, czy odpowiadasz własną ofertą.', ${q(profile)}, ${q(promo)}, null,
            'PROMO:shine_pk_promo', 'NEW', date_trunc('week', (now() at time zone 'UTC'))::date, now(), now())`);

    // Płatna kampania obserwowanego profilu (Biblioteka Reklam Meta).
    sql(`delete from meta_ad_snapshots where profile_id=${q(profile)}`);
    sql(`insert into meta_ad_snapshots (id, ad_archive_id, page_id, profile_id, title, delivery_start, delivery_stop,
            reach_eu, reach_pl, platforms, target_ages, target_gender, target_locations, payer, beneficiary, reach_breakdown,
            creative_body, link_description, link_caption, first_seen_at, last_seen_at, created_at, updated_at)
         values (gen_random_uuid(), '900000000000001', ${q(page)}, ${q(profile)}, 'Jesienna promocja: ceramika -30%',
            current_date - 1, null, 15200, 12400, 'FACEBOOK,INSTAGRAM', '25-54', 'All', 'Warszawa, Polska;city;0',
            'Shine Studio Sp. z o.o.', 'Shine Studio Sp. z o.o.', '25-34;3900;1450;0|35-44;3100;1200;0|45-54;2100;900;0',
            'Zabezpiecz lakier przed zimą. Powłoka ceramiczna -30% do końca października. Termin w 7 dni.',
            'Powłoka ceramiczna z gwarancją 3 lata', 'shinestudio.pl', now(), now(), now(), now())`);

    // Okolica: nowa kampania firmy, której studio wcześniej nie widziało w reklamach.
    sql(`insert into meta_ad_area_settings (studio_id, locations, match_mode, excluded_phrase_ids, created_at, updated_at)
         values (${q(studio)}, 'Warszawa', 'INCLUDE_BROADER', '', now(), now())
         on conflict (studio_id) do update set locations='Warszawa', novelty_acked_through=null`);
    sql(`delete from meta_ad_discovery_ads where ad_archive_id in ('900000000000002', '900000000000003')`);
    sql(`insert into meta_ad_discovery_ads (id, phrase, ad_archive_id, page_id, page_name, delivery_start, delivery_stop,
            reach_eu, target_locations, link_caption, fetched_at)
         values (gen_random_uuid(), 'powłoka ceramiczna', '900000000000002', ${q(page)}, 'Shine Studio Warszawa',
                 current_date - 1, null, 15200, 'Warszawa, Polska;city;0', 'shinestudio.pl', now()),
                (gen_random_uuid(), 'folia ppf', '900000000000003', '555666777', 'Auto Spa Mokotów',
                 current_date - 2, null, 8200, 'Warszawa, Polska;city;0', null, now())`);
    sql(`insert into meta_ad_discovery_advertisers (page_id, page_name, first_delivery_start, first_seen_at, last_seen_at)
         values (${q(page)}, 'Shine Studio Warszawa', date '2026-03-01', now() - interval '200 days', now()),
                ('555666777', 'Auto Spa Mokotów', current_date - 2, now(), now())
         on conflict (page_id) do update set last_seen_at = now()`);
    // Wszystkie frazy „świeże" - inaczej wejście w zakładkę Reklamy odpytuje Metę.
    for (const phrase of AREA_PHRASES) {
        sql(`insert into meta_ad_discovery_phrases (id, phrase, last_fetched_at, last_status, ad_count, truncated, created_at, updated_at)
             select gen_random_uuid(), ${q(phrase)}, now(), 'OK', 1, false, now(), now()
             where not exists (select 1 from meta_ad_discovery_phrases where phrase=${q(phrase)})`);
    }
    sql(`update meta_ad_discovery_phrases set last_fetched_at = now(), last_status='OK'`);
    sql(`delete from instagram_reports where studio_id=${q(studio)}`);
    return { profile };
}

/**
 * Historia kampanii, żeby kalendarz reklam nie był pusty poza jedną kreską: po dwie,
 * trzy wcześniejsze kampanie obserwowanych profili i powiązanie profili demo ze
 * stronami na Facebooku (bez tego każdy profil wisi nad kalendarzem jako żółte
 * „profil nie jest połączony ze stroną na Facebooku").
 */
export function seedCampaignHistory(studio) {
    const profiles = rows(`select p.id, p.username from instagram_profiles p
        join studio_instagram_profiles s on s.profile_id = p.id
        where s.studio_id=${q(studio)} and s.status='ACTIVE' order by p.username`);
    const history = {
        shinestudio_waw: [['2026-03-02', '2026-03-22', 'Wiosenne mycie detailingowe'], ['2026-06-01', '2026-06-21', 'Folia PPF na wakacje']],
        autopodrobku: [['2026-04-06', '2026-04-30', 'Korekta lakieru w 1 dzień'], ['2026-08-17', '2026-09-06', 'Pranie tapicerki -20%']],
        carspa_gdansk: [['2026-05-11', '2026-06-07', 'Ceramika z gwarancją 5 lat']],
        detailingmasterspl: [['2026-02-09', '2026-03-01', 'Zimowa pielęgnacja'], ['2026-07-06', '2026-07-26', 'Przyciemnianie szyb']],
    };
    profiles.forEach(([id, username], i) => {
        const pageId = `7000000000${String(i).padStart(2, '0')}`;
        if (username !== 'shinestudio_waw') {
            sql(`update instagram_profiles set facebook_page_id=coalesce(facebook_page_id, ${q(pageId)}),
                    facebook_page_name=coalesce(facebook_page_name, ${q(username)}),
                    facebook_page_linked_at=coalesce(facebook_page_linked_at, now() - interval '60 days')
                 where id=${q(id)}`);
        }
        const fb = sql(`select facebook_page_id from instagram_profiles where id=${q(id)}`);
        (history[username] ?? []).forEach(([from, to, title], j) => {
            const archive = `91${String(i).padStart(2, '0')}${String(j).padStart(2, '0')}00000000`;
            sql(`delete from meta_ad_snapshots where ad_archive_id=${q(archive)}`);
            sql(`insert into meta_ad_snapshots (id, ad_archive_id, page_id, profile_id, title, delivery_start, delivery_stop,
                    reach_eu, reach_pl, platforms, target_ages, target_gender, target_locations, payer, beneficiary,
                    reach_breakdown, creative_body, link_description, link_caption, first_seen_at, last_seen_at,
                    ended_detected_at, created_at, updated_at)
                 values (gen_random_uuid(), ${q(archive)}, ${q(fb)}, ${q(id)}, ${q(title)}, date ${q(from)}, date ${q(to)},
                    ${6000 + j * 2500}, ${5200 + j * 2100}, 'FACEBOOK,INSTAGRAM', '25-54', 'All', 'Polska;country;0',
                    ${q(username)}, ${q(username)}, '25-34;2000;900;0|35-44;1800;800;0', ${q(title)}, null, null,
                    date ${q(from)}, date ${q(to)}, date ${q(to)}, now(), now())`);
        });
    });
}

/**
 * Lista „Do zrobienia" na Tablicy - zwykłe notatki zespołu, przez API zadań.
 * Konto demo ma ją pustą, przez co Tablica jest za krótka, żeby przewinąć nagłówek
 * z kartą „przychód / rezerwacje m/m" (2 października wypada tam −40…−90%).
 */
export async function seedTasks(page, base) {
    const tasks = [
        ['Zamówić pady polerskie 3D (średnie i wykańczające)', 'Hurtownia, do piątku'],
        ['Oddzwonić do p. Kamińskiej - termin odbioru Camry', null],
        ['Wymienić filtr w ozonatorze', 'Stanowisko 2'],
        ['Zdjęcia Porsche 911 po korekcie na Instagram', 'Przed i po'],
        ['Przegląd myjki ciśnieniowej', 'Serwis Kärcher, wt.'],
        ['Faktura za chemię IGL - sprawdzić w KSeF', null],
        ['Grafik na listopad', 'Urlopy: Michał 12–14.11'],
        ['Kupić ręczniki z mikrofibry 40×40', '50 szt.'],
        ['Potwierdzić flotę AutoCars na 9.10', 'Toyota + VW, 2 auta'],
    ];
    for (const [title, meta] of tasks) {
        const res = await page.request.post(`${base}/api/v1/tasks`, { data: { title, ...(meta ? { meta } : {}) } });
        if (!res.ok()) throw new Error(`POST tasks: ${res.status()} ${await res.text()}`);
    }
}

/**
 * Seeder demo ma dwie wizyty z tytułem niezgodnym z autem (DemoDataInitializer.kt:526
 * „…Porsche Cayenne" na Toyocie Camry, :680 „…Kia" na Mercedesie A250). Na Tablicy
 * widać to od razu, więc w nagraniu tytuł mówi o aucie, które naprawdę stoi w wizycie.
 */
export function fixDemoTitles(studio) {
    sql(`update visits set title='2-etap + ceramika Toyota Camry'
         where studio_id=${q(studio)} and title='2-etap + ceramika Porsche Cayenne'`);
}
