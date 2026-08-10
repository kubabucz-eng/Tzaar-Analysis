# TZAAR — Analiza partii

Aplikacja web (TypeScript + Vite) do przeglądania i analizy zapisanych partii
gry **TZAAR** w formacie SGF‑podobnym używanym przez LittleGolem.

Wczytuje plik partii, rekonstruuje planszę z pola `POS`, odtwarza wszystkie ruchy
i pozwala nawigować po historii (bicia, dokładanie stosów, cofanie/ponawianie),
renderując prawdziwą sześciokątną planszę TZAAR.

---

## Uruchomienie

Wymagany **Node.js 18+**.

```bash
npm install      # instalacja zależności
npm run dev      # tryb deweloperski (http://localhost:5173)
npm run build    # produkcyjny build do dist/ (poprzedzony kontrolą typów)
npm run preview  # podgląd builda produkcyjnego
npm test         # testy parsera i silnika (Vitest)
npm run typecheck
```

Po `npm run dev` aplikacja startuje z **wczytaną przykładową partią**
(`Games/game2552914.txt`), więc od razu można klikać po ruchach.

---

## Obsługa

| Akcja | Sposób |
|---|---|
| Otwórz plik | przycisk **Otwórz plik** (`.txt`, `.sgf`, `.tzaar`) |
| Reset | przycisk **Reset** (powrót do pozycji startowej) |
| Nawigacja | `«` `‹` `›` `»` w pasku narzędzi |
| Klawiatura | `←` poprzedni, `→` następny, `Home` pierwszy, `End` ostatni |
| Skok do ruchu | kliknięcie ruchu na liście po lewej |

Aktualny ruch jest podświetlony na liście, a na planszy zaznaczane są pola
`from` (niebieski) i `to` (żółty) ostatniego ruchu.

### Odczyt planszy

- **Kolor** — jasne pionki = Biały, ciemne = Czarny.
- **Typ pionka** — pierścienie: `Tott` (0), `Tzarra` (1), `Tzaar` (2).
- **Wysokość stosu** — liczba na pionku (gdy > 1).

---

## Format pliku

```text
(;FF[TZAAR]VA[RANDOM]EV[tzaar.ch.43.1.1]
 PB[czarny]PW[biały]
 POS[cBbC...AB]
 SO[https://www.littlegolem.net]
 ;W[npmq];B[prqq-kplp];W[smrn-pqqp]...)
```

Parser odczytuje: nazwę gry (`FF`), wariant (`VA`), wydarzenie (`EV`),
gracza białego (`PW`) i czarnego (`PB`), pozycję startową (`POS`), źródło (`SO`)
oraz wszystkie ruchy z zachowaniem kolejności i koloru.

### Model planszy i współrzędnych

Plansza to sześciokąt projektu GIPF w współrzędnych osiowych `(x, y)`:
`|x| ≤ 4`, `|y| ≤ 4`, `|x + y| ≤ 4` → 61 punktów; środek `(0,0)` to „dziura”,
więc gra się na **60 punktach**.

- Litery `k…s` kodują wartości `-4…+4` (`o` = środek `0`). Współrzędna `np`
  oznacza `(x=-1, y=1)`.
- **`POS`** to 60 znaków w kolejności kolumnami (`x` od −4 do +4), w kolumnie
  `y` rosnąco, z pominięciem środka. Małe litery = Biały, wielkie = Czarny.
- Typy: `a/A` = Tzaar (6), `b/B` = Tzarra (9), `c/C` = Tott (15) — na gracza.

### Ruchy

Tura to jeden lub dwa człony rozdzielone `-` (np. `prqq-kplp`); każdy człon to
`from` + `to` (po 2 litery). Pierwsza tura partii to pojedyncze bicie.
Silnik rozpoznaje człon jako **bicie** (pole docelowe zajęte przez przeciwnika)
lub **dokładanie stosu** (pole zajęte przez własny pionek — wysokości się sumują,
typ = typ pionka wykonującego ruch).

---

## Architektura

Warstwy są rozdzielone — renderer nie zna parsera, UI nie zna zasad gry:

```
src/
  parser/GameParser.ts     # tekst  -> model Game (bez zależności od UI)
  model/
    Position.ts            # geometria planszy, kodowanie współrzędnych
    Piece.ts               # Color, PieceType, mapowanie znaków
    Stack.ts               # niemutowalny stos
    Board.ts               # niemutowalny stan planszy (POS -> Board)
    Move.ts                # tura + parsowanie notacji
    Game.ts                # metadane + POS + ruchy
  engine/
    Rules.ts               # czyste zasady: bicie/dokładanie, legalne ruchy
    GameEngine.ts          # nawigacja, cache stanów, cofanie/ponawianie, obserwatorzy
  renderer/BoardRenderer.ts# rysowanie planszy na canvas (skalowanie do okna)
  ui/
    Toolbar.ts             # pasek narzędzi
    MoveList.ts            # lista ruchów
    InfoPanel.ts           # panel informacji
  app/App.ts               # spięcie warstw (composition root)
  main.ts                  # punkt wejścia
```

**Przepływ danych:** `GameParser → Game → GameEngine → (BoardRenderer + UI)`.

Stan planszy jest odtwarzany z historii ruchów: `GameEngine` przy wczytaniu
buduje raz komplet niemutowalnych migawek (cache stanów), dzięki czemu skok,
krok oraz cofanie/ponawianie są O(1).

---

## Rozszerzalność

Architektura jest przygotowana pod dalszy rozwój bez naruszania warstw:

- **Animacje ruchów** — `BoardRenderer` liczy pozycje pikselowe punktów;
  wystarczy interpolować `from → to`.
- **Analiza wariantów / komentarze** — `Game`/`Move` można wzbogacić o drzewo
  wariantów i pole komentarza; `GameEngine` operuje już na liście ruchów.
- **Podświetlanie legalnych ruchów / silnik AI** — `Rules.legalMoves()`
  i `Rules.reachableTargets()` są gotowe do użycia.
- **Obracanie planszy / eksport pozycji** — geometria i `Board` są niemutowalne
  i odseparowane od renderera.

---

## Testy

- `tests/parser.test.ts` — metadane, `POS`, kolejność i kolory ruchów, człony.
- `tests/engine.test.ts` — dekodowanie `POS`, spis pionków (15/9/6),
  bicie i dokładanie, pełne odtworzenie partii, nawigacja i cofanie.
```bash
npm test
```
