import { Board } from "../model/Board";
import { Color, PieceType } from "../model/Piece";
import { Position, allPositions } from "../model/Position";
import { Stack } from "../model/Stack";
import { ViewStyle } from "../view/ViewSettings";
import { frameLabels } from "./frame";
import { Layout, boardLayout } from "./layout";

export interface Highlight {
  readonly from: Position;
  readonly to: Position;
}

/** Interaction feedback for playing a variant: the picked-up stack and its options. */
export interface BoardOverlay {
  readonly selected?: Position;
  readonly targets?: readonly Position[];
}

interface Theme {
  readonly background: string;
  readonly grid: string;
  readonly label: string;
  readonly emptyPoint: string;
  readonly whiteFill: string;
  readonly whiteStroke: string;
  readonly whiteInk: string;
  readonly blackFill: string;
  readonly blackStroke: string;
  readonly blackInk: string;
  readonly highlightFrom: string;
  readonly highlightTo: string;
  readonly selection: string;
  readonly target: string;
  /** Border colour per piece type, used by the `colored` piece set. */
  readonly typeColors: Readonly<Record<PieceType, string>>;
}

const DEFAULT_THEME: Theme = {
  background: "#d1d1d1",
  // Only drawn in the `lines` board style, so it has to carry real contrast.
  grid: "#aab4c4",
  label: "#93a0b4",
  emptyPoint: "#2c3444",
  whiteFill: "#efe9d8",
  whiteStroke: "#c9c0a6",
  whiteInk: "#2a2a2a",
  blackFill: "#2b2f38",
  blackStroke: "#11141a",
  blackInk: "#f2f2f2",
  highlightFrom: "#7aa2ff",
  highlightTo: "#ffcf5a",
  selection: "#4ade80",
  target: "#4ade8099",
  typeColors: {
    [PieceType.Tzaar]: "#e5484d",
    [PieceType.Tzarra]: "#2f6fed",
    [PieceType.Tott]: "#1f9d55",
  },
};

const RING_COUNT: Readonly<Record<PieceType, number>> = {
  [PieceType.Tott]: 0,
  [PieceType.Tzarra]: 1,
  [PieceType.Tzaar]: 2,
};

/**
 * Draws a board onto a canvas. The renderer is deliberately isolated: it knows
 * about the board model and geometry only — never the parser, engine or UI.
 * It rescales itself to the canvas size on every draw, so the caller only needs
 * to resize the canvas and call `draw` again.
 */
