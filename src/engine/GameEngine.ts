import { Board } from "../model/Board";
import { Game } from "../model/Game";
import { Move, MovePart, PASS } from "../model/Move";
import { Color, opponentOf } from "../model/Piece";
import { Position } from "../model/Position";
import { Variant } from "../model/Variant";
import { Rules, TurnPhase } from "./Rules";

/**
 * A turn being built on the board but not yet committed to a variant: the
 * mandatory capture has been played and the optional second action is pending.
 */
export interface PendingTurn {
  readonly color: Color;
  readonly parts: readonly MovePart[];
  /** The board with those parts already applied. */
  readonly board: Board;
}

/**
 * Immutable view of the engine at one point in the navigation.
 * `index` counts how many plies of the *main line* have been applied (0 = initial
 * position); inside a variant it stays at that variant's branch point and
 * `variantIndex` counts the plies applied on top of it.
 */
export interface EngineState {
  readonly game: Game;
  readonly board: Board;
  readonly index: number;
  readonly total: number;
  /** Absolute ply number of the displayed position, main line or variant. */
  readonly ply: number;
  /** The move that produced the current board (undefined at the very start). */
  readonly currentMove: Move | undefined;
  /** Whose turn it is next (undefined only when no game is loaded). */
  readonly toMove: Color | undefined;
  readonly variants: readonly Variant[];
  readonly activeVariant: Variant | undefined;
  readonly variantIndex: number;
  readonly pending: PendingTurn | undefined;
  readonly canFinishTurn: boolean;
}

type Listener = (state: EngineState) => void;

/**
 * Drives navigation through a game and analysis of it. Main-line board states are
 * precomputed once from the move history (a state cache), so stepping, jumping
 * and undo/redo are O(1) and every returned board is a shared immutable snapshot.
 *
 * On top of the recorded game the engine hosts *variants*: alternative lines the
 * user plays out from any position. Each variant caches its own states the same
 * way. Variants branch off the main line only — replaying from the middle of a
 * variant overwrites its tail rather than nesting a sub-variant.
 */
export class GameEngine {
  private game: Game | undefined;
  private states: Board[] = [];
  private cursor = 0;

  private variantList: Variant[] = [];
  private active: Variant | undefined;
  private variantCursor = 0;
  private nextVariantId = 1;
  private pendingTurn: PendingTurn | undefined;

  private readonly listeners = new Set<Listener>();

  load(game: Game): void {
    this.game = game;
    this.states = GameEngine.buildStates(game);
    this.cursor = 0;
    this.variantList = [];
    this.active = undefined;
    this.variantCursor = 0;
    this.nextVariantId = 1;
    this.pendingTurn = undefined;
    this.emit();
  }

  private static buildStates(game: Game): Board[] {
    const states: Board[] = [Board.fromPosition(game.initialPosition)];
    for (const move of game.moves) {
      const previous = states[states.length - 1];
      states.push(Rules.applyParts(previous, move.parts));
    }
    return states;
  }

  get isLoaded(): boolean {
    return this.game !== undefined;
  }

  get index(): number {
    return this.cursor;
  }

  get total(): number {
    return this.game ? this.game.moves.length : 0;
  }

  /** The displayed board, including any half-played turn. */
  get board(): Board {
    return this.pendingTurn ? this.pendingTurn.board : this.lineBoard;
  }

  /** The board of the current line, ignoring an uncommitted turn. */
  private get lineBoard(): Board {
    return this.active ? this.active.boardAt(this.variantCursor) : this.states[this.cursor];
  }

  /** Absolute ply number of the displayed position. */
  get ply(): number {
    return this.active ? this.active.plyOf(this.variantCursor) : this.cursor;
  }

  get currentMove(): Move | undefined {
    if (this.active && this.variantCursor > 0) {
      return this.active.moves[this.variantCursor - 1];
    }
    return this.cursor > 0 ? this.game?.moves[this.cursor - 1] : undefined;
  }

  get canStepBack(): boolean {
    return this.ply > 0 || this.pendingTurn !== undefined;
  }

  get canStepForward(): boolean {
    return this.active ? this.variantCursor < this.active.length : this.cursor < this.total;
  }

  // --- Variants -------------------------------------------------------------

  get variants(): readonly Variant[] {
    return this.variantList;
  }

  get activeVariant(): Variant | undefined {
    return this.active;
  }

  get variantIndex(): number {
    return this.variantCursor;
  }

  get pending(): PendingTurn | undefined {
    return this.pendingTurn;
  }

  /** Jump to a position inside a variant (index = plies applied within it). */
  goToVariant(variantId: number, index: number): void {
    const variant = this.variantList.find((candidate) => candidate.id === variantId);
    if (!variant) return;
    this.pendingTurn = undefined;
    this.active = variant;
    this.variantCursor = Math.max(0, Math.min(index, variant.length));
    this.cursor = variant.startIndex;
    this.emit();
  }

  /** Return to the main line at the point the active variant branches off. */
  leaveVariant(): void {
    if (!this.active) return;
    this.goTo(this.active.startIndex);
  }

  deleteVariant(variantId: number): void {
    const at = this.variantList.findIndex((candidate) => candidate.id === variantId);
    if (at < 0) return;
    const [removed] = this.variantList.splice(at, 1);
    if (this.active === removed) {
      this.active = undefined;
      this.variantCursor = 0;
      this.pendingTurn = undefined;
      this.cursor = removed.startIndex;
    }
    this.emit();
  }

  // --- Playing a variant ----------------------------------------------------

  /** Whether the next click starts a turn (capture only) or completes one. */
  get turnPhase(): TurnPhase {
    return this.pendingTurn ? "any" : "capture";
  }

