import type { Beat, Focus } from '../components/SceneOverlay';
import type { Scene } from '../components/ScenePlayer';
import lead from './lead.timing.json';
import checkin from './checkin.timing.json';
import handover from './handover.timing.json';
import costs from './costs.timing.json';
import instagram from './instagram.timing.json';

type Timing = Record<string, { at: number; until?: number; focus?: Focus }>;
type Caption = { step: string; text: string; zoom?: number; wide?: boolean };

/**
 * Podpisy kroków do nagrań. Czasy i obszary kadru pochodzą z nagrania
 * (capture/run.mjs → *.timing.json): skrypt znaczy krok w chwili, w której robi go
 * w CRM, i bierze obszar z prawdziwego położenia elementu. Tu zostaje tylko słowo.
 *
 * Każde zdanie opisuje to, co widać na ekranie w tej chwili - i jest prawdą
 * o produkcie (patrz README, „Co jest dosiewane do bazy").
 */
/** Najdłużej trzymana ramka - dłużej oko i tak już jest gdzie indziej. */
const MAX_FOCUS = 3.6;

function beats(timing: Timing, captions: Record<string, Caption>): Beat[] {
    const list = Object.entries(timing)
        .filter(([id]) => captions[id])
        .sort(([, a], [, b]) => a.at - b.at);
    return list.map(([id, { at, until, focus }], i) => {
        const c = captions[id]!;
        // Przybliżenie z wielkości obszaru: ma się zmieścić w kadrze z oddechem,
        // i nie więcej niż 1,35× - nagranie ma 1440 px, dalej tekst się rozmywa.
        const fit = focus ? Math.min(90 / focus.w, 90 / focus.h) : 1;
        const zoom = c.wide || !focus ? 1 : Math.max(1, Math.min(c.zoom ?? 1.35, fit));
        const next = list[i + 1]?.[1].at ?? Infinity;
        const end = Math.min(until ?? Infinity, next - 0.15, at + MAX_FOCUS);
        return { at, until: end, step: c.step, text: c.text, focus, zoom };
    });
}

const DIR = `${import.meta.env.BASE_URL}scenes/`;

export type SiteScene = Scene & { features: readonly number[] };

