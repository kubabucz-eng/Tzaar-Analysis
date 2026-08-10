/**
 * Piece colours and types.
 *
 * In the `POS` field lowercase letters are White and uppercase are Black.
 * The letters map to the three TZAAR piece types:
 *   a / A -> Tzaar  (6 per player)
 *   b / B -> Tzarra (9 per player)
 *   c / C -> Tott   (15 per player)
 */

export enum Color {
  White = "White",
  Black = "Black",
}

export enum PieceType {
  Tzaar = "Tzaar",
  Tzarra = "Tzarra",
  Tott = "Tott",
}

const TYPE_BY_LETTER: Readonly<Record<string, PieceType>> = {
  a: PieceType.Tzaar,
  b: PieceType.Tzarra,
  c: PieceType.Tott,
};

const LETTER_BY_TYPE: Readonly<Record<PieceType, string>> = {
  [PieceType.Tzaar]: "a",
  [PieceType.Tzarra]: "b",
  [PieceType.Tott]: "c",
};

export function colorFromChar(ch: string): Color {
  return ch === ch.toLowerCase() ? Color.White : Color.Black;
}

export function pieceTypeFromChar(ch: string): PieceType {
  const type = TYPE_BY_LETTER[ch.toLowerCase()];
  if (type === undefined) {
    throw new Error(`Unknown piece letter: "${ch}"`);
  }
  return type;
}

export function charFor(color: Color, type: PieceType): string {
  const letter = LETTER_BY_TYPE[type];
  return color === Color.White ? letter : letter.toUpperCase();
}

export function opponentOf(color: Color): Color {
  return color === Color.White ? Color.Black : Color.White;
}
