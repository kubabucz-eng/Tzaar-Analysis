import { Language, MESSAGES, MessageKey } from "./messages";

const STORAGE_KEY = "tzaar.language";

/**
 * Translation lookup plus the current language, observable so the UI can relabel
 * itself in place. Only the `ui` and `app` layers use it — the model, rules,
 * engine and renderer hold no user-facing text.
 *
 * The choice is remembered in localStorage; otherwise it follows the browser and
 * falls back to Polish.
 */
export class I18n {
  private current: Language;
  private readonly listeners = new Set<() => void>();

  constructor(initial: Language = detectLanguage()) {
    this.current = initial;
  }

  get language(): Language {
    return this.current;
  }

  setLanguage(language: Language): void {
    if (language === this.current) return;
    this.current = language;
    store(language);
    for (const listener of this.listeners) listener();
  }

  toggle(): void {
    this.setLanguage(this.current === "pl" ? "en" : "pl");
  }

  /** Translate `key`, substituting any `{placeholder}` from `params`. */
  t(key: MessageKey, params?: Readonly<Record<string, string | number>>): string {
    const template = MESSAGES[this.current][key];
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
      name in params ? String(params[name]) : whole
    );
  }

  /** Called whenever the language changes; returns an unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

function detectLanguage(): Language {
  const stored = read();
  if (stored) return stored;
  const preferred = typeof navigator !== "undefined" ? navigator.language : "";
  return preferred && !preferred.toLowerCase().startsWith("pl") ? "en" : "pl";
}

/** Storage is best-effort: private-browsing modes may refuse it. */
function read(): Language | undefined {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "pl" || value === "en" ? value : undefined;
  } catch {
    return undefined;
  }
}

function store(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Ignore: the language simply will not persist across reloads.
  }
}

/** Shared instance: every UI component reads from the same language. */
export const i18n = new I18n();
