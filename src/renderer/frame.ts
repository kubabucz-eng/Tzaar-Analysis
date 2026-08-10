import { Position, allPositions } from "../model/Position";
import { Layout, Pixel } from "./layout";

export interface FrameLabel {
  readonly text: string;
  readonly cx: number;
  readonly cy: number;
}

/**
 * Where the coordinate labels belong around the board.
 *
 * Rather than a letter per file and a number per rank, the frame names the two
 * end points of every file — A1…I1 along one border and A5, B6, C7, D8, E9, F8,
 * G7, H6, I5 along the opposite one. Eighteen labels, each carrying a point's
 * full name, so a name can be read straight off the board instead of being
 * pieced together from two edges.
 *
 * Each label is pushed out from its point, directly away from the centre of the
 * board, which lands it just outside the hexagon whichever way the board faces.
 * The names themselves do not depend on the orientation — turning the board is
 * a view, not a renaming. Pure geometry, so the placement can be checked alone.
 */
export function frameLabels(layout: Layout, fontSize: number): FrameLabel[] {
  const points = allPositions();
  const centre = centreOf(points.map((point) => layout.toPixel(point)));
  // Far enough out to clear the piece the label sits beside.
  const gap = layout.radius + fontSize * 0.7;

  return endsOfEachFile(points).map((point) => {
    const pixel = layout.toPixel(point);
    const dx = pixel.cx - centre.cx;
    const dy = pixel.cy - centre.cy;
    const length = Math.hypot(dx, dy) || 1;
    return {
      text: point.label,
      cx: pixel.cx + (dx / length) * gap,
      cy: pixel.cy + (dy / length) * gap,
    };
  });
}

/** The topmost and bottommost point of each of the nine files. */
function endsOfEachFile(points: readonly Position[]): Position[] {
  const files = new Map<number, Position[]>();
  for (const point of points) {
    const existing = files.get(point.x);
    if (existing) existing.push(point);
    else files.set(point.x, [point]);
  }

  const ends: Position[] = [];
  for (const file of [...files.keys()].sort((a, b) => a - b)) {
    const column = files.get(file)!;
    ends.push(
      column.reduce((best, p) => (p.y > best.y ? p : best)),
      column.reduce((best, p) => (p.y < best.y ? p : best))
    );
  }
  return ends;
}

function centreOf(pixels: readonly Pixel[]): Pixel {
  const total = pixels.reduce(
    (sum, pixel) => ({ cx: sum.cx + pixel.cx, cy: sum.cy + pixel.cy }),
    { cx: 0, cy: 0 }
  );
  return { cx: total.cx / pixels.length, cy: total.cy / pixels.length };
}
