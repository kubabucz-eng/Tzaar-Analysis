import { EngineState } from "../engine/GameEngine";
import { i18n } from "../i18n/I18n";
import { MessageKey } from "../i18n/messages";
import { Color } from "../model/Piece";

export interface ToolbarCallbacks {
  onOpenFile(file: File): void;
  onReset(): void;
  onFirst(): void;
  onPrevious(): void;
  onNext(): void;
  onLast(): void;
  onFinishTurn(): void;
  onCancelTurn(): void;
  onLeaveVariant(): void;
  onDeleteVariant(): void;
}

/** A button plus the message keys it is labelled from, so it can be relabelled. */
interface Labelled {
  readonly element: HTMLElement;
  readonly label?: MessageKey;
  readonly title?: MessageKey;
}

/**
 * The top toolbar. Pure presentation + input: it reports user intent through
 * callbacks and never touches the game rules or the engine directly. `update`
 * only enables the variant controls that currently apply and explains, in the
 * hint, what a click on the board would do; `localize` re-applies every label in
 * the current language.
 */
export class Toolbar {
  readonly element: HTMLElement;
  private readonly fileInput: HTMLInputElement;
  private readonly finish: HTMLButtonElement;
  private readonly cancel: HTMLButtonElement;
  private readonly leave: HTMLButtonElement;
  private readonly remove: HTMLButtonElement;
  private readonly hint: HTMLElement;
  private readonly labelled: Labelled[] = [];
  private lastState: EngineState | undefined;

  constructor(callbacks: ToolbarCallbacks) {
    this.element = document.createElement("div");
    this.element.className = "toolbar";

    this.fileInput = document.createElement("input");
    this.fileInput.type = "file";
    this.fileInput.accept = ".txt,.sgf,.tzaar";
    this.fileInput.hidden = true;
    this.fileInput.addEventListener("change", () => {
      const file = this.fileInput.files?.[0];
      if (file) callbacks.onOpenFile(file);
      this.fileInput.value = "";
    });

    const open = this.button("toolbar.open", () => this.fileInput.click());
    const reset = this.button("toolbar.reset", callbacks.onReset);
    const first = this.iconButton("«", callbacks.onFirst, "toolbar.first.title");
    const prev = this.iconButton("‹", callbacks.onPrevious, "toolbar.previous.title");
    const next = this.iconButton("›", callbacks.onNext, "toolbar.next.title");
    const last = this.iconButton("»", callbacks.onLast, "toolbar.last.title");

    this.finish = this.button("toolbar.finish", callbacks.onFinishTurn, "toolbar.finish.title");
    this.cancel = this.button("toolbar.cancel", callbacks.onCancelTurn, "toolbar.cancel.title");
    this.leave = this.button("toolbar.leave", callbacks.onLeaveVariant, "toolbar.leave.title");
    this.remove = this.button("toolbar.delete", callbacks.onDeleteVariant, "toolbar.delete.title");

    this.hint = document.createElement("span");
    this.hint.className = "toolbar__hint";

    this.element.append(
      open,
      reset,
      this.separator(),
      first,
      prev,
      next,
      last,
      this.separator(),
      this.finish,
      this.cancel,
      this.leave,
      this.remove,
      this.hint,
      this.fileInput
    );
    this.setEnabled(this.finish, false);
    this.setEnabled(this.cancel, false);
    this.setEnabled(this.leave, false);
    this.setEnabled(this.remove, false);
  }

  update(state: EngineState): void {
    this.lastState = state;
    const inVariant = state.activeVariant !== undefined;
    this.setEnabled(this.finish, state.canFinishTurn);
    this.setEnabled(this.cancel, state.pending !== undefined);
    this.setEnabled(this.leave, inVariant);
    this.setEnabled(this.remove, inVariant);
    this.hint.textContent = this.hintFor(state);
  }

  /** No game loaded — nothing to navigate or analyse yet. */
  clear(): void {
    this.lastState = undefined;
    this.setEnabled(this.finish, false);
    this.setEnabled(this.cancel, false);
    this.setEnabled(this.leave, false);
    this.setEnabled(this.remove, false);
    this.hint.textContent = i18n.t("hint.openFile");
  }

  /** Re-apply every label in the current language, keeping the hint in step. */
  localize(): void {
    for (const item of this.labelled) {
      if (item.label) item.element.textContent = i18n.t(item.label);
      if (item.title) item.element.title = i18n.t(item.title);
    }
    this.hint.textContent = this.lastState
      ? this.hintFor(this.lastState)
      : i18n.t("hint.openFile");
  }

  private hintFor(state: EngineState): string {
    const side = i18n.t(state.toMove === Color.White ? "color.white" : "color.black");
    if (state.pending) return i18n.t("hint.second", { side });
    // The opening turn of the game is a lone capture, with no second action.
    return i18n.t(state.ply === 0 ? "hint.openingTurn" : "hint.capture", { side });
  }

  private setEnabled(button: HTMLButtonElement, enabled: boolean): void {
    button.disabled = !enabled;
  }

  private button(label: MessageKey, onClick: () => void, title?: MessageKey): HTMLButtonElement {
    return this.register(i18n.t(label), onClick, { label, title });
  }

  /** A button whose face is a glyph, so only its tooltip is translated. */
  private iconButton(icon: string, onClick: () => void, title: MessageKey): HTMLButtonElement {
    return this.register(icon, onClick, { title });
  }

  private register(
    face: string,
    onClick: () => void,
    keys: { label?: MessageKey; title?: MessageKey }
  ): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "toolbar__button";
    btn.textContent = face;
    if (keys.title) btn.title = i18n.t(keys.title);
    btn.addEventListener("click", onClick);
    this.labelled.push({ element: btn, ...keys });
    return btn;
  }

  private separator(): HTMLElement {
    const sep = document.createElement("span");
    sep.className = "toolbar__separator";
    return sep;
  }
}