  /** The colour that owns the turn currently being played. */
  get sideToMove(): Color | undefined {
    if (!this.game) return undefined;
    return this.pendingTurn ? this.pendingTurn.color : this.colorAtPly(this.ply);
  }

  /** Points the side to move may pick up right now. */
  movableOrigins(): Position[] {
    const color = this.sideToMove;
    if (!color) return [];
    return Rules.turnOrigins(this.board, color, this.turnPhase);
  }

  /** Legal destinations for the stack on `from` in the current turn phase. */
  targetsFrom(from: Position): Position[] {
    const color = this.sideToMove;
    if (!color) return [];
    const mover = this.board.get(from);
    if (!mover || mover.color !== color) return [];
    return Rules.turnTargets(this.board, from, this.turnPhase);
  }

  /**
   * Play one action of a variant turn. The turn is committed automatically once
   * it is complete (two actions, or one for the opening move of the game);
   * otherwise it stays pending until `playPart` again or `finishTurn`.
   * Returns false if the action is not legal.
   */
  playPart(from: Position, to: Position): boolean {
    if (!this.game) return false;
    if (!this.targetsFrom(from).some((target) => target.equals(to))) return false;

    const part: MovePart = { from, to };
    const color = this.pendingTurn ? this.pendingTurn.color : this.colorAtPly(this.ply);
    const parts = [...(this.pendingTurn?.parts ?? []), part];
    this.pendingTurn = {
      color,
      parts,
      board: Rules.applyPart(this.board, part).board,
    };

    // The opening turn of a game is a single capture; every other turn is at
    // most two actions.
    if (parts.length >= 2 || this.ply === 0) {
      this.commitTurn();
    } else {
      this.emit();
    }
    return true;
  }

  /** Stop after the mandatory capture (declining the optional second action). */
  finishTurn(): void {
    if (this.pendingTurn) this.commitTurn();
  }

  /** Discard the half-played turn, restoring the position it started from. */
  cancelTurn(): void {
    if (!this.pendingTurn) return;
    this.pendingTurn = undefined;
    this.emit();
  }

  private commitTurn(): void {
    const pending = this.pendingTurn;
    if (!pending || !this.game) return;

    const ply = this.ply;
    // At a branch point the position is shared with the main line, so a move
    // there opens another line rather than overwriting the existing one.
    const variant = this.active && this.variantCursor > 0 ? this.active : this.createVariant();
    // Replaying from the middle of a variant does replace the rest of that line.
    variant.truncate(this.variantCursor);
    // Stopping after the capture is a declined second action — the same thing
    // records write as "pass". The opening turn has no second action to decline.
    const passed = pending.parts.length === 1 && ply > 0;
    const notation = pending.parts
      .map((part) => `${part.from.code}${part.to.code}`)
      .concat(passed ? [PASS] : [])
      .join("-");
    variant.append(
      new Move(pending.color, pending.parts, notation, ply, passed),
      pending.board
    );

    this.pendingTurn = undefined;
    this.active = variant;
    this.cursor = variant.startIndex;
    this.variantCursor = variant.length;
    this.emit();
  }

  private createVariant(): Variant {
    const variant = new Variant(this.nextVariantId++, this.cursor, this.states[this.cursor]);
    this.variantList.push(variant);
    return variant;
  }

  /** Colours alternate from the first recorded move (White unless stated). */
  private colorAtPly(ply: number): Color {
    const first = this.game?.moves[0]?.color ?? Color.White;
    return ply % 2 === 0 ? first : opponentOf(first);
  }

  // --- Navigation -----------------------------------------------------------

  first(): void {
    this.goTo(0);
  }

  previous(): void {
    if (!this.game) return;
    if (this.pendingTurn) {
      this.cancelTurn();
      return;
    }
    if (this.active && this.variantCursor > 0) {
      this.variantCursor -= 1;
      this.emit();
      return;
    }
    // At a variant's branch point, stepping back leaves it for the main line.
    this.goTo((this.active ? this.active.startIndex : this.cursor) - 1);
  }

  next(): void {
    if (!this.game) return;
    if (this.active) {
      if (this.variantCursor < this.active.length) {
        this.variantCursor += 1;
        this.pendingTurn = undefined;
        this.emit();
      }
      return;
    }
    this.goTo(this.cursor + 1);
  }

  last(): void {
    if (this.active) {
      this.goToVariant(this.active.id, this.active.length);
      return;
    }
    this.goTo(this.total);
  }

  /** Undo/redo are navigation aliases: the full history is always retained. */
  undo(): void {
    this.previous();
  }

  redo(): void {
    this.next();
  }

  reset(): void {
    this.first();
  }

  /**
   * Jump to a main-line position. This always leaves the active variant and
   * discards a half-played turn.
   */
  goTo(index: number): void {
    if (!this.game) return;
    const clamped = Math.max(0, Math.min(index, this.total));
    const changed =
      clamped !== this.cursor || this.active !== undefined || this.pendingTurn !== undefined;
    this.cursor = clamped;
    this.active = undefined;
    this.variantCursor = 0;
    this.pendingTurn = undefined;
    if (changed) this.emit();
  }

  // --- Observation ----------------------------------------------------------

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    if (this.game) listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): EngineState {
    if (!this.game) {
      throw new Error("No game loaded");
    }
    return {
      game: this.game,
      board: this.board,
      index: this.cursor,
      total: this.total,
      ply: this.ply,
      currentMove: this.currentMove,
      toMove: this.sideToMove,
      variants: this.variantList,
      activeVariant: this.active,
      variantIndex: this.variantCursor,
      pending: this.pendingTurn,
      canFinishTurn: this.pendingTurn !== undefined,
    };
  }

  private emit(): void {
    if (!this.game) return;
    const state = this.snapshot();
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}
