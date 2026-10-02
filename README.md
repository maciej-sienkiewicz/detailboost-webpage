# detailboost-webpage

Strona główna DetailBoost, CRM dla studiów auto detailingu. Na razie jeden ekran:
pasek nawigacji i sekcja Hero z oknem aplikacji, w którym lecą trzy nagrania z CRM.

React 19, Tailwind CSS 4, Vite 8, TypeScript. Kroje: Geist i Geist Mono, w pasku
nawigacji Inter, a do napisów wokół okna i znaku słownego Archivo ze zmienną szerokością
(wszystkie zmienne, hostowane lokalnie przez `@fontsource-variable`, z polskimi znakami).

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build do dist/
```

## Projekt

- **Ciemna scena, jeden kolor.** Czerń, grafit, szarości i złoto z logo DetailBoost.
  Złoto niesie wyłącznie światło i postęp: poświatę pod oknem, drugą linię nagłówka,
  paski rozdziałów i napis kroku, który właśnie leci w oknie.
- **Zero ikon.** Hierarchię niesie krój, grubość, interlinia i siatka. Dane techniczne
  w Geist Mono, menu na telefonie otwiera słowo „Menu".
- **Napisy wysypane wokół okna** (`FeatureSpill`): same nazwy funkcji, wersalikami
  w ściśniętym Archivo, część z obrysem. Wylatują z punktu nad oknem jak z wiaderka
  (parabola, obrót wytracany w locie, odbicie) i lądują krzywo na marginesach przy
  oknie, a poniżej 1280 px - na stosie pod oknem. Każdy napis to krok jednego nagrania:
  kliknięcie przewija okno do tego kroku (i zdejmuje pauzę), a gdy nikt nie klika,
  złotem świeci napis kroku, który właśnie leci. Napisy tego samego nagrania jaśnieją
  o stopień. Mapa napis → nagranie i krok jest w `Hero.tsx` (`FEATURES`).
- **Pasek nawigacji** (`Navbar`) w stylu fotohub.app: Inter 14 px, narożniki 6–8 px,
  dwa białe przyciski (główny z jasną krawędzią i złotą poświatą), znak słowny
  „DETAIL BOOST" w rozszerzonym Archivo. Nad górą strony przezroczysty, po przewinięciu
  niższy, z ciemnym gradientem, rozmyciem i cieniem; nad nim pasek postępu przewijania.
- **Ruchome tło** (`DotField`): siatka kropek z wędrującą poświatą. Co 6,5 s spod
  okna rozchodzi się fala: kropki na jej grzbiecie rosną, jaśnieją i odsuwają się
  o parę pikseli. Kursor rozsuwa kropki wokół siebie, a kliknięcie puszcza falę spod
  palca. 60 kl./s przy myszy, 30 na dotyku. Staje poza ekranem i w tle karty.
- **Okno 3D** (`Stage3D`): pochylone o 17° (10° na telefonie) z osią na górnej
  krawędzi, prostuje się w trakcie przewijania. Parametry wzięte z fotohub.app.
- **Siatka margines / okno / margines** od 1280 px. Napisy stoją w marginesach
  w procentach kolumny, część celowo zachodzi na krawędź okna.
- **`prefers-reduced-motion`**: tło stoi, okno jest płaskie, napisy leżą od razu na
  miejscu, nagrania nie ruszają same. Kliknięcie rozdziału albo napisu uruchamia nagranie.

## Nagrania z aplikacji

`public/scenes/` to prawdziwe nagrania działającego CRM na koncie demonstracyjnym
(`POST /api/v1/demo`), a nie makiety ani animowane zrzuty. Nad nagraniem leży warstwa
„motion" (`SceneOverlay`): podpis kroku, złota ramka na tym, o czym mowa, i kamera,
która przybliża kadr. Czasy kroków i obszary ramek zapisuje skrypt nagrania
(`src/scenes/*.timing.json`) z prawdziwego położenia elementów, podpisy są
w `src/scenes/index.tsx`.

| Scena | Co widać |
|---|---|
| `lead` | lead tylko z pierwszym mailem klienta: podpowiedzi usług z cennika, historia klienta i ostrzeżenie „2 odwołane rezerwacje”, odpowiedź wysłana z poczty CRM (lokalny SMTP); potem klient odpisuje, wycena, termin w kalendarzu, rezerwacja wypełniona z leada, SMS-y |
| `checkin` | przyjęcie na tablecie: kalendarz → rezerwacja → „ROZPOCZNIJ”, przebieg, depozyt, uwagi; zdjęcia telefonem przez kod QR wpadające na tablet jedno po drugim; mapa uszkodzeń; dokumenty wysłane na sparowany tablet i podpisane przez klienta (tablet pionowo); na koniec wizyta sekcja po sekcji |
| `handover` | „Oznacz jako gotowe" z SMS-em, protokół wydania wysłany do podpisu, strona podpisu na telefonie klienta (dokument, oświadczenie, podpis palcem), podpis wraca do wydania, faktura VAT z „Wyślij fakturę do KSeF", faktura „W KSeF" z numerem i kodem QR |
| `costs` | koszty z 30 dni w kategoriach; właściciel zakłada kategorię „Paliwo” i regułę „NIP ORLEN → Paliwo” (z podpowiedzią dostawcy), reguła porządkuje stare faktury; cięcie na stację (`capture/anim/fuel.html`: terminal drukuje fakturę ORLEN, stempel KSeF); faktura przychodzi do „Dokumentów kosztowych”, sama dostaje „Paliwo”, rosną suma kategorii i wykres |
| `instagram` | alert na Tablicy o nowej kampanii w okolicy, reklamodawcy w okolicy, kalendarz reklam, szczegóły kampanii i treść reklamy, tydzień u obserwowanych profili |

Pod oknem jest sterowanie: „Wstecz", „Pauza"/„Odtwórz", „Dalej" - krokiem jest fragment
nagrania z jednym podpisem; na pierwszym i ostatnim kroku przyciski przechodzą do
poprzedniego i następnego nagrania. Ramka kroku gaśnie przy pierwszym kliknięciu poza nią,
przewinięciu albo cięciu (czas z nagrania), najpóźniej po 3,6 s.

Aplikacja tabletowa do podpisu („DetailBoost Tablet") nie jest w repozytoriach CRM, więc
w scenie `checkin` klient podpisuje dokumenty na stronie podpisu (`/sign/:token`) otwartej
na tym samym tablecie - z tą samą treścią dokumentów.

Logo marki w nagłówku wizyty i leada to prawdziwe logo z CDN, z którego korzysta CRM
(`car-logos-dataset` na jsDelivr). Podpis protokołu wymaga S3 - lokalnie stoi moto
(`moto_server -p 9000`, kubeł `detailboost-crm`).

### Co jest dosiewane do bazy i dlaczego

Lokalny backend nie ma kluczy do usług zewnętrznych, więc część danych, które
w produkcji przychodzą z zewnątrz, wpisuje `capture/seed.mjs`. Interfejs, który je
rysuje, jest w każdym kadrze prawdziwy.

- **Maile klienta w leadzie** (pytanie i zgoda): w produkcji przychodzą z IMAP. Zapisujemy
  je tam, gdzie zapisuje je synchronizacja. Naszą odpowiedź wysyła w nagraniu prawdziwa
  poczta CRM przez lokalny serwer SMTP (`python -m aiosmtpd -n -l localhost:1025`).
- **Dwie porzucone rezerwacje klienta** (wiosna, lato) - z nich CRM liczy ostrzeżenie na leadzie.
- **Podpis na tablecie**: dokumenty idą na sparowany tablet przyciskiem CRM; aplikacji
  tabletu nie ma w repozytoriach, więc te same prośby (kanał przestawiony na link,
  bez przypięcia do urządzenia) podpisujemy na stronie podpisu otwartej pionowo.
- **Sugestie usług na leadzie**: w produkcji dobiera je model językowy z treści maila,
  wybierając pozycje cennika. Wpisujemy dokładnie takie wiersze.
- **Przyjęcie faktury przez KSeF**: zaślepka SDK KSeF (`-PksefStub`) odkłada fakturę do
  kolejki offline24; status `ACCEPTED` i numer KSeF wpisujemy w bazie.
- **Faktury kosztowe**: w produkcji pobiera je z KSeF synchronizacja co 15 minut.
  Wpisujemy pół roku faktur od FIKCYJNYCH dostawców (NIP-y przechodzą tylko test sumy
  kontrolnej), gęsto w ostatnich 30 dniach. Wyjątek to paliwo: ORLEN S.A. z publicznym
  NIP-em, bo o tankowaniu na ORLEN jest scena; numery faktur są zmyślone. Kategorie
  przypisuje prawdziwy silnik reguł (`auto-rules/apply`) - przy pobraniu z KSeF robi to
  `FetchKsefInvoicesHandler`, lokalnie wołamy endpoint zaraz po wpisaniu faktury.
- **Tankowanie na stacji** nie dzieje się w CRM, więc jest animacją HTML
  (`capture/anim/fuel.html`) nagrywaną tym samym screencastem - w filmie to zwykłe
  cięcie. Kwoty na wydruku są tymi samymi, które potem widać w CRM.
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
node capture/run.mjs lead    # albo checkin, handover, costs, instagram
ENCODE_ONLY=1 node capture/run.mjs lead   # tylko kodowanie z zapisanych klatek
```

Nagrywanie idzie przez screencast Chrome (CDP), nie `recordVideo` Playwrighta, które
koduje VP8 z bitrate ok. 1 Mbit/s i rozmywa drobny tekst. Kursor to pierścień
rysowany w stronie (Chrome bez okna nie ma kursora). Białe klatki ładowania widoków
recorder wycina, a scena jest przyspieszana (`speed`), żeby zmieścić się w ok. 30 s.
Strona podpisu jest nagrywana w oknie telefonu (390 × 844) i wstawiana w ramkę telefonu
na rozmytym ekranie studia.
