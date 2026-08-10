import { Move } from "./Move";

/** Metadata parsed from the SGF-like header. */
export interface GameMeta {
  readonly format: string;
  readonly variant: string;
  readonly event: string;
  readonly playerWhite: string;
  readonly playerBlack: string;
  readonly source: string;
}

/** A fully parsed game: metadata, the initial POS string, and the move list. */
export class Game {
  readonly meta: GameMeta;
  readonly initialPosition: string;
  readonly moves: readonly Move[];

  constructor(meta: GameMeta, initialPosition: string, moves: readonly Move[]) {
    this.meta = meta;
    this.initialPosition = initialPosition;
    this.moves = moves;
  }
}
