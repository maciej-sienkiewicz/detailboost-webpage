import type { Beat, Focus } from '../components/SceneOverlay';
import type { Scene } from '../components/ScenePlayer';
import { InvoiceJourney } from '../components/InvoiceJourney';
import lead from './lead.timing.json';
import handover from './handover.timing.json';
import costs from './costs.timing.json';
import instagram from './instagram.timing.json';

type Timing = Record<string, { at: number; focus?: Focus }>;
type Caption = { step: string; text: string; zoom?: number; wide?: boolean };

/**
 * Podpisy kroków do nagrań. Czasy i obszary kadru pochodzą z nagrania
 * (capture/run.mjs → *.timing.json): skrypt znaczy krok w chwili, w której robi go
 * w CRM, i bierze obszar z prawdziwego położenia elementu. Tu zostaje tylko słowo.
 *
 * Każde zdanie opisuje to, co widać na ekranie w tej chwili - i jest prawdą
 * o produkcie (patrz README, „Co jest dosiewane do bazy").
 */
function beats(timing: Timing, captions: Record<string, Caption>): Beat[] {
    return Object.entries(timing)
        .filter(([id]) => captions[id])
        .map(([id, { at, focus }]) => {
            const c = captions[id]!;
            // Przybliżenie z wielkości obszaru: ma się zmieścić w kadrze z oddechem,
            // i nie więcej niż 1,35× - nagranie ma 1440 px, dalej tekst się rozmywa.
            const fit = focus ? Math.min(90 / focus.w, 90 / focus.h) : 1;
            const zoom = c.wide || !focus ? 1 : Math.max(1, Math.min(c.zoom ?? 1.35, fit));
            return { at, step: c.step, text: c.text, focus, zoom };
        })
        .sort((a, b) => a.at - b.at);
}

const DIR = `${import.meta.env.BASE_URL}scenes/`;

export type SiteScene = Scene & { features: readonly number[] };