export const SCENES: readonly SiteScene[] = [
    {
        id: 'lead',
        title: 'Zapytanie od klienta i termin',
        summary: 'Mail od klienta: podpowiedzi usług z cennika, jego historia i dwie porzucone rezerwacje, odpowiedź z poczty CRM. Klient się zgadza, termin w kalendarzu, rezerwacja wypełnia się sama.',
        poster: `${DIR}lead-poster.webp`,
        video: `${DIR}lead`,
        features: [0, 1, 3],
        beats: beats(lead, {
            inbox: { step: 'Zapytanie', text: 'Klient pisze mailem o korektę lakieru i powłokę ceramiczną.', wide: true },
            question: { step: 'Pierwszy kontakt', text: 'Pyta o dwie usługi i o termin 14–15 października.' },
            suggested: { step: 'Podpowiedź', text: 'CRM czyta maila i podsuwa usługi z cennika, od razu z cenami.' },
            warning: { step: 'Uwaga na klienta', text: 'Dwie wcześniejsze rezerwacje porzucone: klient nie przyjechał. Widać to od razu.' },
            history: { step: 'Historia klienta', text: '3 zakończone wizyty i 8 772 zł obrotu.' },
            thread: { step: 'Poczta w CRM', text: 'Odpowiadamy z tej samej rozmowy, z historią klienta na wierzchu.' },
            compose: { step: 'Odpowiedź', text: 'Wycena i godziny przyjęcia auta.' },
            sent: { step: 'Wysłano', text: 'Mail wychodzi z firmowej skrzynki studia.' },
            replied: { step: 'Przebieg sprawy', text: 'Odpowiedź od razu jest w historii zapytania.' },
            consent: { step: 'Klient odpisał', text: 'Potwierdza termin i wycenę. Czas na rezerwację.' },
            accept: { step: 'Wycena', text: 'Podpowiedzi przechodzą do wyceny jednym kliknięciem.' },
            calendar: { step: 'Kalendarz', text: 'Zaznaczasz 14–15 października, auto zostaje na dwa dni.', zoom: 1.15 },
            form: { step: 'Rezerwacja', text: 'Klient, auto z kartoteki i usługi z cenami są już wpisane.', zoom: 1.2 },
            sms: { step: 'SMS', text: 'Potwierdzenie od razu, przypomnienie 24 godziny przed wizytą.' },
            done: { step: 'Gotowe', text: 'Rezerwacja zapisana i widoczna przy zapytaniu klienta.' },
        }),
    },
    {
        id: 'checkin',
        title: 'Przyjęcie auta na tablecie',
        summary: 'Z kalendarza do przyjęcia: depozyt i uwagi na tablecie, zdjęcia telefonem przez kod QR, mapa uszkodzeń, podpis protokołu i zgód marketingowych na tablecie, a potem cała wizyta.',
        poster: `${DIR}checkin-poster.webp`,
        video: `${DIR}checkin`,
        features: [3],
        beats: beats(checkin, {
            calendar: { step: 'Dzień wizyty', text: 'Klient przyjechał. Rezerwacja czeka w kalendarzu.' },
            popover: { step: 'Rezerwacja', text: 'Jedno stuknięcie: „Rozpocznij" i zaczyna się przyjęcie auta.', zoom: 1.2 },
            reservation: { step: 'Przyjęcie', text: 'Klient, auto i usługi przechodzą z rezerwacji. Nic nie wpisujesz drugi raz.' },
            vehicle: { step: 'Pojazd', text: 'Przebieg z licznika wpisany na tablecie.' },
            deposit: { step: 'Depozyt', text: 'Kluczyki i dowód rejestracyjny odnotowane w protokole.' },
            notes: { step: 'Uwagi do protokołu', text: 'Uwagi o stanie auta trafią do protokołu przyjęcia.' },
            qr: { step: 'Kod QR', text: 'Pracownik skanuje kod telefonem i robi zdjęcia auta.' },
            phone: { step: 'Telefon', text: 'Zdjęcie po zdjęciu, prosto z aparatu.', wide: true },
            photos: { step: 'Zdjęcia na tablecie', text: 'Każde zdjęcie z telefonu pojawia się na tablecie, gdy tylko zostanie zrobione.' },
            damage: { step: 'Mapa uszkodzeń', text: 'Każde uszkodzenie to punkt na schemacie auta.', wide: true },
            'damage-notes': { step: 'Opis uszkodzeń', text: 'Do każdego punktu krótki opis: odprysk, rysa, otarcie.' },
            documents: { step: 'Dokumenty do podpisu', text: 'Protokół przyjęcia i zgody marketingowe idą na tablet klienta.', zoom: 1.2 },
            'sign-protocol': { step: 'Podpis protokołu', text: 'Klient czyta protokół z przebiegiem, depozytem i uwagami, i podpisuje palcem.', wide: true },
            'sign-consent': { step: 'Zgody marketingowe', text: 'Zgody na SMS i e-mail podpisane i zapisane w kartotece klienta.', wide: true },
            signed: { step: 'Podpisane', text: 'Oba dokumenty wracają podpisane, wizyta może się zacząć.', zoom: 1.2 },
            visit: { step: 'Wizyta', text: 'Wizyta w toku: status, termin odbioru i auto z logo marki.' },
            'visit-services': { step: 'Usługi', text: 'Usługi z rezerwacji z cenami netto i brutto.' },
            'visit-intake': { step: 'Przyjęcie pojazdu', text: 'Przebieg, kluczyki i dowód rejestracyjny, kto przyjął i kiedy.' },
            'visit-photos': { step: 'Zdjęcia i dokumenty', text: 'Zdjęcia z telefonu, podpisany protokół, zgody marketingowe i mapa uszkodzeń w jednym miejscu.' },
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
        summary: 'Sam zakładasz kategorie i reguły po NIP dostawcy. Faktura z tankowania przychodzi z KSeF, od razu trafia do „Paliwa" i statystyki rosną bez przepisywania.',
        poster: `${DIR}costs-poster.webp`,
        video: `${DIR}costs`,
        features: [2],
        beats: beats(costs, {
            overview: { step: 'Ostatnie 30 dni', text: 'Koszty studia w kategoriach: folie, leasing, chemia, media, narzędzia.', wide: true },
            'new-category': { step: 'Nowa kategoria', text: 'Kategorie zakładasz sam. Tu: Paliwo, z własnym kolorem.', zoom: 1.2 },
            'category-added': { step: 'Kategoria gotowa', text: 'Paliwo jest na liście, jeszcze puste.' },
            'new-rule': { step: 'Reguła po NIP', text: 'NIP ORLEN S.A. ma zawsze oznaczać paliwo. CRM podpowiada dostawców z Twoich faktur.', zoom: 1.2 },
            'rule-added': { step: 'Reguła dodana', text: 'Reguła od razu porządkuje faktury z ORLEN, które już są w CRM.', zoom: 1.2 },
            'rule-row': { step: 'Na stałe', text: 'Każda kolejna faktura z tego NIP-u trafi do Paliwa sama.' },
            'fuel-before': { step: 'Paliwo', text: 'Suma paliwa z ostatnich 30 dni, przed tankowaniem.' },
            station: { step: 'Na stacji', text: 'A teraz tankujesz auto serwisowe.', wide: true },
            receipt: { step: 'Faktura', text: 'ORLEN wystawia fakturę na NIP studia: 404,95 zł.', wide: true },
            ksef: { step: 'KSeF', text: 'Faktura trafia do KSeF. Nikt jej nie wpisuje do CRM.', wide: true },
            refresh: { step: 'Pobranie z KSeF', text: 'DetailBoost pobiera faktury kosztowe z KSeF sam, co 15 minut.', wide: true },
            arrived: { step: 'Już jest', text: 'Faktura ORLEN za 404,95 zł w Dokumentach kosztowych.' },
            'auto-category': { step: 'Paliwo, automatycznie', text: 'Faktura od razu ma kategorię Paliwo. Zadziałała Twoja reguła.' },
            'fuel-after': { step: 'Statystyki rosną', text: 'Paliwo z ostatnich 30 dni urosło o 404,95 zł.' },
            stats: { step: 'Struktura kosztów', text: 'Wykres i udział kategorii są już policzone z nową fakturą.', wide: true },
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
