import { Orientation } from "../model/Position";

/** How empty board points are shown: as dots, or as the lines joining them. */
export type BoardStyle = "dots" | "lines";

/**
 * How stacks are drawn.
 * - `classic` — light/dark discs, the piece type read from concentric rings.
 * - `colored` — a black or white centre inside a coloured border that names the
 *   type: red Tzaar, blue Tzarra, green Tott.
 */
export type PieceStyle = "classic" | "colored";

export interface ViewStyle {
  readonly board: BoardStyle;
  readonly pieces: PieceStyle;
  readonly orientation: Orientation;
}

const DEFAULTS: ViewStyle = {
  board: "dots",
  pieces: "classic",
  orientation: "standard",
};

const STORAGE_KEY = "tzaar.view";

/**
 * Presentation choices that outlive a single render: board and piece styling and
 * the board's orientation. Observable, so the renderer and the move list restyle
 * themselves together, and remembered between visits.
 *
 * This is a view concern only — the rules, the engine and the recorded game are
 * identical whichever way the board is turned.
 */
export class ViewSettings {
  private style: ViewStyle;
  private readonly listeners = new Set<() => void>();

  constructor(initial: ViewStyle = readStored() ?? DEFAULTS) {
    this.style = initial;
  }

  get current(): ViewStyle {
    return this.style;
  }

  get board(): BoardStyle {
    return this.style.board;
  }

  get pieces(): PieceStyle {
    return this.style.pieces;
  }

  get orientation(): Orientation {
    return this.style.orientation;
  }

  update(change: Partial<ViewStyle>): void {
    const next = { ...this.style, ...change };
    if (
      next.board === this.style.board &&
      next.pieces === this.style.pieces &&
      next.orientation === this.style.orientation
    ) {
      return;
    }
    this.style = next;
    store(next);
    for (const listener of this.listeners) listener();
  }

  toggleBoard(): void {
    this.update({ board: this.style.board === "dots" ? "lines" : "dots" });
  }

  togglePieces(): void {
    this.update({ pieces: this.style.pieces === "classic" ? "colored" : "classic" });
  }

  toggleOrientation(): void {
    this.update({
      orientation: this.style.orientation === "standard" ? "littlegolem" : "standard",
    });
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/** Storage is best-effort, and anything unrecognised falls back to a default. */
function readStored(): ViewStyle | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<ViewStyle>;
    return {
      board: parsed.board === "lines" ? "lines" : DEFAULTS.board,
      pieces: parsed.pieces === "colored" ? "colored" : DEFAULTS.pieces,
      orientation: parsed.orientation === "littlegolem" ? "littlegolem" : DEFAULTS.orientation,
    };
  } catch {
    return undefined;
  }
}

function store(style: ViewStyle): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(style));
  } catch {
    // Ignore: the choice simply will not persist across reloads.
  }
}

/** Shared instance: the renderer and the UI read the same presentation. */
export const viewSettings = new ViewSettings();
