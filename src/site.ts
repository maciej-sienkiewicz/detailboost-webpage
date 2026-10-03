/**
 * Adresy aplikacji CRM i stałe oferty - jedno miejsce do zmiany.
 *
 * Konto demo startuje przyciskiem na stronie logowania aplikacji (POST /api/v1/demo),
 * więc „Konto demo" prowadzi tam.
 */
export const APP_URL = 'https://detailboost.pl';
export const SIGNUP_URL = `${APP_URL}/signup`;
export const LOGIN_URL = `${APP_URL}/login`;
export const DEMO_URL = LOGIN_URL;

/** Warunki oferty - te same słowa w hero, w cenniku i na dole strony. */
export const OFFER_TERMS = ['3 miesiące za darmo', 'bez karty', 'bez umowy terminowej'] as const;

/**
 * Cennik z katalogu w backendzie (EntitlementDataSeeder, SmsCreditPackageSeeder):
 * kwoty brutto w groszach, miesięcznie, za studio. Netto liczymy z 23% VAT.
 */
export const PLANS = {
    basic: { name: 'BASIC', grossCents: 9_900 },
    full: { name: 'FULL', grossCents: 29_900 },
} as const;

export const ADD_ONS: ReadonlyArray<{ name: string; note: string; grossCents: number }> = [
    { name: 'Kontrola nad finansami', note: 'faktury, kasy fiskalne i KSeF', grossCents: 4_900 },
    { name: 'Automatyzacja kontaktu z klientem', note: 'przypomnienia i statusy SMS i e-mail', grossCents: 4_900 },
    { name: 'Asystent AI przy zapytaniach', note: 'obsługa zapytań klientów wspierana przez AI', grossCents: 4_900 },
    { name: 'Monitoring konkurencji', note: 'profile i kampanie konkurencji na Instagramie', grossCents: 3_200 },
    { name: 'Podpisy elektroniczne', note: 'protokoły i zgody podpisywane na tablecie', grossCents: 2_900 },
    { name: 'Kampanie SMS i e-mail', note: 'wysyłki do bazy klientów z segmentacją', grossCents: 2_900 },
    { name: 'Produkty w studiu', note: 'katalog preparatów z kodu kreskowego', grossCents: 2_900 },
    { name: 'Statystyki', note: 'przychody, usługi i opóźnienia', grossCents: 1_900 },
];

/** Pakiety SMS: najmniejszy i największy z katalogu (brutto). */
export const SMS_RANGE = {
    smallest: { credits: 50, grossCents: 1_999 },
    largest: { credits: 2_500, grossCents: 49_999 },
} as const;

const VAT = 1.23;

/** 9900 → „99", 1999 → „19,99" - bez zer po przecinku, gdy kwota jest pełna. */
export function zl(cents: number) {
    const value = cents / 100;
    return value.toLocaleString('pl-PL', {
        minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
        maximumFractionDigits: 2,
    });
}

export const net = (grossCents: number) => Math.round(grossCents / VAT);

/** Średnio dni w miesiącu - do przelicznika „zł dziennie". */
export const perDay = (grossCents: number) => Math.round(grossCents / 30.4);
