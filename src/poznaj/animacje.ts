import lista from './animacje.json';
import wygenerowane from './animacje.gen.json';

/**
 * Animacje-instrukcje z podstrony „Poznaj program".
 *
 * `animacje.json` to ręcznie prowadzona lista (kolejność = kolejność na stronie),
 * `animacje.gen.json` dopisuje `scripts/animacje.mjs`: długość i rozdziały odczytane
 * z samej animacji. Pliki animacji leżą w `public/animacje/<slug>/`.
 */
export type Kategoria = 'kalendarz' | 'przyjecie' | 'wizyta' | 'zapytania' | 'klienci' | 'rozliczenia' | 'zespol';

export type Animacja = {
    slug: string;
    kategoria: Kategoria;
    tytul: string;
    opis: string;
    /** `html` - interaktywny odtwarzacz w ramce, `mp4` - film. */
    rodzaj: 'html' | 'mp4';
    /** Ścieżka w folderze animacji, z której skrypt bierze pliki. */
    zrodlo: string;
    /** `robocza` - animacja jeszcze w akceptacji; na liście ma dopisek. */
    status: 'gotowa' | 'robocza';
    /** Sekundy. */
    czas: number;
    rozdzialy: string[];
};

export const KATEGORIE: ReadonlyArray<{ id: Kategoria; nazwa: string; opis: string }> = [
    { id: 'kalendarz', nazwa: 'Kalendarz i rezerwacje', opis: 'Od pierwszego telefonu do terminu w kalendarzu.' },
    { id: 'przyjecie', nazwa: 'Przyjęcie auta', opis: 'Wizyta, zdjęcia, uszkodzenia i protokół z podpisem.' },
    { id: 'wizyta', nazwa: 'W trakcie wizyty', opis: 'Zmiany w wizycie, dodatkowe usługi i zgoda klienta.' },
    { id: 'zapytania', nazwa: 'Zapytania i poczta', opis: 'Leady, skrzynka studia i odpowiedzi z AI.' },
    { id: 'klienci', nazwa: 'Klienci i marketing', opis: 'SMS-y, kampanie, kontakty i konkurencja.' },
    { id: 'rozliczenia', nazwa: 'Cennik i rozliczenia', opis: 'Pakiety, VAT, KSeF i zlecenia zbiorcze.' },
    { id: 'zespol', nazwa: 'Zespół', opis: 'Konta pracowników i zadania na Tablicy.' },
];

const gen = wygenerowane as Record<string, { czas: number; rozdzialy: string[] }>;

export const ANIMACJE: readonly Animacja[] = (lista as Omit<Animacja, 'czas' | 'rozdzialy'>[]).map((a) => ({
    ...a,
    czas: gen[a.slug]?.czas ?? 0,
    rozdzialy: gen[a.slug]?.rozdzialy ?? [],
}));

export const sciezka = (a: Animacja) => `/animacje/${a.slug}/`;

/** „1:26" - długość jak na odtwarzaczu. */
export function dlugosc(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** 1 rozdział, 2 rozdziały, 5 rozdziałów. */
export function rozdzialy(n: number) {
    const d = n % 10;
    const s = n % 100;
    if (n === 1) return '1 rozdział';
    if (d >= 2 && d <= 4 && (s < 12 || s > 14)) return `${n} rozdziały`;
    return `${n} rozdziałów`;
}
