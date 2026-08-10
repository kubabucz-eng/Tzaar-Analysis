import { EngineState } from "../engine/GameEngine";
import { i18n } from "../i18n/I18n";
import { Move, formatParts } from "../model/Move";
import { Color } from "../model/Piece";
import { Variant } from "../model/Variant";

export interface MoveListCallbacks {
  /** Jump to the main line after `index` plies. */
  onSelectMain(index: number): void;
  /** Jump into a variant, after `index` of its plies. */
  onSelectVariant(variantId: number, index: number): void;
  onDeleteVariant(variantId: number): void;
}

/**
 * Scrollable list of every ply. Rows are grouped into numbered turns
 * ("1. W npmq" / "1… B prqq-kplp"). Clicking a row asks the host to jump to the
 * board after that ply; the UI has no knowledge of the rules.
 *
 * Variants are nested under the main-line row they branch from, keeping their
 * absolute turn numbers so a line always reads in the game's own numbering. A
 * half-played turn appears as a greyed row at the end of the line being played.
 */
/** Rows marked with one of these are the current position, and get scrolled to. */
const ACTIVE_SELECTOR = ".movelist__row--active, .variant__title--active";

export class MoveList {
  readonly element: HTMLElement;

  constructor(private readonly callbacks: MoveListCallbacks) {
    this.element = document.createElement("div");
    this.element.className = "movelist";
  }

  /** No game loaded — nothing to list. */
  clear(): void {
    this.element.textContent = "";
  }

  render(state: EngineState): void {
    this.element.textContent = "";

    // Blocks are keyed by the number of main-line plies they follow, so they can
    // be spliced in as the main line is emitted.
    const blocks = new Map<number, HTMLElement[]>();
    const addBlock = (at: number, block: HTMLElement): void => {
      const existing = blocks.get(at);
      if (existing) existing.push(block);
      else blocks.set(at, [block]);
    };

    for (const variant of state.variants) {
      addBlock(variant.startIndex, this.variantBlock(variant, state));
    }
    // A turn started from the main line has no variant to live in yet.
    if (state.pending && !state.activeVariant) {
      addBlock(state.index, this.pendingBlock(state));
    }

    const emitBlocks = (at: number): void => {
      for (const block of blocks.get(at) ?? []) this.element.appendChild(block);
    };

    emitBlocks(0);
    state.game.moves.forEach((move, ply) => {
      const isActive = state.activeVariant === undefined && state.index === ply + 1;
      this.element.appendChild(
        this.row(move, ply, isActive, () => this.callbacks.onSelectMain(ply + 1))
      );
      emitBlocks(ply + 1);
    });

    this.element.querySelector<HTMLElement>(ACTIVE_SELECTOR)?.scrollIntoView({ block: "nearest" });
  }

  // --- Rows -----------------------------------------------------------------

  private row(
    move: Move,
    ply: number,
    isActive: boolean,
    onClick: () => void,
    variantRow = false
  ): HTMLElement {
    const row = document.createElement("button");
    row.className = "movelist__row";
    if (variantRow) row.classList.add("movelist__row--variant");
    if (isActive) row.classList.add("movelist__row--active");
    row.dataset["ply"] = String(ply);
    row.innerHTML = this.rowInner(move.color, ply, move.displayNotation);
    row.addEventListener("click", onClick);
    return row;
  }

  private rowInner(color: Color, ply: number, notation: string): string {
    const turn = Math.floor(ply / 2) + 1;
    const prefix = color === Color.White ? `${turn}.` : `${turn}…`;
    const tag = color === Color.White ? "W" : "B";
    return (
      `<span class="movelist__num">${prefix}</span>` +
      `<span class="movelist__color movelist__color--${tag.toLowerCase()}">${tag}</span>` +
      `<span class="movelist__notation">${notation}</span>`
    );
  }

  /** The turn currently being clicked out, shown before it is committed. */
  private pendingRow(state: EngineState): HTMLElement {
    const pending = state.pending!;
    const notation = formatParts(pending.parts) + "…";
    const row = document.createElement("div");
    row.className =
      "movelist__row movelist__row--variant movelist__row--pending movelist__row--active";
    row.innerHTML = this.rowInner(pending.color, state.ply, notation);
    row.title = i18n.t("variant.pending.title");
    return row;
  }

  // --- Variant blocks -------------------------------------------------------

  private variantBlock(variant: Variant, state: EngineState): HTMLElement {
    const isActive = state.activeVariant?.id === variant.id;
    const block = this.block(isActive);
    block.appendChild(this.header(variant, state, isActive));

    variant.moves.forEach((move, index) => {
      const rowActive = isActive && state.pending === undefined && state.variantIndex === index + 1;
      block.appendChild(
        this.row(move, variant.plyOf(index), rowActive, () =>
          this.callbacks.onSelectVariant(variant.id, index + 1), true)
      );
    });

    if (isActive && state.pending) block.appendChild(this.pendingRow(state));
    return block;
  }

  /** A turn under construction that has not yet created its variant. */
  private pendingBlock(state: EngineState): HTMLElement {
    const block = this.block(true);
    const header = document.createElement("div");
    header.className = "variant__header";
    const title = document.createElement("span");
    title.className = "variant__title";
    title.textContent = i18n.t("variant.new");
    header.appendChild(title);
    block.append(header, this.pendingRow(state));
    return block;
  }

  private block(isActive: boolean): HTMLElement {
    const block = document.createElement("div");
    block.className = "variant";
    if (isActive) block.classList.add("variant--active");
    return block;
  }

  private header(variant: Variant, state: EngineState, isActive: boolean): HTMLElement {
    const header = document.createElement("div");
    header.className = "variant__header";

    const title = document.createElement("button");
    title.className = "variant__title variant__title--button";
    const turn = Math.floor(variant.startIndex / 2) + 1;
    title.textContent = i18n.t("variant.name", { id: variant.id });
    title.title = i18n.t("variant.from.title", { turn, plies: variant.startIndex });
    // Selecting the header shows the branch point itself, inside the variant.
    title.addEventListener("click", () => this.callbacks.onSelectVariant(variant.id, 0));
    if (isActive && state.variantIndex === 0 && !state.pending) {
      title.classList.add("variant__title--active");
    }

    const remove = document.createElement("button");
    remove.className = "variant__delete";
    remove.textContent = "×";
    remove.title = i18n.t("variant.delete.title");
    remove.addEventListener("click", () => this.callbacks.onDeleteVariant(variant.id));

    header.append(title, remove);
    return header;
  }
}
