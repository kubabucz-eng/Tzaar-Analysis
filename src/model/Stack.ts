import {
  Color,
  PieceType,
  charFor,
  colorFromChar,
  pieceTypeFromChar,
} from "./Piece";

/**
 * A stack of one or more pieces occupying a single point.
 *
 * TZAAR stacks are homogeneous in colour; only the top piece's type and the
 * total height matter for the rules, so we model exactly those. Stacks are
 * immutable — every mutating operation returns a new instance.
 */
export class Stack {
  readonly color: Color;
  readonly type: PieceType;
  readonly height: number;

  constructor(color: Color, type: PieceType, height: number) {
    if (height < 1) {
      throw new Error(`Stack height must be >= 1, received ${height}`);
    }
    this.color = color;
    this.type = type;
    this.height = height;
  }

  /** This stack moves on top of `base`, forming a taller stack of this colour/type. */
  stackOnto(base: Stack): Stack {
    return new Stack(this.color, this.type, this.height + base.height);
  }

  get char(): string {
    return charFor(this.color, this.type);
  }

  static single(char: string): Stack {
    return new Stack(colorFromChar(char), pieceTypeFromChar(char), 1);
  }
}