export const SCENES: readonly SiteScene[] = [
    {
        id: 'lead',
        title: 'Zapytanie od klienta i termin',
        summary: 'Mail klienta, podpowiedzi usług z cennika, nasza odpowiedź i jego zgoda. Termin wybrany w kalendarzu, rezerwacja wypełnia się sama.',
        poster: `${DIR}lead-poster.webp`,
        video: `${DIR}lead`,
        features: [0, 1, 3],
        beats: beats(lead, {
            inbox: { step: 'Zapytanie', text: 'Stały klient pisze mailem o korektę lakieru i powłokę ceramiczną.', wide: true },
            question: { step: 'Mail klienta', text: 'Pyta o dwie usługi i o termin 14–15 października.' },
            suggested: { step: 'Podpowiedź', text: 'CRM czyta maila i podsuwa usługi z cennika, od razu z cenami.' },
            reply: { step: 'Odpowiedź', text: 'Odpisujemy z wyceną i godzinami przyjęcia auta.' },
            consent: { step: 'Zgoda klienta', text: 'Klient potwierdza termin i wycenę. Zgoda zostaje w historii sprawy.' },
            history: { step: 'Historia klienta', text: '3 wizyty i 8 772 zł obrotu. Wiesz, z kim rozmawiasz.' },
            accept: { step: 'Wycena', text: 'Podpowiedzi przechodzą do wyceny jednym kliknięciem.' },
            calendar: { step: 'Kalendarz', text: 'Zaznaczasz 14–15 października, auto zostaje na dwa dni.', zoom: 1.15 },
            form: { step: 'Rezerwacja', text: 'Klient, auto z kartoteki i usługi z cenami są już wpisane.', zoom: 1.2 },
            sms: { step: 'SMS', text: 'Potwierdzenie od razu, przypomnienie 24 godziny przed wizytą.' },
            done: { step: 'Gotowe', text: 'Rezerwacja zapisana i widoczna przy zapytaniu klienta.' },
        }),
    },
    {
        id: 'handover',
        title: 'Wydanie auta z podpisem i fakturą',
        summary: 'Klient podpisuje protokół wydania na swoim telefonie. Faktura VAT idzie do KSeF i wraca z numerem i kodem QR.',
        poster: `${DIR}handover-poster.webp`,
        video: `${DIR}handover`,
        features: [0, 2],
        beats: beats(handover, {
            ready: { step: 'Auto gotowe', text: 'Jedno kliknięcie oznacza wizytę jako gotową do odbioru.', wide: true },
            notify: { step: 'Powiadomienie', text: 'Klient dostaje SMS i e-mail, że może odebrać auto.', zoom: 1.2 },
            protocol: { step: 'Protokół wydania', text: 'CRM przygotowuje protokół i wysyła link do podpisu na telefon klienta.', zoom: 1.2 },
            document: { step: 'Telefon klienta', text: 'Klient otwiera link z SMS-a i czyta protokół.', wide: true },
            sign: { step: 'Podpis', text: 'Zaznacza oświadczenie i podpisuje się palcem na ekranie.', wide: true },
            signed: { step: 'Podpisane', text: 'Podpisany protokół wraca do wizyty jako PDF.', wide: true },
            back: { step: 'W studiu', text: 'Wydanie widzi podpis od razu i przechodzi do płatności.', zoom: 1.2 },
            invoice: { step: 'Faktura', text: 'Faktura VAT z pozycji wizyty, z wysyłką do KSeF.' },
            ksef: { step: 'KSeF', text: 'Faktura przyjęta przez KSeF, z numerem KSeF.' },
            qr: { step: 'Kod QR', text: 'Kod weryfikacji KSeF jest na fakturze dla klienta.' },
        }),
    },
    {
        id: 'costs',
        title: 'Koszty z KSeF w kategoriach',
        summary: 'Faktura od dostawcy przychodzi z KSeF, reguła po NIP przypisuje ją do kategorii, a statystyki pokazują, ile idzie na chemię, paliwo, folie i leasing.',
        poster: `${DIR}costs-poster.webp`,
        video: `${DIR}costs`,
        features: [2],
        intro: { seconds: 7.5, render: (progress) => <InvoiceJourney progress={progress} /> },
        beats: beats(costs, {
            refresh: { step: 'Pobranie z KSeF', text: 'Faktury kosztowe przychodzą z KSeF same, co 15 minut.', wide: true },
            arrived: { step: 'Nowa faktura', text: 'Folia PPF za 8 693,64 zł, bez przepisywania z papieru.' },
            unassigned: { step: 'Koszty miesiąca', text: 'Faktura jest jeszcze nieprzypisana do kategorii.' },
            rules: { step: 'Reguły', text: 'Każdy dostawca ma regułę: jego NIP wskazuje kategorię kosztu.' },
            applied: { step: 'Dopasowanie', text: 'Reguła przypisuje fakturę do kategorii Folie PPF. Przy pobraniu z KSeF dzieje się to samo.' },
            category: { step: 'Kategoria', text: 'Pozycje faktury mają już swoją kategorię.' },
            year: { step: 'Ostatnie 12 miesięcy', text: 'Struktura kosztów: chemia, paliwo, folie PPF, leasing, media, narzędzia.', wide: true },
            totals: { step: 'Suma kategorii', text: 'Ile poszło na każdą kategorię w wybranym okresie.' },
        }),
    },
    {
        id: 'instagram',
        title: 'Nowa kampania u konkurencji',
        summary: 'Konkurent z okolicy ogłasza promocję i puszcza reklamę. Widzisz zasięg, odbiorców i treść, zanim zadzwoni klient.',
        poster: `${DIR}instagram-poster.webp`,
        video: `${DIR}instagram`,
        features: [],
        beats: beats(instagram, {
            alert: { step: 'Alert', text: 'Konkurencja z okolicy uruchomiła nową kampanię. Widać to na Tablicy.' },
            area: { step: 'Reklamodawcy w okolicy', text: 'Nowa firma i nowa kampania z Biblioteki Reklam Meta.' },
            calendar: { step: 'Kalendarz reklam', text: 'Kampanie obserwowanych profili na osi całego roku.' },
            campaign: { step: 'Kampania', text: 'Zasięg, start emisji i grupa odbiorców reklamy.', zoom: 1.2 },
            creative: { step: 'Treść reklamy', text: 'Co dokładnie obiecuje konkurent.' },
            week: { step: 'Tydzień', text: 'Post z promocją ma 6,5 raza więcej reakcji niż zwykle.' },
        }),
    },
];
