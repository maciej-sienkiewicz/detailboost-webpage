/**
 * Treści strony wspólne dla obu wersji (index.html i v2.html): funkcje, KSeF, zakres
 * planów i dane spółki. Ceny i adresy są w `site.ts`.
 */

export type Benefit = {
    /** Jak jest dziś - słowami właściciela studia, nie mechanika przy aucie. */
    today: string;
    /** Co się zmienia: krótko, do przeczytania w przelocie. */
    change: string;
    /** Jak to działa - tylko to, co widać na nagraniu, do którego prowadzi przycisk. */
    how: string;
    scene: string;
    beat?: string;
};

/*
 * Każda karta ma dwa podpisane piętra: „Dziś" (kłopot, przygaszony) i „Z DetailBoost"
 * (zmiana, jasna). Bez podpisów karta czytała się jak dwa niezwiązane zdania - nie było
 * widać, że drugie odpowiada na pierwsze. Przycisk prowadzi do kroku nagrania, który
 * to pokazuje, więc obietnica jest sprawdzalna jednym kliknięciem.
 */
export const BENEFITS: readonly Benefit[] = [
    {
        today: 'Zapytanie przychodzi mailem, a wycena powstaje dopiero wieczorem.',
        change: 'Zapytanie od razu z historią klienta i wyceną',
        how: 'System podsuwa usługi z cennika z cenami i pokazuje wcześniejsze wizyty klienta. Odpowiedź wychodzi z firmowej skrzynki studia.',
        scene: 'lead',
        beat: 'suggested',
    },
    {
        today: 'Klient zapomina o terminie, a stanowisko stoi puste.',
        change: 'Przypomnienia wysyłają się same',
        how: 'Potwierdzenie SMS zaraz po rezerwacji i przypomnienie 24 godziny przed wizytą.',
        scene: 'lead',
        beat: 'sms',
    },
    {
        today: 'Przy odbiorze klient twierdzi, że rysy wcześniej nie było.',
        change: 'Stan auta udokumentowany przy przyjęciu',
        how: 'Zdjęcia z telefonu przez kod QR, mapa uszkodzeń i protokół podpisany przez klienta na tablecie.',
        scene: 'checkin',
        beat: 'damage',
    },
    {
        today: 'Propozycję dodatkowej usługi trzeba przedzwonić, a klient nie odbiera.',
        change: 'Klient akceptuje usługę SMS-em',
        how: 'Dostaje link do strony swojej wizyty z propozycją i ceną. Odpisuje „TAK” i usługa trafia do wizyty.',
        scene: 'visitcard',
        beat: 'offer',
    },
    {
        today: 'Faktury wystawiane po godzinach i przepisywane ręcznie.',
        change: 'Faktura z wizyty, wysłana do KSeF',
        how: 'Faktura powstaje z pozycji wizyty i idzie do KSeF jednym kliknięciem. Faktury kosztowe pobierają się z KSeF same.',
        scene: 'handover',
        beat: 'invoice',
    },
    {
        today: 'Godziny zespołu w zeszycie, lista obecności sklejana na koniec miesiąca.',
        change: 'Czas pracy zespołu w jednym miejscu',
        how: 'Pracownicy wpisują godziny sami, Ty zatwierdzasz kartę jednym kliknięciem i pobierasz listę obecności w PDF.',
        scene: 'team',
        beat: 'worktime',
    },
];

/*
 * Każdy punkt odpowiada temu, co robi moduł KSeF w backendzie CRM (pl.detailing.crm.ksef):
 * faktura FA(3) z pozycji wizyty, wysyłka i UPO, kod QR weryfikacji, korekty, kolejka
 * offline24 z automatycznym dosłaniem, pobieranie faktur kosztowych co 15 minut
 * i przypisanie kategorii regułą po NIP. Czego moduł nie robi, tego tu nie ma.
 */
export const KSEF_SALES = [
    'Faktura VAT z pozycji wizyty, w schemacie FA(3)',
    'Wysyłka do KSeF jednym kliknięciem przy wydaniu auta',
    'Numer KSeF i UPO wracają do faktury same',
    'Kod QR weryfikacji na fakturze dla klienta',
    'Korekty faktur wystawione w KSeF',
    'Gdy KSeF nie działa: faktura czeka w kolejce i dosyła się sama (offline24)',
] as const;

export const KSEF_COSTS = [
    'Faktury od dostawców pobierane z KSeF co 15 minut',
    'Reguła po NIP dostawcy przypisuje kategorię kosztu',
    'Koszty w kategoriach: chemia, folie, paliwo, leasing',
    'Statystyki kosztów w wybranym okresie',
] as const;

/*
 * Cennik wprost z katalogu w backendzie: dwa plany i moduły do BASIC, ceny brutto
 * za studio miesięcznie. Kwotę netto pokazujemy obok, bo właściciel firmy liczy
 * w netto, ale nie zaokrąglamy jej „ładnie" - ma się zgadzać z fakturą.
 */
export const BASIC_INCLUDES = [
    'Kalendarz i rezerwacje',
    'Baza klientów i pojazdów z historią wizyt',
    'Wizyty, protokoły i dokumenty',
    'Galeria zdjęć',
    'Cały zespół w cenie',
] as const;

export const FULL_INCLUDES = [
    'Wszystko z BASIC',
    'Faktury i KSeF, koszty z KSeF',
    'Przypomnienia i statusy SMS i e-mail',
    'Podpisy na tablecie i Karta Wizyty',
    'Statystyki, kampanie, monitoring konkurencji',
    'Asystent AI przy zapytaniach',
] as const;

/** Dane spółki z KRS - stopka strony sp. z o.o. musi je podawać (art. 206 KSH). */
export const COMPANY = {
    name: 'M&M SOLUTIONS sp. z o.o.',
    address: ['ul. Poznańska 119', '60-185 Skórzewo'],
    registry: [
        ['KRS', '0001267442'],
        ['NIP', '7773476300'],
        ['REGON', '545750800'],
        ['Kapitał zakładowy', '40 000 zł'],
    ],
} as const;
