/**
 * Board geometry for TZAAR.
 *
 * The board is the classic GIPF-project hexagon expressed in axial coordinates:
 *   x, y integers with |x| <= 4, |y| <= 4 and |x + y| <= 4  -> 61 points.
 * The central point (0, 0) is a hole and is never played, leaving 60 points.
 *
 * LittleGolem encodes each coordinate as two letters in the range k..s, where
 * the letter `o` is the centre (value 0). Thus `k`=-4 .. `s`=+4 and a coordinate
 * such as "np" means (x=-1, y=1).
 */

export const BOARD_RADIUS = 4;

/**
 * How the board is presented: standing on its columns, or turned into the
 * LittleGolem layout.
 *
 * Presentation only. A point keeps its name whichever way the board faces —
 * turning a board does not rename its points, any more than turning a chessboard
 * moves e4.
 */
export type Orientation = "standard" | "littlegolem";

const CENTER_LETTER = "o";
const CENTER_CODE = CENTER_LETTER.charCodeAt(0);

function letterFor(value: number): string {
  return String.fromCharCode(CENTER_CODE + value);
}

function valueOf(letter: string): number {
  return letter.charCodeAt(0) - CENTER_CODE;
}

export class Position {
  readonly x: number;
  readonly y: number;

  constructor(x: number, y: number) {
    if (!Position.isPlayable(x, y)) {
      throw new Error(`Position (${x}, ${y}) is not on the TZAAR board`);
    }
    this.x = x;
    this.y = y;
  }

  /** LittleGolem two-letter code, e.g. "np". Also used as a stable map key. */
  get code(): string {
    return letterFor(this.x) + letterFor(this.y);
  }

  get key(): string {
    return this.code;
  }

  /** Highest y on this point's column — where its rank numbering starts. */
  private get columnTop(): number {
    return Math.min(BOARD_RADIUS, BOARD_RADIUS - this.x);
  }

  /**
   * Board notation: a file letter A–I taken from the column (x = -4 → A …
   * x = +4 → I), then a rank counted down from the top of that column — so
   * `qm` is G5 and `ok` is E9, as LittleGolem records write them.
   *
   * Counting from the column top rather than from a fixed y is what makes the
   * rank lines follow the hexagon's own slanted borders. The central hole is E5.
   */
  get label(): string {
    const file = String.fromCharCode("A".charCodeAt(0) + this.x + BOARD_RADIUS);
    return `${file}${this.columnTop - this.y + 1}`;
  }

  equals(other: Position): boolean {
    return this.x === other.x && this.y === other.y;
  }

  static fromCode(code: string): Position {
    if (code.length !== 2) {
      throw new Error(`Invalid coordinate code: "${code}"`);
    }
    return new Position(valueOf(code[0]), valueOf(code[1]));
  }

  /** True for the 60 real points (hexagon minus the central hole). */
  static isPlayable(x: number, y: number): boolean {
    if (x === 0 && y === 0) return false;
    return (
      Math.abs(x) <= BOARD_RADIUS &&
      Math.abs(y) <= BOARD_RADIUS &&
      Math.abs(x + y) <= BOARD_RADIUS
    );
  }
}

/**
 * The 60 board points in the exact order used by the `POS` field:
 * column-major (x from -4 to +4), y ascending within each column, centre skipped.
 */
export function positionsInPosOrder(): Position[] {
  const points: Position[] = [];
  for (let x = -BOARD_RADIUS; x <= BOARD_RADIUS; x++) {
    const yMin = Math.max(-BOARD_RADIUS, -BOARD_RADIUS - x);
    const yMax = Math.min(BOARD_RADIUS, BOARD_RADIUS - x);
    for (let y = yMin; y <= yMax; y++) {
      if (x === 0 && y === 0) continue;
      points.push(new Position(x, y));
    }
  }
  return points;
}

/** All 60 playable points (order is unspecified; convenient for rendering). */
export function allPositions(): Position[] {
  return positionsInPosOrder();
}
