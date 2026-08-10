/**
 * User-facing text, one entry per string. Placeholders are written `{name}` and
 * filled in by `i18n.t`.
 *
 * Polish is the reference catalogue: its keys define `MessageKey`, so a missing
 * or misspelled English entry is a compile error rather than a blank label.
 */
const PL = {
  "app.title": "TZAAR — Analiza partii",
  "app.loadError": "Nie udało się wczytać partii: {message}",

  "sidebar.moves": "Ruchy",
  "sidebar.info": "Informacje",

  "toolbar.open": "Otwórz plik",
  "toolbar.reset": "Reset",
  "toolbar.first.title": "Pierwszy ruch (Home)",
  "toolbar.previous.title": "Poprzedni ruch (←)",
  "toolbar.next.title": "Następny ruch (→)",
  "toolbar.last.title": "Ostatni ruch (End)",
  "toolbar.finish": "Pass",
  "toolbar.finish.title": "Zakończ turę na samym biciu, bez drugiej akcji",
  "toolbar.cancel": "Cofnij akcję",
  "toolbar.cancel.title": "Anuluj rozpoczętą turę (Esc)",
  "toolbar.leave": "Wróć do partii",
  "toolbar.leave.title": "Wróć na główną linię",
  "toolbar.delete": "Usuń wariant",
  "toolbar.delete.title": "Usuń aktywny wariant",

  "hint.openFile": "Otwórz plik z zapisem partii, aby zacząć analizę",
  "hint.second": "{side}: druga akcja (bicie lub stos) albo „Zakończ ruch”",
  "hint.openingTurn": "{side}: kliknij pionek, aby zagrać wariant (pierwsza tura to jedno bicie)",
  "hint.capture": "{side}: kliknij pionek, aby zagrać wariant (najpierw bicie)",

  "color.white": "Biały",
  "color.black": "Czarny",

  "variant.name": "Wariant {id}",
  "variant.new": "Nowy wariant",
  "variant.from.title": "Wariant od ruchu {turn} (po {plies} półruchach)",
  "variant.delete.title": "Usuń wariant",
  "variant.pending.title": "Ruch w trakcie — dokończ go lub zakończ na samym biciu",

  "info.event": "Wydarzenie",
  "info.white": "Biały (W)",
  "info.black": "Czarny (B)",
  "info.setup": "Wariant startowy",
  "info.line": "Linia",
  "info.moveNumber": "Numer ruchu",
  "info.movesPlayed": "Wykonane ruchy",
  "info.lastMove": "Ostatni ruch",
  "info.player": "Gracz",
  "info.toMove": "Na ruchu",
  "info.mainLine": "partia (linia główna)",
  "info.variantLine": "Wariant {id} (od {plies}. półruchu)",
  "info.startPosition": "pozycja startowa",
  "info.inVariant": "{count} w wariancie",
  "info.inProgress": "{notation}… (w trakcie)",
  "info.gameOver": "koniec partii",
  "info.noGame": "Nie wczytano żadnej partii",
  "info.none": "—",

  "view.board.dots": "Kropki",
  "view.board.lines": "Linie",
  "view.board.toLines": "Pokaż pola planszy jako linie",
  "view.board.toDots": "Pokaż pola planszy jako kropki",
  "view.pieces.classic": "Klasyczne",
  "view.pieces.colored": "Kolorowe",
  "view.pieces.toColored":
    "Kolorowe pionki: obwódka według typu (Tzaar czerwony, Tzarra niebieski, Tott zielony)",
  "view.pieces.toClassic": "Klasyczne pionki: typ oznaczony pierścieniami",
  "view.orientation.standard": "Standard",
  "view.orientation.littlegolem": "LittleGolem",
  "view.orientation.toLittleGolem": "Obróć planszę do układu LittleGolem",
  "view.orientation.toStandard": "Wróć do układu standardowego (kolumny A–I)",

  "lang.code": "PL",
  "lang.switch.title": "Przełącz język na angielski",
} as const;

export type MessageKey = keyof typeof PL;

const EN: Record<MessageKey, string> = {
  "app.title": "TZAAR — Game analysis",
  "app.loadError": "Could not load the game: {message}",

  "sidebar.moves": "Moves",
  "sidebar.info": "Information",

  "toolbar.open": "Open file",
  "toolbar.reset": "Reset",
  "toolbar.first.title": "First move (Home)",
  "toolbar.previous.title": "Previous move (←)",
  "toolbar.next.title": "Next move (→)",
  "toolbar.last.title": "Last move (End)",
  "toolbar.finish": "Pass",
  "toolbar.finish.title": "End the turn on the capture alone, without a second action",
  "toolbar.cancel": "Undo action",
  "toolbar.cancel.title": "Cancel the turn in progress (Esc)",
  "toolbar.leave": "Back to game",
  "toolbar.leave.title": "Return to the main line",
  "toolbar.delete": "Delete variant",
  "toolbar.delete.title": "Delete the active variant",

  "hint.openFile": "Open a game record to start analysing",
  "hint.second": "{side}: second action (capture or stack), or “End turn”",
  "hint.openingTurn": "{side}: click a piece to play a variant (the opening turn is a single capture)",
  "hint.capture": "{side}: click a piece to play a variant (capture first)",

  "color.white": "White",
  "color.black": "Black",

  "variant.name": "Variant {id}",
  "variant.new": "New variant",
  "variant.from.title": "Variant from move {turn} (after {plies} plies)",
  "variant.delete.title": "Delete variant",
  "variant.pending.title": "Turn in progress — complete it or end on the capture alone",

  "info.event": "Event",
  "info.white": "White (W)",
  "info.black": "Black (B)",
  "info.setup": "Setup variant",
  "info.line": "Line",
  "info.moveNumber": "Move number",
  "info.movesPlayed": "Moves played",
  "info.lastMove": "Last move",
  "info.player": "Player",
  "info.toMove": "To move",
  "info.mainLine": "game (main line)",
  "info.variantLine": "Variant {id} (from ply {plies})",
  "info.startPosition": "starting position",
  "info.inVariant": "{count} in variant",
  "info.inProgress": "{notation}… (in progress)",
  "info.gameOver": "game over",
  "info.noGame": "No game loaded",
  "info.none": "—",

  "view.board.dots": "Dots",
  "view.board.lines": "Lines",
  "view.board.toLines": "Show board spaces as lines",
  "view.board.toDots": "Show board spaces as dots",
  "view.pieces.classic": "Classic",
  "view.pieces.colored": "Colored",
  "view.pieces.toColored":
    "Colored pieces: border by type (Tzaar red, Tzarra blue, Tott green)",
  "view.pieces.toClassic": "Classic pieces: type marked with rings",
  "view.orientation.standard": "Standard",
  "view.orientation.littlegolem": "LittleGolem",
  "view.orientation.toLittleGolem": "Turn the board to the LittleGolem layout",
  "view.orientation.toStandard": "Back to the standard layout (columns A–I)",

  "lang.code": "EN",
  "lang.switch.title": "Switch language to Polish",
};

export type Language = "pl" | "en";

export const MESSAGES: Readonly<Record<Language, Record<MessageKey, string>>> = {
  pl: PL,
  en: EN,
};

export const LANGUAGES: readonly Language[] = ["pl", "en"];
