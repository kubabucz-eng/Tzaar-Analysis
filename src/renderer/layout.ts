import { BOARD_RADIUS, Orientation, Position } from "../model/Position";

/** A point's position on the canvas. */
export interface Pixel {
  readonly cx: number;
  readonly cy: number;
}

export interface Layout {
  /** Radius of a drawn piece, derived from the point spacing. */
  readonly radius: number;
  toPixel(pos: Position): Pixel;
}

/** Room kept outside the pieces for the coordinate frame. */
const LABEL_MARGIN = 30;
/** Piece radius as a fraction of the full point spacing. */
const PIECE_RATIO = 0.42;
/** Horizontal:vertical spacing ratio that keeps the lattice equilateral. */
const H_FACTOR = Math.sqrt(3) / 2;

/**
 * Place the board inside a `width` x `height` canvas.
 *
 * The board is a triangular lattice, drawn against two axes:
 *   u = x + y        — runs across the board
 *   v = (x - y) / 2  — runs up it
 * Neighbouring points sit one `full` unit apart along v but only `full * √3/2`
 * apart along u, so whichever axis runs across the screen takes the tighter
 * spacing — and turning the board swaps the two.
 *
 * Those axes are the reflection of the raw (x, y) pair in the line y = 0, the
 * A1–I5 diagonal: TZAAR boards are drawn along the x + y ranks, so taking the
 * coordinates at face value comes out mirrored. Reflecting here rather than in
 * the model keeps the recorded coordinates untouched — this is how the board is
 * drawn, not what its points are called.
 *
 * `littlegolem` turns that board 30° clockwise, laying the constant-y rows flat.
 * Files A→I still run left to right and ranks 1→9 still climb the board. Thirty
 * degrees is not a symmetry of the lattice, so unlike a quarter turn it cannot
 * be written as a swap of u and v — the turned axes are worked out directly.
 *
 * Pure geometry: no canvas, no drawing, so it can be checked on its own.
 */
export function boardLayout(width: number, height: number, orientation: Orientation): Layout {
  const span = 2 * BOARD_RADIUS; // 8 units on both axes
  const availW = Math.max(1, width - 2 * LABEL_MARGIN);
  const availH = Math.max(1, height - 2 * LABEL_MARGIN);
  const rotated = orientation === "littlegolem";

  // Measured in units of `full`: the points span 8 units along one axis and
  // 8 * √3/2 along the other, and the outermost pieces bulge one radius past
  // them on each side — so the board is sized to fit pieces, not bare points.
  const bleed = 2 * PIECE_RATIO;
  const [widthUnits, heightUnits] = rotated
    ? [span + bleed, span * H_FACTOR + bleed]
    : [span * H_FACTOR + bleed, span + bleed];

  // `full` is the spacing along the axis drawn at full size; `tight` the other.
  const full = Math.min(availW / widthUnits, availH / heightUnits);
  const tight = full * H_FACTOR;

  const [xSpacing, ySpacing] = rotated ? [full, tight] : [tight, full];
  const originX = (width - span * xSpacing) / 2;
  const originY = (height - span * ySpacing) / 2;

  return {
    radius: full * PIECE_RATIO,
    toPixel(pos: Position) {
      const u = pos.x + pos.y;
      const v = (pos.x - pos.y) / 2;
      // Standard: +u right, +v up. Turned: the same picture 30° clockwise.
      const [across, down] = rotated ? [pos.x + pos.y / 2, pos.y] : [u, -v];
      return {
        cx: originX + (across + BOARD_RADIUS) * xSpacing,
        cy: originY + (down + BOARD_RADIUS) * ySpacing,
      };
    },
  };
}
