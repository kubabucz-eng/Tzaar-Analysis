import { describe, expect, it } from "vitest";
import { boardLayout } from "../src/renderer/layout";
import { DIRECTIONS } from "../src/engine/Rules";
import { Orientation, Position, allPositions } from "../src/model/Position";

const WIDTH = 900;
const HEIGHT = 700;
const points = allPositions();

function pixels(orientation: Orientation, w = WIDTH, h = HEIGHT) {
  const layout = boardLayout(w, h, orientation);
  return { layout, at: points.map((point) => layout.toPixel(point)) };
}

const extent = (values: number[]) => Math.max(...values) - Math.min(...values);

/** Mean screen position of each file letter / rank number, in label order —
 *  which is exactly where the renderer centres that frame label. */
function means(orientation: Orientation, part: "file" | "rank", axis: "cx" | "cy"): number[] {
  const layout = boardLayout(WIDTH, HEIGHT, orientation);
  const groups = new Map<string, number[]>();
  for (const point of points) {
    const label = point.label;
    const key = part === "file" ? label[0] : label.slice(1);
    groups.set(key, [...(groups.get(key) ?? []), layout.toPixel(point)[axis]]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))
    .map(([, values]) => values.reduce((sum, v) => sum + v, 0) / values.length);
}

/** Distances between every pair of adjacent points, as drawn. */
function neighbourDistances(orientation: Orientation): number[] {
  const layout = boardLayout(WIDTH, HEIGHT, orientation);
  const distances: number[] = [];
  for (const point of points) {
    for (const [dx, dy] of DIRECTIONS) {
      if (!Position.isPlayable(point.x + dx, point.y + dy)) continue;
      const a = layout.toPixel(point);
      const b = layout.toPixel(new Position(point.x + dx, point.y + dy));
      distances.push(Math.hypot(a.cx - b.cx, a.cy - b.cy));
    }
  }
  return distances;
}

describe.each<Orientation>(["standard", "littlegolem"])("boardLayout (%s)", (orientation) => {
  it("keeps every point inside the canvas", () => {
    const { layout, at } = pixels(orientation);
    for (const { cx, cy } of at) {
      expect(cx).toBeGreaterThanOrEqual(layout.radius);
      expect(cx).toBeLessThanOrEqual(WIDTH - layout.radius);
      expect(cy).toBeGreaterThanOrEqual(layout.radius);
      expect(cy).toBeLessThanOrEqual(HEIGHT - layout.radius);
    }
  });

  it("draws an even lattice — all neighbours equally far apart", () => {
    const distances = neighbourDistances(orientation);
    const first = distances[0];
    for (const distance of distances) expect(distance).toBeCloseTo(first, 6);
  });

  it("never overlaps two pieces", () => {
    const { layout } = pixels(orientation);
    expect(neighbourDistances(orientation)[0]).toBeGreaterThan(2 * layout.radius);
  });

  it("centres the board", () => {
    const { at } = pixels(orientation);
    const xs = at.map((p) => p.cx);
    const ys = at.map((p) => p.cy);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(WIDTH / 2, 6);
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(HEIGHT / 2, 6);
  });
});

describe("boardLayout orientation", () => {
  it("is the standard board turned 30° clockwise", () => {
    // A square canvas, so both orientations are scaled alike and the only
    // difference left between them is the turn itself.
    const standard = boardLayout(800, 800, "standard");
    const rotated = boardLayout(800, 800, "littlegolem");
    const origin = points[0];
    const cos = Math.cos(Math.PI / 6);
    const sin = Math.sin(Math.PI / 6);

    // Clockwise by 30° sends (dx, dy) to (dx·cos - dy·sin, dx·sin + dy·cos).
    // Checked on every point at once, so no landmark can flatter it.
    const from = standard.toPixel(origin);
    const rotFrom = rotated.toPixel(origin);
    for (const point of points) {
      const std = standard.toPixel(point);
      const rot = rotated.toPixel(point);
      const dx = std.cx - from.cx;
      const dy = std.cy - from.cy;
      expect(rot.cx - rotFrom.cx).toBeCloseTo(dx * cos - dy * sin, 6);
      expect(rot.cy - rotFrom.cy).toBeCloseTo(dx * sin + dy * cos, 6);
    }
  });

  /**
   * TZAAR boards are laid out along their x + y diagonals, so standing on
   * columns each of those must come out as one straight vertical line. Taking
   * the raw axial pair as the drawing axes bends them over instead — that is
   * the reflection in the A1–I5 diagonal that put every piece on the wrong side.
   */
  it("lays each x + y diagonal out straight, so the board is not mirrored", () => {
    const layout = boardLayout(WIDTH, HEIGHT, "standard");
    const columns = new Map<number, number[]>();
    for (const point of points) {
      const diagonal = point.x + point.y;
      columns.set(diagonal, [...(columns.get(diagonal) ?? []), layout.toPixel(point).cx]);
    }
    expect(columns.size).toBe(9);
    for (const [diagonal, cxs] of columns) {
      expect(extent(cxs), `x + y = ${diagonal}`).toBeCloseTo(0, 6);
    }
  });

  it("puts the columns on their side, so the board is wider than it is tall", () => {
    const spread = (orientation: Orientation) => {
      const { at } = pixels(orientation, 1200, 1200); // a square, so shape shows
      const xs = at.map((p) => p.cx);
      const ys = at.map((p) => p.cy);
      return (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
    };
    expect(spread("standard")).toBeLessThan(1);
    expect(spread("littlegolem")).toBeGreaterThan(1);
  });

  /**
   * The frame has to read the right way round: whichever way the board faces,
   * the letters and the numbers must each climb in their natural direction.
   */
  it("orders both labels naturally on screen", () => {
    const rising = (xs: number[]) => xs.every((v, i) => i === 0 || v > xs[i - 1]);
    const falling = (xs: number[]) => xs.every((v, i) => i === 0 || v < xs[i - 1]);

    // Either way up: A→I run left to right and ranks 1→9 climb the board.
    // Where their labels are drawn is frame.test.ts's business; this is about
    // the points themselves lying in the order their names imply.
    for (const orientation of ["standard", "littlegolem"] as const) {
      expect(rising(means(orientation, "file", "cx")), `${orientation} files`).toBe(true);
      expect(falling(means(orientation, "rank", "cy")), `${orientation} ranks`).toBe(true);
    }
  });

  it("fills the space it is given in either orientation", () => {
    for (const orientation of ["standard", "littlegolem"] as const) {
      const { layout, at } = pixels(orientation);
      const xs = at.map((p) => p.cx);
      const ys = at.map((p) => p.cy);
      const usedW = Math.max(...xs) - Math.min(...xs) + 2 * layout.radius;
      const usedH = Math.max(...ys) - Math.min(...ys) + 2 * layout.radius;
      // One axis must be up against the frame, or the board is drawn too small.
      expect(Math.max(usedW / WIDTH, usedH / HEIGHT)).toBeGreaterThan(0.85);
    }
  });
});
