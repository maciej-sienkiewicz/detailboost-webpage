// capture/seed.mjs
// Dosiewki do nagrań. Każda funkcja dotyczy JEDNEGO, świeżo założonego konta demo
// (POST /api/v1/demo zakłada osobne studio, kasowane po 2 h) i niczego poza nim.
import { execFileSync } from 'node:child_process';
import { sql, rows, q } from './db.mjs';

/**
 * Zapytanie od klienta z historią (Piotr Wiśniewski: wizyty i dwa auta w danych demo),
 * prowadzone mailem. Na start jest tylko jego pierwszy mail; naszą odpowiedź wysyła
 * w nagraniu prawdziwy formularz CRM, a jego zgodę dopisuje `insertCustomerReply`.
 *
 * Wątek pocztowy lokalnie nie przyjdzie z IMAP, więc pierwszą wiadomość zapisujemy tam,
 * gdzie zapisałaby ją synchronizacja skrzynki. Skrzynka jest ACTIVE i wysyła przez
 * lokalny serwer SMTP (aiosmtpd na localhost:1025) - odpowiedź z nagrania to prawdziwa
 * wysyłka przez SendMailHandler, zapisana przez CRM w wątku. Synchronizacja IMAP do
 * localhost:1143 się nie łączy i tylko odnotowuje błąd; `last_sync_at` mówi CRM, że pierwsza
 * synchronizacja już była (inaczej zamiast leadów stoi ekran „Trwa synchronizacja").
 *
 * Dwie porzucone rezerwacje sprzed miesięcy: CRM liczy je w kartotece kontaktu
 * i pokazuje na leadzie ostrzeżenie „2 odwołane rezerwacje w historii tego kontaktu".
 *
 * Sugestie usług w produkcji dobiera model językowy z treści maila, wybierając
 * POZYCJE CENNIKA (LeadServiceSuggestionService). Lokalnie modelu nie ma, więc
 * wpisujemy dokładnie to, co ta usługa zapisałaby dla tego maila. Sekcję „Klient"
 * (wizyty, obrót, ostatnia wizyta) liczy backend z prawdziwych wizyt.
 */
