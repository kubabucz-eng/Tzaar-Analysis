import { Board } from "./Board";
import { Move } from "./Move";

/**
 * An alternative line branching off the main game after `startIndex` plies.
 *
 * Like the engine's main-line cache a variant stores the board after each of its
 * moves — `boardAt(0)` is the branch point itself — so navigating inside a
 * variant is O(1) and every snapshot can be shared safely.
 */
export class Variant {
  readonly id: number;
  /** Number of main-line plies applied before this variant starts. */
  readonly startIndex: number;

  private readonly line: Move[] = [];
  private readonly states: Board[];

  constructor(id: number, startIndex: number, root: Board) {
    this.id = id;
    this.startIndex = startIndex;
    this.states = [root];
  }

  get moves(): readonly Move[] {
    return this.line;
  }

  get length(): number {
    return this.line.length;
  }

  boardAt(index: number): Board {
    return this.states[Math.max(0, Math.min(index, this.length))];
  }

  /** Absolute (game-wide) ply number of the move stored at `index`. */
  plyOf(index: number): number {
    return this.startIndex + index;
  }

  append(move: Move, board: Board): void {
    this.line.push(move);
    this.states.push(board);
  }

  /** Drop everything after the first `length` moves. */
  truncate(length: number): void {
    const kept = Math.max(0, Math.min(length, this.line.length));
    this.line.length = kept;
    this.states.length = kept + 1;
  }
}
