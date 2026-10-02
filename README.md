# detailboost-webpage

Strona główna DetailBoost, CRM dla studiów auto detailingu. Na razie jeden ekran:
pasek nawigacji i sekcja Hero z oknem aplikacji, w którym lecą trzy nagrania z CRM.

React 19, Tailwind CSS 4, Vite 8, TypeScript. Kroje: Geist i Geist Mono (zmienne,
hostowane lokalnie przez `@fontsource-variable`, z polskimi znakami).

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build do dist/
```

## Projekt

- **Ciemna scena, jeden kolor.** Czerń, grafit, szarości i złoto z logo DetailBoost.
  Złoto niesie wyłącznie światło i postęp: poświatę pod oknem, drugą linię nagłówka,
  paski rozdziałów i linię nad korzyścią, o której jest bieżące nagranie.
- **Zero ikon.** Hierarchię niesie krój, grubość, interlinia i siatka. Numeracja
  `01.`–`04.` stoi w osobnej kolumnie przed tekstem, dane techniczne w Geist Mono,
  menu na telefonie otwiera słowo „Menu".
- **Ruchome tło** (`DotField`): stała siatka kropek, przez którą wędrują dwie fale
  światła. Rusza się jasność, nie kropki. 30 kl./s, staje poza ekranem i w tle karty.
- **Okno 3D** (`Stage3D`): pochylone o 17° (10° na telefonie) z osią na górnej
  krawędzi, prostuje się w trakcie przewijania. Parametry wzięte z fotohub.app.
- **Siatka 1 / okno / 1** od 1280 px. Kolumny boczne dzielą wiersze z siatką
  (subgrid), więc bloki po obu stronach zaczynają się na tej samej wysokości.
- **`prefers-reduced-motion`**: tło stoi, okno jest płaskie, nagrania nie ruszają same.
  Kliknięcie rozdziału uruchamia nagranie.

## Nagrania z aplikacji

`public/scenes/` to prawdziwe nagrania działającego CRM na koncie demonstracyjnym
(`POST /api/v1/demo`), a nie makiety ani animowane zrzuty. Nad nagraniem leży warstwa
„motion" (`SceneOverlay`): podpis kroku, złota ramka na tym, o czym mowa, i kamera,
która przybliża kadr. Czasy kroków i obszary ramek zapisuje skrypt nagrania
(`src/scenes/*.timing.json`) z prawdziwego położenia elementów, podpisy są
w `src/scenes/index.tsx`.

| Scena | Co widać |
|---|---|
| `lead` | mail klienta z pytaniem o usługę i termin, usługi podsunięte z cennika, nasza odpowiedź z wyceną, zgoda klienta, historia klienta; termin zaznaczony w kalendarzu, rezerwacja wypełniona z leada, SMS-y potwierdzenia i przypomnienia |
| `handover` | „Oznacz jako gotowe" z SMS-em, protokół wydania wysłany do podpisu, strona podpisu na telefonie klienta (dokument, oświadczenie, podpis palcem), podpis wraca do wydania, faktura VAT z „Wyślij fakturę do KSeF", faktura „W KSeF" z numerem i kodem QR |
| `costs` | animacja (`InvoiceJourney`): kontrahent wystawia fakturę → KSeF → CRM → reguła po NIP; potem nagranie: faktura w „Dokumentach kosztowych", reguły dopasowania, przypisanie silnikiem reguł, koszty 12 miesięcy w kategoriach |
| `instagram` | alert na Tablicy o nowej kampanii w okolicy, reklamodawcy w okolicy, kalendarz reklam, szczegóły kampanii i treść reklamy, tydzień u obserwowanych profili |

Logo marki w nagłówku wizyty i leada to prawdziwe logo z CDN, z którego korzysta CRM
(`car-logos-dataset` na jsDelivr). Podpis protokołu wymaga S3 - lokalnie stoi moto
(`moto_server -p 9000`, kubeł `detailboost-crm`).

### Co jest dosiewane do bazy i dlaczego

Lokalny backend nie ma kluczy do usług zewnętrznych, więc część danych, które
w produkcji przychodzą z zewnątrz, wpisuje `capture/seed.mjs`. Interfejs, który je
rysuje, jest w każdym kadrze prawdziwy.

- **Wątek mailowy leada** (pytanie, odpowiedź, zgoda): w produkcji przychodzi z IMAP.
  Zapisujemy go tam, gdzie zapisuje go synchronizacja skrzynki.
- **Sugestie usług na leadzie**: w produkcji dobiera je model językowy z treści maila,
  wybierając pozycje cennika. Wpisujemy dokładnie takie wiersze.
- **Przyjęcie faktury przez KSeF**: zaślepka SDK KSeF (`-PksefStub`) odkłada fakturę do
  kolejki offline24; status `ACCEPTED` i numer KSeF wpisujemy w bazie.
- **Faktury kosztowe**: w produkcji pobiera je z KSeF synchronizacja co 15 minut.
  Wpisujemy pół roku faktur od FIKCYJNYCH dostawców (NIP-y przechodzą tylko test sumy
  kontrolnej). Kategorie przypisuje prawdziwy silnik reguł (`auto-rules/apply`).
- **Instagram i reklamy konkurencji**: w produkcji ze scrapera i Biblioteki Reklam Meta.
- **Konfiguracja studia**: plan FULL, reguły i kredyty SMS, dane firmy, token KSeF,
  zadania na Tablicy - to, co właściciel ustawia sam w Ustawieniach.

### Ponowne nagranie

1. Backend: `./gradlew bootRun -PksefStub` w `automotive-crm-v2-backend`. Wymaga
   Postgresa z `pgvector` i Redisa. Bez klucza OpenAI trzeba podać dowolny
   `SPRING_AI_OPENAI_API_KEY`, a do zakładki Reklamy dowolny `META_ADS_LIBRARY_TOKEN`.
   Do podpisu protokołu: `S3_ENDPOINT=http://localhost:9000` (moto), dowolne
   `S3_ACCESS_KEY`/`S3_SECRET_KEY`, `COMMUNICATION_WHITELIST_ENABLED=false`
   i `--smsapi.enabled=false` (SMS z linkiem trafia tylko do logu).
   Synchronizacje Instagrama i Mety wyłącz flagami
   `--instagram.sync.enabled=false --instagram.daily-sync.enabled=false
   --meta.ads.sync.enabled=false --meta.ads.discovery.enabled=false`.
2. Front CRM: `npm run dev` w `detailing-crm-v2` pod `http://localhost:5173`. Musi to
   być `localhost`, bo CORS backendu nie wpuszcza `127.0.0.1`.
3. Tutaj (potrzebne `ffmpeg` z libx264 i libvpx oraz `psql` przez `sudo -u postgres`):

```sh
node capture/run.mjs lead    # albo handover, costs, instagram
ENCODE_ONLY=1 node capture/run.mjs lead   # tylko kodowanie z zapisanych klatek
```

Nagrywanie idzie przez screencast Chrome (CDP), nie `recordVideo` Playwrighta, które
koduje VP8 z bitrate ok. 1 Mbit/s i rozmywa drobny tekst. Kursor to pierścień
rysowany w stronie (Chrome bez okna nie ma kursora). Białe klatki ładowania widoków
recorder wycina, a scena jest przyspieszana (`speed`), żeby zmieścić się w ok. 30 s.
Strona podpisu jest nagrywana w oknie telefonu (390 × 844) i wstawiana w ramkę telefonu
na rozmytym ekranie studia.
