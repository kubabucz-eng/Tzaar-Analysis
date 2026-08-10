import { i18n } from "../i18n/I18n";
import { MessageKey } from "../i18n/messages";
import { ViewSettings } from "../view/ViewSettings";

export interface ViewSwitchCallbacks {
  onToggleBoard(): void;
  onTogglePieces(): void;
  onToggleOrientation(): void;
}

interface Switch {
  readonly element: HTMLButtonElement;
  readonly icon: string;
  /** Reads the label and tooltip for whatever the setting is now. */
  readonly state: () => { value: MessageKey; hint: MessageKey };
}

/**
 * Floating presentation toggles pinned to the lower-left corner: how the board
 * is drawn, which piece set is used, and which way the board faces. Each button
 * shows the setting currently in force; its tooltip says what a click switches
 * to. Like the language switch, this reports intent through callbacks only.
 */
export class ViewSwitches {
  readonly element: HTMLElement;
  private readonly switches: Switch[];

  constructor(settings: ViewSettings, callbacks: ViewSwitchCallbacks) {
    this.element = document.createElement("div");
    this.element.className = "viewswitches";

    this.switches = [
      this.add("⬡", callbacks.onToggleBoard, () =>
        settings.board === "dots"
          ? { value: "view.board.dots", hint: "view.board.toLines" }
          : { value: "view.board.lines", hint: "view.board.toDots" }
      ),
      this.add("◉", callbacks.onTogglePieces, () =>
        settings.pieces === "classic"
          ? { value: "view.pieces.classic", hint: "view.pieces.toColored" }
          : { value: "view.pieces.colored", hint: "view.pieces.toClassic" }
      ),
      this.add("⟲", callbacks.onToggleOrientation, () =>
        settings.orientation === "standard"
          ? { value: "view.orientation.standard", hint: "view.orientation.toLittleGolem" }
          : { value: "view.orientation.littlegolem", hint: "view.orientation.toStandard" }
      ),
    ];
    this.localize();
  }

  /** Re-render every button for the current settings and language. */
  localize(): void {
    for (const item of this.switches) {
      const { value, hint } = item.state();
      item.element.innerHTML =
        `<span class="viewswitch__icon" aria-hidden="true">${item.icon}</span>` +
        `<span class="viewswitch__value">${i18n.t(value)}</span>`;
      item.element.title = i18n.t(hint);
      item.element.setAttribute("aria-label", i18n.t(hint));
    }
  }

  private add(icon: string, onClick: () => void, state: Switch["state"]): Switch {
    const element = document.createElement("button");
    element.className = "viewswitch";
    element.type = "button";
    element.addEventListener("click", onClick);
    this.element.appendChild(element);
    return { element, icon, state };
  }
}
