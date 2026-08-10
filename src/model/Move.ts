import { Color } from "./Piece";
import { Position } from "./Position";

/** A single action within a turn: a stack moving from one point to another. */
export interface MovePart {
  readonly from: Position;
  readonly to: Position;
}

/** One action written as origin+destination, e.g. "E6D6". */
export function formatPart(part: MovePart): string {
  return `${part.from.label}${part.to.label}`;
}

/** The actions of a turn joined the way a record writes them. */
export function formatParts(parts: readonly MovePart[]): string {
  return parts.map(formatPart).join("-");
}

/** Records write this instead of coordinates when a player declines an action. */
export const PASS = "pass";

/**
 * One recorded turn (ply) by a single player. A turn is one or two parts:
 * the mandatory capture, optionally followed by a second capture or a stack.
 * The very first turn of the game is a single capture.
 *
 * Declining the optional second action is recorded as "pass" (e.g.
 * "osoq-pass"). That is not a board action, so it produces no `MovePart`; the
 * turn simply carries `passed`.
 */
export class Move {
  readonly color: Color;
  readonly parts: readonly MovePart[];
  /** Raw notation as recorded, e.g. "prqq-kplp". */
  readonly notation: string;
  /** Zero-based ply index in the game. */
  readonly ply: number;
  /** True when the player explicitly declined the optional second action. */
  readonly passed: boolean;

  constructor(
    color: Color,
    parts: readonly MovePart[],
    notation: string,
    ply: number,
    passed = false
  ) {
    this.color = color;
    this.parts = parts;
    this.notation = notation;
    this.ply = ply;
    this.passed = passed;
  }

  /**
   * Human-readable TZAAR notation built from the move parts, e.g. "E6D6",
   * "B1C1-D2E2" or "E9E7-pass" (each part is `from`+`to`; the segments of a
   * turn are joined by "-").
   */
  get displayNotation(): string {
    const segments = this.parts.map(formatPart);
    if (this.passed) segments.push(PASS);
    return segments.join("-");
  }

  static parse(color: Color, token: string, ply: number): Move {
    const parts: MovePart[] = [];
    let passed = false;

    for (const segment of token.split("-")) {
      if (segment.toLowerCase() === PASS) {
        passed = true;
        continue;
      }
      if (segment.length !== 4) {
        throw new Error(`Invalid move segment "${segment}" in "${token}"`);
      }
      parts.push({
        from: Position.fromCode(segment.slice(0, 2)),
        to: Position.fromCode(segment.slice(2, 4)),
      });
    }
    return new Move(color, parts, token, ply, passed);
  }
}
