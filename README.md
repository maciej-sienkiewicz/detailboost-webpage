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
(`POST /api/v1/demo`), a nie makiety ani animowane zrzuty:

| Scena | Co widać |
|---|---|
| `reservation` | zapytanie od stałego klienta: jego wizyty, obrót i ostatnia wizyta, usługi podsunięte z cennika, rezerwacja wypełniona sama (klient, auto z kartoteki, ceny), SMS-y potwierdzenia i przypomnienia |
| `ksef` | „Oznacz jako gotowe" z powiadomieniem klienta, wydanie auta z fakturą VAT i „Wyślij fakturę do KSeF", faktura w Finansach ze statusem „W KSeF", numerem KSeF i kodem QR |
| `instagram` | alert na Tablicy o nowej kampanii w okolicy, reklamy konkurencji (plakietka „Nowa kampania", kalendarz kampanii), szczegóły kampanii i tydzień u obserwowanych profili |

Każda scena to VP9/WebM i H.264/MP4 (ok. 0,7–1,1 MB, przeglądarka pobiera jeden),
plakat WebP i odtwarzanie dopiero, gdy przyjdzie jej kolej.

### Co jest dosiewane do bazy i dlaczego

Lokalny backend nie ma kluczy do usług zewnętrznych, więc część danych, które
w produkcji przychodzą z zewnątrz, wpisuje `capture/seed.mjs`. Interfejs, który je
rysuje, jest w każdym kadrze prawdziwy.

- **Sugestie usług na leadzie**: w produkcji dobiera je model językowy z treści
  zapytania, wybierając pozycje cennika. Wpisujemy dokładnie takie wiersze: dwie
  pozycje z cennika z ceną z cennika. Sekcję „Klient" liczy backend z prawdziwych wizyt.
- **Przyjęcie faktury przez KSeF**: backend chodzi z zaślepką SDK KSeF
  (`-PksefStub`), która odkłada fakturę do kolejki offline24. Po wydaniu auta
  nagranie robi cięcie, status `ACCEPTED` i numer KSeF wpisujemy w bazie, a dalej
  Finanse pokazują je same.
- **Instagram i reklamy konkurencji**: w produkcji przychodzą ze scrapera (RapidAPI)
  i z Biblioteki Reklam Meta. Wpisujemy konkurenta, jego posty (jeden z promocją
  −30%), kampanię i reklamodawcę z okolicy.
- **Konfiguracja studia**: plan FULL (konto demo ma BASIC bez SMS), reguły SMS,
  kredyty SMS, dane firmy, token KSeF, kilka zadań na Tablicy. To jest to, co
  właściciel ustawia sam w Ustawieniach. Reguły SMS, dane firmy, token i zadania
  idą przez API, tą samą drogą co ekrany ustawień.
- **Tytuł jednej wizyty demo** jest poprawiony („Porsche Cayenne" na Toyocie Camry,
  błąd w `DemoDataInitializer.kt`).

### Ponowne nagranie

1. Backend: `./gradlew bootRun -PksefStub` w `automotive-crm-v2-backend`. Wymaga
   Postgresa z `pgvector` i Redisa. Bez klucza OpenAI trzeba podać dowolny
   `SPRING_AI_OPENAI_API_KEY`, a do zakładki Reklamy dowolny `META_ADS_LIBRARY_TOKEN`.
   Synchronizacje Instagrama i Mety wyłącz flagami
   `--instagram.sync.enabled=false --instagram.daily-sync.enabled=false
   --meta.ads.sync.enabled=false --meta.ads.discovery.enabled=false`.
2. Front CRM: `npm run dev` w `detailing-crm-v2` pod `http://localhost:5173`. Musi to
   być `localhost`, bo CORS backendu nie wpuszcza `127.0.0.1`.
3. Tutaj (potrzebne `ffmpeg` z libx264 i libvpx oraz `psql` przez `sudo -u postgres`):

```sh
node capture/run.mjs reservation    # albo ksef, instagram
ENCODE_ONLY=1 node capture/run.mjs reservation   # tylko kodowanie z zapisanych klatek
```

Nagrywanie idzie przez screencast Chrome (CDP), nie `recordVideo` Playwrighta, które
koduje VP8 z bitrate ok. 1 Mbit/s i rozmywa drobny tekst. Kursor to pierścień
rysowany w stronie (Chrome bez okna nie ma kursora). Białe klatki ładowania widoków
recorder wycina, a scena jest przyspieszana (`speed`), żeby zmieścić się w 17–22 s.
