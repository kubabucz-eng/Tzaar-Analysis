import { i18n } from "../i18n/I18n";

/**
 * Floating language toggle pinned to the lower-right corner of the viewport.
 * It shows the language currently in use; the tooltip says what a click does.
 */
export class LanguageSwitch {
  readonly element: HTMLButtonElement;

  constructor(onToggle: () => void) {
    this.element = document.createElement("button");
    this.element.className = "langswitch";
    this.element.type = "button";
    this.element.addEventListener("click", onToggle);
    this.localize();
  }

  localize(): void {
    const label = i18n.t("lang.switch.title");
    this.element.innerHTML =
      `<span class="langswitch__globe" aria-hidden="true">🌐</span>` +
      `<span class="langswitch__code">${i18n.t("lang.code")}</span>`;
    this.element.title = label;
    this.element.setAttribute("aria-label", label);
  }
}