export function seedReturningCustomerLead(studio) {
    const [[customerId, email, first, last]] = rows(
        `select id, email, first_name, last_name from customers where studio_id=${q(studio)} and first_name='Piotr' and last_name='Wiśniewski'`,
    );
    const name = `${first} ${last}`;
    const leadId = sql('select gen_random_uuid()');
    const inbound =
        'Dzień dobry, po zimie chciałbym odświeżyć 911-kę: korekta lakieru i nowa powłoka ceramiczna. ' +
        'Czy znajdzie się termin 14–15 października? Auto mogę podstawić rano. Pozdrawiam, Piotr Wiśniewski';
    sql(`insert into leads (id, contact_identifier, created_at, customer_id, customer_name, estimated_value,
            initial_message, requires_verification, source, status, studio_id, updated_at, vehicle_brand,
            vehicle_model, vehicle_detection_status)
         values (${q(leadId)}, ${q(email)}, now() - interval '35 minutes', ${q(customerId)}, ${q(name)}, 0,
            ${q(inbound)}, false, 'EMAIL', 'NEW', ${q(studio)}, now() - interval '35 minutes', 'Porsche',
            '911 Carrera 4S', 'DONE')`);

    // Dwie porzucone rezerwacje (klient nie przyjechał) - wiosną i latem.
    sql(`insert into appointments (id, studio_id, customer_id, vehicle_id, appointment_title, appointment_color_id,
            is_all_day, start_date_time, end_date_time, status, send_reminder_sms, created_by, updated_by,
            created_at, updated_at, is_detached)
         select gen_random_uuid(), a.studio_id, a.customer_id, a.vehicle_id, t.title, a.appointment_color_id, false,
            t.ts, t.ts + interval '4 hours', 'ABANDONED', false, a.created_by, a.created_by,
            t.ts - interval '7 days', t.ts, false
         from (select * from appointments where studio_id=${q(studio)} and customer_id=${q(customerId)}
               and deleted_at is null order by created_at desc limit 1) a
         cross join (values ('Korekta lakieru Porsche 911', timestamptz '2026-04-14 09:00+02'),
                            ('Mycie detailingowe Porsche 911', timestamptz '2026-06-09 10:00+02')) t(title, ts)`);

    const services = [
        ['Korekta lakieru 2-etapowa', 'korekta lakieru'],
        ['Powłoka ceramiczna IGL Eclipse', 'nowa powłoka ceramiczna'],
    ];
    let total = 0;
    for (const [service, quote] of services) {
        const [[serviceId, net, gross, vat]] = rows(
            `select id, base_price_net, base_price_gross, vat_rate from services where studio_id=${q(studio)} and name=${q(service)}`,
        );
        total += Number(gross);
        sql(`insert into lead_service_items (id, created_at, evidence_quote, lead_id, name, price_gross, price_net,
                price_source, quantity, service_id, source, status, studio_id, vat_rate)
             values (gen_random_uuid(), now() - interval '35 minutes', ${q(quote)}, ${q(leadId)}, ${q(service)}, ${gross}, ${net},
                'CATALOG', 1, ${q(serviceId)}, 'AI', 'SUGGESTED', ${q(studio)}, ${vat})`);
    }
    sql(`update leads set estimated_value=${total} where id=${q(leadId)}`);
    // Brutto wyceny w mailu = suma brutto pozycji z cennika (bez przeliczania z netto).
    const totalPln = (total / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2 });

    const mailbox = 'kontakt@studiopolysk.pl';
    sql(`insert into mail_accounts (id, studio_id, email_address, provider_type, auth_type, status, smtp_host, smtp_port,
            imap_host, imap_port, encrypted_password, last_sync_at, created_at, updated_at)
         values (gen_random_uuid(), ${q(studio)}, ${q(mailbox)}, 'IMAP_SMTP', 'PASSWORD', 'ACTIVE', 'localhost', 1025,
            'localhost', 1143, 'x', now() - interval '2 minutes', now(), now())
         on conflict (studio_id, email_address) do nothing`);
    const account = sql(`select id from mail_accounts where studio_id=${q(studio)} and email_address=${q(mailbox)}`);
    const thread = sql('select gen_random_uuid()');
    const subject = 'Korekta i powłoka ceramiczna - Porsche 911';
    sql(`insert into comm_threads (id, studio_id, account_id, subject_norm, subject, participant_email, participant_name,
            last_message_at, last_direction, last_snippet, message_count, unread_count, inbound_count, outbound_count,
            has_attachments, lead_id, archived, created_at, kind)
         values (${q(thread)}, ${q(studio)}, ${q(account)}, ${q(subject.toLowerCase())}, ${q(subject)}, ${q(email)}, ${q(name)},
            now() - interval '35 minutes', 'INBOUND', ${q(inbound.slice(0, 120))}, 1, 1, 1, 0, false, ${q(leadId)}, false,
            now() - interval '35 minutes', 'DIRECT')`);
    const ctx = { studio, leadId, customerId, account, thread, email, name, mailbox, subject, totalPln };
    insertMessage(ctx, 'in1', 'INBOUND', '35 minutes', subject, inbound, null);
    sql(`update leads set thread_id=${q(thread)} where id=${q(leadId)}`);
    return ctx;
}

function insertMessage({ studio, account, thread, leadId, email, name, mailbox }, id, dir, ago, subj, body, inReplyTo) {
    const inbound = dir === 'INBOUND';
    // Poczta CRM pokazuje treść z wersji HTML (body_html_safe), lead - z tekstowej.
    const html = `<p>${body.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`;
    sql(`insert into comm_messages (id, studio_id, account_id, thread_id, direction, folder_kind, message_id_hdr,
            in_reply_to, from_email, from_name, to_emails, subject, sent_at, body_text, body_text_clean, body_html_safe,
            has_attachments, is_read, read_source, read_at, send_status, created_at)
         values (gen_random_uuid(), ${q(studio)}, ${q(account)}, ${q(thread)}, '${dir}', '${inbound ? 'INBOX' : 'SENT'}',
            ${q(`<${id}.${leadId}@seed>`)}, ${inReplyTo ? q(`<${inReplyTo}.${leadId}@seed>`) : 'null'},
            ${q(inbound ? email : mailbox)}, ${q(inbound ? name : 'Studio Połysk')}, ${q(inbound ? mailbox : email)}, ${q(subj)},
            now() - interval '${ago}', ${q(body)}, ${q(body)}, ${q(html)}, false, ${inbound ? 'false' : 'true'}, null, null,
            '${inbound ? 'RECEIVED' : 'SENT'}', now() - interval '${ago}')`);
}

