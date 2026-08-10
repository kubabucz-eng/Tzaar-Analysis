import { describe, expect, it } from "vitest";
import { frameLabels } from "../src/renderer/frame";
import { boardLayout } from "../src/renderer/layout";
import { Orientation, allPositions } from "../src/model/Position";

const WIDTH = 900;
const HEIGHT = 700;
const points = allPositions();

function frame(orientation: Orientation) {
  const layout = boardLayout(WIDTH, HEIGHT, orientation);
  const fontSize = Math.max(10, Math.round(layout.radius * 0.62));
  return {
    layout,
    fontSize,
    labels: frameLabels(layout, fontSize),
    at: points.map((point) => layout.toPixel(point)),
  };
}

const EXPECTED = [
  "A1", "B1", "C1", "D1", "E1", "F1", "G1", "H1", "I1",
  "A5", "B6", "C7", "D8", "E9", "F8", "G7", "H6", "I5",
].sort();

describe("which points the frame names", () => {
  it("names both ends of every file, and nothing else", () => {
    const { labels } = frame("standard");
    expect(labels.map((label) => label.text).sort()).toEqual(EXPECTED);
  });

  it("names them the same once the board is turned", () => {
    const { labels } = frame("littlegolem");
    expect(labels).toHaveLength(18);
    // Turning the board moves the labels, it does not rename the points.
    expect(labels.map((label) => label.text).sort()).toEqual(EXPECTED);
  });
});

describe.each<Orientation>(["standard", "littlegolem"])("frame labels (%s)", (orientation) => {
  it("labels the point it names, and no other", () => {
    const { labels, layout } = frame(orientation);
    for (const label of labels) {
      const named = points.find((p) => p.label === label.text);
      expect(named, label.text).toBeDefined();
      const px = layout.toPixel(named!);
      const toNamed = Math.hypot(label.cx - px.cx, label.cy - px.cy);
      // Nearer to its own point than to any other point on the board.
      for (const other of points) {
        if (other === named) continue;
        const q = layout.toPixel(other);
        expect(Math.hypot(label.cx - q.cx, label.cy - q.cy), label.text).toBeGreaterThan(toNamed);
      }
    }
  });

  it("never covers a piece", () => {
    const { labels, layout, at } = frame(orientation);
    for (const label of labels) {
      for (const point of at) {
        const distance = Math.hypot(label.cx - point.cx, label.cy - point.cy);
        expect(distance, label.text).toBeGreaterThan(layout.radius);
      }
    }
  });

  it("sits outside the board, not within it", () => {
    const { labels, layout, at } = frame(orientation);
    const centre = {
      cx: at.reduce((s, p) => s + p.cx, 0) / at.length,
      cy: at.reduce((s, p) => s + p.cy, 0) / at.length,
    };
    for (const label of labels) {
      const named = points.find((p) => p.label === label.text)!;
      const px = layout.toPixel(named);
      const fromCentre = (p: { cx: number; cy: number }) =>
        Math.hypot(p.cx - centre.cx, p.cy - centre.cy);
      expect(fromCentre(label), label.text).toBeGreaterThan(fromCentre(px) + layout.radius * 0.9);
    }
  });

  it("keeps the labels apart from each other", () => {
    const { labels, fontSize } = frame(orientation);
    for (const a of labels) {
      for (const b of labels) {
        if (a === b) continue;
        const distance = Math.hypot(a.cx - b.cx, a.cy - b.cy);
        expect(distance, `${a.text} vs ${b.text}`).toBeGreaterThan(fontSize * 1.5);
      }
    }
  });

  it("stays on the canvas", () => {
    const { labels, fontSize } = frame(orientation);
    for (const label of labels) {
      expect(label.cx, label.text).toBeGreaterThan(fontSize);
      expect(label.cx, label.text).toBeLessThan(WIDTH - fontSize);
      expect(label.cy, label.text).toBeGreaterThan(fontSize * 0.6);
      expect(label.cy, label.text).toBeLessThan(HEIGHT - fontSize * 0.6);
    }
  });
});