export class BoardRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly points = allPositions();
  private lastBoard: Board | undefined;
  private lastHighlight: readonly Highlight[] = [];
  private lastOverlay: BoardOverlay = {};
  private style: ViewStyle = { board: "dots", pieces: "classic", orientation: "standard" };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly theme: Theme = DEFAULT_THEME
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
  }

  /** Change board/piece styling or orientation and repaint the current board. */
  setStyle(style: ViewStyle): void {
    this.style = style;
    if (this.lastBoard) this.draw(this.lastBoard, this.lastHighlight, this.lastOverlay);
  }

  /** Recompute the backing-store size for the current CSS size and redraw. */
  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.lastBoard) this.draw(this.lastBoard, this.lastHighlight, this.lastOverlay);
  }

  draw(
    board: Board,
    highlights: readonly Highlight[] = [],
    overlay: BoardOverlay = {}
  ): void {
    this.lastBoard = board;
    this.lastHighlight = highlights;
    this.lastOverlay = overlay;

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const ctx = this.ctx;

    ctx.fillStyle = this.theme.background;
    ctx.fillRect(0, 0, width, height);

    const layout = this.computeLayout(width, height);
    // The two board styles are alternatives: lines join the points, or dots mark
    // them. Drawing both at once reads as clutter.
    if (this.style.board === "lines") this.drawGrid(layout);
    this.drawHighlights(highlights, layout);

    for (const point of this.points) {
      const stack = board.get(point);
      const { cx, cy } = layout.toPixel(point);
      if (stack) {
        this.drawStack(stack, cx, cy, layout.radius);
      } else if (this.style.board === "dots") {
        this.drawEmpty(cx, cy, layout.radius);
      }
    }

    // Overlay markers sit on top of the pieces: every legal target is occupied.
    this.drawOverlay(overlay, layout);
    this.drawCoordinates(layout, width, height);
  }

  /** The board point under a viewport coordinate, if the click landed on one. */
  positionAt(clientX: number, clientY: number): Position | undefined {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const layout = this.computeLayout(this.canvas.clientWidth, this.canvas.clientHeight);
    const limit = (layout.radius * 1.2) ** 2;

    let best: Position | undefined;
    let bestDistance = Infinity;
    for (const point of this.points) {
      const { cx, cy } = layout.toPixel(point);
      const distance = (cx - x) ** 2 + (cy - y) ** 2;
      if (distance <= limit && distance < bestDistance) {
        best = point;
        bestDistance = distance;
      }
    }
    return best;
  }

  /**
   * Coordinate frame around the board: the name of each file's two end points,
   * set just outside the hexagon. `frameLabels` works out where; this only
   * draws them, nudged inside the canvas in case one would land past its edge.
   */
  private drawCoordinates(layout: Layout, width: number, height: number): void {
    const ctx = this.ctx;
    const fontSize = Math.max(10, Math.round(layout.radius * 0.62));

    ctx.fillStyle = this.theme.label;
    ctx.font = `${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Names are two characters wide, so they need more room sideways than down.
    const sideEdge = fontSize;
    const topEdge = fontSize * 0.6;
    for (const label of frameLabels(layout, fontSize)) {
      ctx.fillText(
        label.text,
        clamp(label.cx, sideEdge, width - sideEdge),
        clamp(label.cy, topEdge, height - topEdge)
      );
    }
  }

  // --- Geometry -------------------------------------------------------------

  private computeLayout(width: number, height: number): Layout {
    return boardLayout(width, height, this.style.orientation);
  }

  private drawGrid(layout: Layout): void {
    const ctx = this.ctx;
    ctx.strokeStyle = this.theme.grid;
    ctx.lineWidth = 1.5;
    // Draw each edge once using three of the six directions.
    const forward: ReadonlyArray<readonly [number, number]> = [
      [1, 0],
      [0, 1],
      [1, -1],
    ];
    for (const point of this.points) {
      const a = layout.toPixel(point);
      for (const [dx, dy] of forward) {
        const nx = point.x + dx;
        const ny = point.y + dy;
        if (!Position.isPlayable(nx, ny)) continue;
        const b = layout.toPixel(new Position(nx, ny));
        ctx.beginPath();
        ctx.moveTo(a.cx, a.cy);
        ctx.lineTo(b.cx, b.cy);
        ctx.stroke();
      }
    }
  }

  private drawHighlights(highlights: readonly Highlight[], layout: Layout): void {
    const ctx = this.ctx;
    for (const hl of highlights) {
      this.ring(layout.toPixel(hl.from), layout.radius + 4, this.theme.highlightFrom, ctx);
      this.ring(layout.toPixel(hl.to), layout.radius + 4, this.theme.highlightTo, ctx);
    }
  }

  /**
   * Selection feedback while a variant turn is being clicked out: a solid ring
   * around the picked-up stack and a dashed ring around each legal destination.
   */
  private drawOverlay(overlay: BoardOverlay, layout: Layout): void {
    const ctx = this.ctx;
    const r = layout.radius + 5;

    if (overlay.targets) {
      ctx.setLineDash([5, 4]);
      for (const target of overlay.targets) {
        this.ring(layout.toPixel(target), r, this.theme.target, ctx);
      }
      ctx.setLineDash([]);
    }
    if (overlay.selected) {
      this.ring(layout.toPixel(overlay.selected), r, this.theme.selection, ctx);
    }
  }

  private ring(
    p: { cx: number; cy: number },
    r: number,
    color: string,
    ctx: CanvasRenderingContext2D
  ): void {
    ctx.beginPath();
    ctx.arc(p.cx, p.cy, r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  private drawEmpty(cx: number, cy: number, radius: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(2, radius * 0.16), 0, Math.PI * 2);
    ctx.fillStyle = this.theme.emptyPoint;
    ctx.fill();
  }

  private drawStack(stack: Stack, cx: number, cy: number, radius: number): void {
    const face =
      this.style.pieces === "colored"
        ? this.drawColoredPiece(stack, cx, cy, radius)
        : this.drawClassicPiece(stack, cx, cy, radius);
    if (stack.height > 1) this.drawHeight(stack.height, cx, cy, face);
  }

  /** Light/dark disc, type read from concentric rings. */
  private drawClassicPiece(stack: Stack, cx: number, cy: number, radius: number): PieceFace {
    const ctx = this.ctx;
    const isWhite = stack.color === Color.White;
    const ink = isWhite ? this.theme.whiteInk : this.theme.blackInk;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = isWhite ? this.theme.whiteFill : this.theme.blackFill;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = isWhite ? this.theme.whiteStroke : this.theme.blackStroke;
    ctx.stroke();

    // Concentric rings encode the piece type (Tott 0, Tzarra 1, Tzaar 2).
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= RING_COUNT[stack.type]; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * (1 - i * 0.22), 0, Math.PI * 2);
      ctx.stroke();
    }
    return { ink, textRadius: radius };
  }

  /**
   * A black or white centre — the owner — inside a thick coloured border that
   * names the type: red Tzaar, blue Tzarra, green Tott. Returns its ink colour.
   */
  private drawColoredPiece(stack: Stack, cx: number, cy: number, radius: number): PieceFace {
    const ctx = this.ctx;
    const isWhite = stack.color === Color.White;
    const border = this.theme.typeColors[stack.type];
    // The border is 2px thinner than the plain 0.4 * radius, but never so thin
    // on a small board that the colour stops reading.
    const coreRadius = Math.min(radius * 0.6 + 2, radius * 0.85);

    // The border is a filled disc rather than a stroke, so it stays crisp at any
    // size and the centre sits exactly inside it.
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = border;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = isWhite ? this.theme.whiteFill : this.theme.blackFill;
    ctx.fill();
    // A hairline keeps a white centre from bleeding into a light border.
    ctx.lineWidth = 1;
    ctx.strokeStyle = isWhite ? this.theme.whiteStroke : this.theme.blackStroke;
    ctx.stroke();

    // The height has to fit the centre, not the whole piece.
    return {
      ink: isWhite ? this.theme.whiteInk : this.theme.blackInk,
      textRadius: coreRadius,
    };
  }

  /** Stack height, drawn in the centre where it reads against the owner colour. */
  private drawHeight(height: number, cx: number, cy: number, face: PieceFace): void {
    const ctx = this.ctx;
    ctx.fillStyle = face.ink;
    ctx.font = `${Math.round(face.textRadius * 0.9)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(height), cx, cy);
  }
}

/** What a drawn piece exposes for labelling: its ink and the room it leaves. */
interface PieceFace {
  readonly ink: string;
  readonly textRadius: number;
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(value, high));
}
