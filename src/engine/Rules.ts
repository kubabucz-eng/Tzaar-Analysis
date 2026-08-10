import { Board } from "../model/Board";
import { MovePart } from "../model/Move";
import { Color } from "../model/Piece";
import { Position } from "../model/Position";
import { Stack } from "../model/Stack";

/** The six axial directions on the hexagonal board. */
export const DIRECTIONS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, -1],
  [-1, 1],
];

export type PartKind = "capture" | "stack" | "relocation";

export interface AppliedPart {
  readonly board: Board;
  readonly kind: PartKind;
}

/**
 * Which actions are legal at this point of a turn. A TZAAR turn opens with a
 * mandatory capture ("capture"); the optional second action may be another
 * capture or a stack ("any").
 */
export type TurnPhase = "capture" | "any";

/**
 * Pure game rules. Knows nothing about parsing, rendering or navigation.
 * Beyond executing recorded moves it can also enumerate legal moves, which the
 * UI may later use for highlighting or an AI engine.
 */
export const Rules = {
  /** Execute one recorded move part, returning the resulting board and its kind. */
  applyPart(board: Board, part: MovePart): AppliedPart {
    const mover = board.get(part.from);
    if (mover === undefined) {
      throw new Error(`No piece to move at ${part.from.code}`);
    }
    const target = board.get(part.to);
    const without = board.remove(part.from);

    if (target === undefined) {
      // Not legal in standard TZAAR, but kept total for robustness.
      return { board: without.set(part.to, mover), kind: "relocation" };
    }
    if (target.color === mover.color) {
      return { board: without.set(part.to, mover.stackOnto(target)), kind: "stack" };
    }
    return { board: without.set(part.to, mover), kind: "capture" };
  },

  /** Apply every part of a turn in order. */
  applyParts(board: Board, parts: readonly MovePart[]): Board {
    return parts.reduce((current, part) => Rules.applyPart(current, part).board, board);
  },

  /** A stack may capture a shorter-or-equal enemy stack. */
  canCapture(mover: Stack, target: Stack): boolean {
    return target.color !== mover.color && mover.height >= target.height;
  },

  /** A stack may always climb onto a friendly one; heights add up. */
  canStack(mover: Stack, target: Stack): boolean {
    return target.color === mover.color;
  },

  /** All legal single actions for `color` from the given board. */
  legalMoves(board: Board, color: Color): MovePart[] {
    const moves: MovePart[] = [];
    for (const position of Rules.turnOrigins(board, color, "any")) {
      for (const target of Rules.turnTargets(board, position, "any")) {
        moves.push({ from: position, to: target });
      }
    }
    return moves;
  },

  /** Where the stack on `origin` may legally land in the given turn phase. */
  turnTargets(board: Board, origin: Position, phase: TurnPhase): Position[] {
    const mover = board.get(origin);
    if (mover === undefined) return [];

    const targets: Position[] = [];
    for (const target of Rules.reachableTargets(board, origin)) {
      const occupant = board.get(target);
      if (occupant === undefined) continue;
      if (Rules.canCapture(mover, occupant)) {
        targets.push(target);
      } else if (phase === "any" && Rules.canStack(mover, occupant)) {
        targets.push(target);
      }
    }
    return targets;
  },

  /** The points `color` may pick up in the given turn phase. */
  turnOrigins(board: Board, color: Color, phase: TurnPhase): Position[] {
    const origins: Position[] = [];
    for (const { position, stack } of board.entries()) {
      if (stack.color !== color) continue;
      if (Rules.turnTargets(board, position, phase).length > 0) {
        origins.push(position);
      }
    }
    return origins;
  },

  /**
   * First occupied point in each direction from `origin` (a stack slides over
   * empty points and stops at the first piece it meets).
   */
  reachableTargets(board: Board, origin: Position): Position[] {
    const targets: Position[] = [];
    for (const [dx, dy] of DIRECTIONS) {
      let x = origin.x + dx;
      let y = origin.y + dy;
      while (Position.isPlayable(x, y)) {
        const pos = new Position(x, y);
        if (board.has(pos)) {
          targets.push(pos);
          break;
        }
        x += dx;
        y += dy;
      }
    }
    return targets;
  },

  /**
   * Classify a part against a board without applying it (useful for the UI).
   * Returns undefined if the origin is empty.
   */
  classify(board: Board, part: MovePart): PartKind | undefined {
    const mover = board.get(part.from);
    if (mover === undefined) return undefined;
    const target = board.get(part.to);
    if (target === undefined) return "relocation";
    return target.color === mover.color ? "stack" : "capture";
  },

  neighbor(pos: Position, direction: readonly [number, number]): Position | undefined {
    const x = pos.x + direction[0];
    const y = pos.y + direction[1];
    return Position.isPlayable(x, y) ? new Position(x, y) : undefined;
  },
} as const;
