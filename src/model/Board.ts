import { Position, positionsInPosOrder } from "./Position";
import { Stack } from "./Stack";

/**
 * Immutable snapshot of the board: a mapping from point key to the Stack there.
 * Empty points are simply absent from the map. Mutating helpers return a new
 * Board so that historical snapshots can be shared safely.
 */
export class Board {
  private readonly cells: ReadonlyMap<string, Stack>;

  constructor(cells: ReadonlyMap<string, Stack> = new Map()) {
    this.cells = cells;
  }

  get(pos: Position): Stack | undefined {
    return this.cells.get(pos.key);
  }

  has(pos: Position): boolean {
    return this.cells.has(pos.key);
  }

  set(pos: Position, stack: Stack): Board {
    const next = new Map(this.cells);
    next.set(pos.key, stack);
    return new Board(next);
  }

  remove(pos: Position): Board {
    const next = new Map(this.cells);
    next.delete(pos.key);
    return new Board(next);
  }

  /** All occupied points paired with their stacks. */
  entries(): Array<{ position: Position; stack: Stack }> {
    const result: Array<{ position: Position; stack: Stack }> = [];
    for (const [key, stack] of this.cells) {
      result.push({ position: Position.fromCode(key), stack });
    }
    return result;
  }

  countByColor(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const stack of this.cells.values()) {
      counts.set(stack.color, (counts.get(stack.color) ?? 0) + 1);
    }
    return counts;
  }

  /** Build the initial board from a 60-character `POS` string. */
  static fromPosition(position: string): Board {
    const points = positionsInPosOrder();
    if (position.length !== points.length) {
      throw new Error(
        `POS length ${position.length} does not match ${points.length} board points`
      );
    }
    const cells = new Map<string, Stack>();
    points.forEach((point, index) => {
      cells.set(point.key, Stack.single(position[index]));
    });
    return new Board(cells);
  }
}