/**
 * Klient odpisuje: zgoda na termin i wycenę. Jak przy pierwszym mailu - w miejscu,
 * w które zapisałaby ją synchronizacja skrzynki.
 */
export function insertCustomerReply(ctx) {
    const body = `Tak, potwierdzam termin 14–15.10 i wycenę ${ctx.totalPln} zł. Zgadzam się na wykonanie obu usług. ` +
        'Podstawię auto o 9:00. Piotr Wiśniewski';
    insertMessage(ctx, 'in2', 'INBOUND', '1 minute', `Re: ${ctx.subject}`, body, null);
    sql(`update comm_threads set last_message_at=now() - interval '1 minute', last_direction='INBOUND',
            message_count=message_count+1, inbound_count=inbound_count+1, last_snippet=${q(body.slice(0, 120))}
         where id=${q(ctx.thread)}`);
    // Ostatnie słowo należy do klienta, ale po jego zgodzie ruch jest po stronie studia
    // w kalendarzu, nie w poczcie - first_response_at po zgodzie trzyma „Stwórz
    // rezerwację" jako krok następny (leadUrgency.ts) zamiast „Odpisz klientowi".
    sql(`update leads set first_response_at = now(), updated_at = now() where id=${q(ctx.leadId)}`);
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
 * potwierdzenie rezerwacji, przypomnienie 24 h przed wizytą, „pojazd gotowy"
 * i link do podpisu dokumentu (bez niego wydanie auta nie wyśle protokołu do podpisu).
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
    config.signatureRequest.enabled = true;
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

/** NIP z poprawną cyfrą kontrolną (wagi 6,5,7,2,3,4,5,6,7) dla fikcyjnych firm. */
function nip(prefix9) {
    const w = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    for (let k = 0; k < 1000; k++) {
        const base = String((Number(prefix9) + k) % 1e9).padStart(9, '0');
        const sum = [...base].reduce((acc, d, i) => acc + Number(d) * w[i], 0) % 11;
        if (sum !== 10) return base + sum;
    }
    throw new Error('nip');
}

/*
 * Dostawcy są FIKCYJNI, z NIP-ami przechodzącymi tylko test sumy kontrolnej. Strona jest
 * publiczna, a faktury są zmyślone - nie przypisujemy ich prawdziwym firmom.
 */
export const SUPPLIERS = {
    chemia: { name: 'Detailing Chemie Hurt Sp. z o.o.', nip: nip('598412736'), category: 'Chemia detailingowa', color: '#3B82F6', about: 'Szampony, pre-washe, woski, mikrofibry' },
    paliwo: { name: 'Stacje Paliw Ekspres S.A.', nip: nip('641937205'), category: 'Paliwo', color: '#F97316', about: 'Auto serwisowe i odbiór door-to-door' },
    ppf: { name: 'PPF Protect Dystrybucja Sp. z o.o.', nip: nip('712506384'), category: 'Folie PPF', color: '#8B5CF6', about: 'Rolki folii ochronnej i akcesoria montażowe' },
    leasing: { name: 'AutoLease Finanse Sp. z o.o.', nip: nip('846210397'), category: 'Leasing', color: '#64748B', about: 'Raty leasingowe auta serwisowego i sprzętu' },
    media: { name: 'Energia Miasto Sp. z o.o.', nip: nip('935874120'), category: 'Media', color: '#EAB308', about: 'Prąd, woda, ogrzewanie' },
    narzedzia: { name: 'Narzędziownia Profi Sp. z o.o.', nip: nip('578203916'), category: 'Narzędzia i sprzęt', color: '#14B8A6', about: 'Polerki, narzędzia, materiały warsztatowe' },
};

/** Nowa faktura, która „przychodzi" z KSeF w nagraniu (i w animacji przed nim). */
export const NEW_COST_INVOICE = {
    supplier: 'ppf',
    number: 'FV/PP/2026/0915',
    items: [
        ['Folia PPF bezbarwna 152 cm × 15,24 m', 'rolka', 1, 6890.0],
        ['Płyn montażowy do folii 1 l', 'szt.', 2, 89.0],
    ],
};

function insertCostInvoice(studio, buyer, { supplier, number, daysAgo, payForm, items, minutesAgo }) {
    const s = SUPPLIERS[supplier];
    const lines = items.map(([name, unit, qty, unitNet], i) => {
        const net = Math.round(qty * unitNet * 100);
        // Brutto pozycji z faktury dostawcy: netto × stawka, zaokrąglone raz na pozycję.
        return { i: i + 1, name, unit, qty, unitNet: Math.round(unitNet * 100), net, gross: Math.round(net * 1.23) };
    });
    const net = lines.reduce((a, l) => a + l.net, 0);
    const gross = lines.reduce((a, l) => a + l.gross, 0);
    const when = minutesAgo != null ? `now() - interval '${minutesAgo} minutes'` : `((current_date - ${daysAgo})::timestamp + time '09:40') at time zone 'Europe/Warsaw'`;
    const issue = minutesAgo != null ? 'current_date' : `current_date - ${daysAgo}`;
    const hash = sql(`select upper(substr(md5(${q(number + studio)}), 1, 14))`);
    const ksef = `${s.nip}-${sql(`select to_char(${issue}, 'YYYYMMDD')`)}-${hash.slice(0, 12)}-${hash.slice(12, 14)}`;
    const id = sql('select gen_random_uuid()');
    const paid = payForm === 'KARTA' || (daysAgo ?? 0) > 20;
    sql(`insert into ksef_invoices (id, studio_id, source, ksef_number, invoice_number, invoicing_date, issue_date,
            seller_nip, seller_name, buyer_name, net_amount, gross_amount, vat_amount, currency, invoice_type,
            fetched_at, direction, is_correction, status, payment_status, payment_form, payment_due_date, details_synced)
         values (${q(id)}, ${q(studio)}, 'KSEF', ${q(ksef)}, ${q(number)}, ${when}, ${issue}, ${q(s.nip)}, ${q(s.name)},
            ${q(buyer)}, ${net}, ${gross}, ${gross - net}, 'PLN', 'FA', ${minutesAgo != null ? 'now()' : `${when} + interval '15 minutes'`},
            'EXPENSE', false, 'ACTIVE', '${paid ? 'PAID' : 'PENDING'}', '${payForm}',
            ${payForm === 'PRZELEW' ? `${issue} + 14` : 'null'}, true)`);
    for (const l of lines) {
        sql(`insert into ksef_invoice_items (id, invoice_id, line_number, name, unit, quantity, unit_price_net, net_value, gross_value, vat_rate)
             values (gen_random_uuid(), ${q(id)}, ${l.i}, ${q(l.name)}, ${q(l.unit)}, ${l.qty}, ${l.unitNet}, ${l.net}, ${l.gross}, '23')`);
    }
    return { id, net, gross, ksef };
}

/**
 * Kategorie kosztów, reguła na każdego dostawcę (dopasowanie po NIP sprzedawcy -
 * tak działa SupplierAutoRuleService) i pół roku faktur kosztowych.
 *
 * Faktury kosztowe w produkcji pobiera z KSeF synchronizacja co 15 minut; lokalnie SDK
 * KSeF jest zaślepką, więc wpisujemy je tam, gdzie zapisałaby je synchronizacja.
 * Kategoryzację robi PRAWDZIWY silnik reguł: wołamy jego endpoint
 * („Zastosuj wszystkie reguły teraz") - historię przed nagraniem, nową fakturę na nim.
 */
export async function seedCostData(page, base, studio) {
    const [[owner, buyer]] = rows(`select u.id, coalesce(ss.name, s.name) from studios s
        join users u on u.studio_id = s.id left join studio_settings ss on ss.studio_id = s.id
        where s.id=${q(studio)} order by u.created_at limit 1`);
    for (const s of Object.values(SUPPLIERS)) {
        const cat = sql('select gen_random_uuid()');
        sql(`insert into cost_categories (id, studio_id, name, description, color, is_active, exclude_from_stats, created_by, created_at, updated_at)
             values (${q(cat)}, ${q(studio)}, ${q(s.category)}, ${q(s.about)}, ${q(s.color)}, true, false, ${q(owner)},
                now() - interval '200 days', now() - interval '200 days')`);
        sql(`insert into supplier_auto_rules (id, studio_id, seller_nip, seller_name, category_id, created_at, updated_at)
             values (gen_random_uuid(), ${q(studio)}, ${q(s.nip)}, ${q(s.name)}, ${q(cat)}, now() - interval '200 days', now() - interval '200 days')`);
    }
    const history = [];
    [170, 140, 110, 79, 48, 18].forEach((d, i) => history.push({ supplier: 'leasing', number: `AL/2026/${118734 + i * 3411}`, daysAgo: d, payForm: 'PRZELEW',
        items: [[`Rata leasingowa ${9 + i}/48, umowa AL/25/01187 (auto serwisowe)`, 'szt.', 1, 2450]] }));
    [[165, 92, 5.37], [133, 104, 5.41], [101, 88, 5.29], [70, 97, 5.33], [39, 110, 5.45], [9, 95, 5.49]].forEach(([d, l, p], i) =>
        history.push({ supplier: 'paliwo', number: `FVS/0412/26/${118455 + i * 9731}`, daysAgo: d, payForm: 'KARTA',
            items: [['Olej napędowy', 'l', l, p], ...(i === 2 ? [['AdBlue 10 l', 'szt.', 1, 39]] : [])] }));
    [[150, 1840], [89, 1610], [28, 1725]].forEach(([d, kwh], i) => history.push({ supplier: 'media', number: `P/23518840/000${3 + i}/26`, daysAgo: d,
        payForm: 'PRZELEW', items: [['Energia elektryczna, taryfa C12a', 'kWh', kwh, 0.62], ['Opłata handlowa', 'mies.', 2, 22.5]] }));
    [[158, [['Szampon pH neutralny 5 l', 'szt.', 2, 119], ['Pre-wash alkaliczny 5 l', 'szt.', 2, 129], ['Wosk w sprayu 1 l', 'szt.', 4, 59]]],
     [120, [['Środek do felg 5 l', 'szt.', 2, 145], ['Mikrofibra 40×40 cm', 'szt.', 20, 9.5]]],
     [95, [['Szampon pH neutralny 5 l', 'szt.', 2, 119], ['Usuwacz smoły i kleju 1 l', 'szt.', 3, 49]]],
     [75, [['Pre-wash alkaliczny 5 l', 'szt.', 3, 129], ['Wosk twardy 500 ml', 'szt.', 2, 89]]],
     [33, [['Środek do felg 5 l', 'szt.', 2, 145], ['Wosk w sprayu 1 l', 'szt.', 6, 59]]]].forEach(([d, items], i) =>
        history.push({ supplier: 'chemia', number: `FV/2026/0${4 + i}/0${412 + i * 137}`, daysAgo: d, payForm: 'PRZELEW', items }));
    [[145, [['Folia PPF bezbarwna 152 cm × 15,24 m', 'rolka', 1, 6890], ['Płyn montażowy do folii 1 l', 'szt.', 2, 89]]],
     [96, [['Folia PPF matowa 152 cm × 15,24 m', 'rolka', 1, 7420]]],
     [41, [['Folia PPF bezbarwna 152 cm × 15,24 m', 'rolka', 1, 6890], ['Folia PPF bezbarwna 61 cm × 15,24 m', 'rolka', 1, 2790]]]].forEach(([d, items], i) =>
        history.push({ supplier: 'ppf', number: `FV/PP/2026/0${388 + i * 133}`, daysAgo: d, payForm: 'PRZELEW', items }));
    [[128, [['Polerka rotacyjna 1500 W', 'szt.', 1, 1290], ['Rękawice nitrylowe, op. 100 szt.', 'op.', 5, 34.9]]],
     [55, [['Komplet nasadek 1/2", 24 elem.', 'kpl.', 1, 389], ['Taśma maskująca 48 mm', 'szt.', 12, 11.2]]]].forEach(([d, items], i) =>
        history.push({ supplier: 'narzedzia', number: `NP/26/00${45118 + i * 16259}`, daysAgo: d, payForm: 'PRZELEW', items }));
    for (const inv of history) insertCostInvoice(studio, buyer, inv);
    const res = await page.request.post(`${base}/api/v1/cost-categories/auto-rules/apply`, { data: {} });
    if (!res.ok()) throw new Error(`apply rules: ${res.status()} ${await res.text()}`);
    return { buyer, assigned: await res.json() };
}

/** Faktura „przychodzi" z KSeF - wiersz w miejscu, w które zapisuje go synchronizacja. */
export function insertNewCostInvoice(studio, buyer) {
    return insertCostInvoice(studio, buyer, { ...NEW_COST_INVOICE, payForm: 'PRZELEW', minutesAgo: 2 });
}
