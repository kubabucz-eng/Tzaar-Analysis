import { EngineState } from "../engine/GameEngine";
import { i18n } from "../i18n/I18n";
import { formatParts } from "../model/Move";
import { Color } from "../model/Piece";

/** Read-only information panel: game metadata and current-move details. */
export class InfoPanel {
  readonly element: HTMLElement;
  private readonly meta: HTMLElement;
  private readonly details: HTMLElement;

  constructor() {
    this.element = document.createElement("div");
    this.element.className = "info";

    this.meta = document.createElement("div");
    this.meta.className = "info__meta";

    this.details = document.createElement("div");
    this.details.className = "info__details";

    this.element.append(this.meta, this.details);
    this.clear();
  }

  /** No game loaded — say so rather than showing a panel of dashes. */
  clear(): void {
    this.meta.innerHTML = "";
    this.details.innerHTML = `<div class="info__empty">${i18n.t("info.noGame")}</div>`;
  }

  update(state: EngineState): void {
    const { game } = state;
    const none = i18n.t("info.none");

    this.meta.innerHTML =
      this.field(i18n.t("info.event"), game.meta.event || none) +
      this.field(i18n.t("info.white"), game.meta.playerWhite) +
      this.field(i18n.t("info.black"), game.meta.playerBlack) +
      this.field(i18n.t("info.setup"), game.meta.variant || none);

    const move = state.currentMove;
    const moverName =
      move?.color === Color.White
        ? game.meta.playerWhite
        : move?.color === Color.Black
          ? game.meta.playerBlack
          : none;

    const variant = state.activeVariant;
    const line = variant
      ? i18n.t("info.variantLine", { id: variant.id, plies: variant.startIndex })
      : i18n.t("info.mainLine");
    const lastMove = state.pending
      ? i18n.t("info.inProgress", { notation: formatParts(state.pending.parts) })
      : move
        ? move.displayNotation
        : none;

    this.details.innerHTML =
      this.field(i18n.t("info.line"), line) +
      this.field(
        i18n.t("info.moveNumber"),
        state.ply === 0 ? i18n.t("info.startPosition") : String(state.ply)
      ) +
      this.field(
        i18n.t("info.movesPlayed"),
        variant
          ? i18n.t("info.inVariant", { count: state.variantIndex })
          : `${state.index} / ${state.total}`
      ) +
      this.field(i18n.t("info.lastMove"), lastMove) +
      this.field(
        i18n.t("info.player"),
        move ? `${this.colorLabel(move.color)} — ${moverName}` : none
      ) +
      this.field(
        i18n.t("info.toMove"),
        state.toMove ? this.colorLabel(state.toMove) : i18n.t("info.gameOver")
      );
  }

  private colorLabel(color: Color): string {
    return i18n.t(color === Color.White ? "color.white" : "color.black");
  }

  private field(label: string, value: string): string {
    return (
      `<div class="info__row"><span class="info__label">${label}</span>` +
      `<span class="info__value">${value}</span></div>`
    );
  }
}
