import { GameEngine, EngineState } from "../engine/GameEngine";
import { GameParser } from "../parser/GameParser";
import { i18n } from "../i18n/I18n";
import { Board } from "../model/Board";
import { BoardRenderer, Highlight } from "../renderer/BoardRenderer";
import { Position } from "../model/Position";
import { InfoPanel } from "../ui/InfoPanel";
import { LanguageSwitch } from "../ui/LanguageSwitch";
import { MoveList } from "../ui/MoveList";
import { Toolbar } from "../ui/Toolbar";
import { ViewSwitches } from "../ui/ViewSwitches";
import { viewSettings } from "../view/ViewSettings";

/**
 * Composition root. It wires the independent layers together and owns nothing
 * of their internal logic:
 *   parser -> Game model -> engine -> (renderer + UI)
 * The renderer never sees the parser; the UI never sees the rules.
 *
 * The only state kept here is the click-to-play selection, which is pure
 * interaction: the engine owns the variant being built.
 */
export class App {
  private readonly engine = new GameEngine();
  private readonly parser = new GameParser();

  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: BoardRenderer;
  private readonly toolbar: Toolbar;
  private readonly moveList: MoveList;
  private readonly infoPanel: InfoPanel;
  private readonly languageSwitch: LanguageSwitch;
  private readonly viewSwitches: ViewSwitches;
  private boardArea!: HTMLElement;
  private movesTitle!: HTMLElement;
  private infoTitle!: HTMLElement;

  /** Stack picked up on the board, awaiting its destination. */
  private selected: Position | undefined;
  private targets: Position[] = [];

  constructor(private readonly root: HTMLElement) {
    this.toolbar = new Toolbar({
      onOpenFile: (file) => void this.openFile(file),
      onReset: () => this.navigate(() => this.engine.reset()),
      onFirst: () => this.navigate(() => this.engine.first()),
      onPrevious: () => this.navigate(() => this.engine.previous()),
      onNext: () => this.navigate(() => this.engine.next()),
      onLast: () => this.navigate(() => this.engine.last()),
      onFinishTurn: () => this.navigate(() => this.engine.finishTurn()),
      onCancelTurn: () => this.navigate(() => this.engine.cancelTurn()),
      onLeaveVariant: () => this.navigate(() => this.engine.leaveVariant()),
      onDeleteVariant: () => this.deleteActiveVariant(),
    });
    this.moveList = new MoveList({
      onSelectMain: (index) => this.navigate(() => this.engine.goTo(index)),
      onSelectVariant: (id, index) => this.navigate(() => this.engine.goToVariant(id, index)),
      onDeleteVariant: (id) => this.navigate(() => this.engine.deleteVariant(id)),
    });
    this.infoPanel = new InfoPanel();
    this.languageSwitch = new LanguageSwitch(() => i18n.toggle());
    this.viewSwitches = new ViewSwitches(viewSettings, {
      onToggleBoard: () => viewSettings.toggleBoard(),
      onTogglePieces: () => viewSettings.togglePieces(),
      onToggleOrientation: () => viewSettings.toggleOrientation(),
    });

    this.canvas = document.createElement("canvas");
    this.canvas.className = "board__canvas";
    this.renderer = new BoardRenderer(this.canvas);
    this.renderer.setStyle(viewSettings.current);

    this.buildLayout();
    this.engine.subscribe((state) => this.onStateChange(state));
    i18n.subscribe(() => this.localize());
    viewSettings.subscribe(() => this.restyle());
    this.localize();
    this.bindKeyboard();
    this.bindBoard();
    this.observeResize();
  }

  /**
   * Apply a presentation change. Turning the board also renames its points, so
   * the move list and info panel are rebuilt alongside the board itself.
   */
  private restyle(): void {
    this.clearSelection();
    this.renderer.setStyle(viewSettings.current);
    this.viewSwitches.localize();
    this.repaint();
  }

  /**
   * Re-label everything in the current language. Panels driven by engine state
   * are rebuilt wholesale by `repaint`; the rest is relabelled in place.
   */
  private localize(): void {
    document.documentElement.lang = i18n.language;
    document.title = i18n.t("app.title");
    this.movesTitle.textContent = i18n.t("sidebar.moves");
    this.infoTitle.textContent = i18n.t("sidebar.info");
    this.languageSwitch.localize();
    this.viewSwitches.localize();
    this.toolbar.localize();
    this.repaint();
  }

  loadText(text: string): void {
    const game = this.parser.parse(text);
    this.clearSelection();
    this.engine.load(game);
    // buildStates has run inside load(); force the first paint.
    this.renderer.resize();
  }

  private async openFile(file: File): Promise<void> {
    try {
      this.loadText(await file.text());
    } catch (error) {
      alert(i18n.t("app.loadError", { message: (error as Error).message }));
    }
  }

  private onStateChange(state: EngineState): void {
    // While a turn is half-played, highlight what it has done so far.
    const parts = state.pending?.parts ?? state.currentMove?.parts ?? [];
    const highlights: Highlight[] = parts.map((part) => ({ from: part.from, to: part.to }));

    this.renderer.draw(state.board, highlights, {
      selected: this.selected,
      targets: this.targets,
    });
    this.moveList.render(state);
    this.infoPanel.update(state);
    this.toolbar.update(state);
  }

  // --- Playing variants on the board ----------------------------------------

  private bindBoard(): void {
    this.canvas.addEventListener("click", (event) => {
      if (!this.engine.isLoaded) return;
      this.onBoardClick(this.renderer.positionAt(event.clientX, event.clientY));
    });

    // Point at what can be acted on, so the board reads as interactive.
    this.canvas.addEventListener("mousemove", (event) => {
      if (!this.engine.isLoaded) return;
      const point = this.renderer.positionAt(event.clientX, event.clientY);
      this.canvas.classList.toggle(
        "board__canvas--actionable",
        point !== undefined && this.isActionable(point)
      );
    });
    this.canvas.addEventListener("mouseleave", () => {
      this.canvas.classList.remove("board__canvas--actionable");
    });
  }

  private isActionable(point: Position): boolean {
    if (this.targets.some((target) => target.equals(point))) return true;
    return this.engine.targetsFrom(point).length > 0;
  }

  private onBoardClick(point: Position | undefined): void {
    if (!point) {
      this.clearSelection();
      this.repaint();
      return;
    }

    // A click on a highlighted destination plays the action.
    if (this.selected && this.targets.some((target) => target.equals(point))) {
      const from = this.selected;
      this.clearSelection();
      this.engine.playPart(from, point); // emits, which repaints everything
      return;
    }

    // Otherwise it is an attempt to pick up a stack (clicking it again drops it).
    const targets = this.selected?.equals(point) ? [] : this.engine.targetsFrom(point);
    if (targets.length > 0) {
      this.selected = point;
      this.targets = targets;
    } else {
      this.clearSelection();
    }
    this.repaint();
  }

  private deleteActiveVariant(): void {
    const active = this.engine.activeVariant;
    if (active) this.navigate(() => this.engine.deleteVariant(active.id));
  }

  /** Any navigation drops a half-made selection so it cannot leak across positions. */
  private navigate(action: () => void): void {
    this.clearSelection();
    action();
    this.repaint();
  }

  private clearSelection(): void {
    this.selected = undefined;
    this.targets = [];
  }

  /** Redraw from the engine's current state (selection lives outside it). */
  private repaint(): void {
    if (this.engine.isLoaded) this.onStateChange(this.engine.snapshot());
    else this.showEmptyBoard();
  }

  /**
   * Nothing loaded yet: an empty board and empty panels. The board's own points
   * are still drawn, so the layout, styling and orientation switches all work
   * before a game is opened.
   */
  private showEmptyBoard(): void {
    this.renderer.draw(new Board());
    this.moveList.clear();
    this.infoPanel.clear();
    this.toolbar.clear();
  }

  // --- Layout ---------------------------------------------------------------

  private buildLayout(): void {
    this.root.textContent = "";
    this.root.className = "app";

    const body = document.createElement("div");
    body.className = "app__body";

    const left = document.createElement("aside");
    left.className = "sidebar sidebar--left";
    this.movesTitle = document.createElement("h2");
    this.movesTitle.className = "sidebar__title";
    left.append(this.movesTitle, this.moveList.element);

    const boardArea = document.createElement("main");
    boardArea.className = "board";
    boardArea.appendChild(this.canvas);

    const right = document.createElement("aside");
    right.className = "sidebar sidebar--right";
    this.infoTitle = document.createElement("h2");
    this.infoTitle.className = "sidebar__title";
    right.append(this.infoTitle, this.infoPanel.element);

    body.append(left, boardArea, right);
    this.root.append(
      this.toolbar.element,
      body,
      this.viewSwitches.element,
      this.languageSwitch.element
    );
    this.boardArea = boardArea;
  }

  private observeResize(): void {
    const observer = new ResizeObserver(() => this.renderer.resize());
    observer.observe(this.boardArea);
  }

  private bindKeyboard(): void {
    window.addEventListener("keydown", (event) => {
      switch (event.key) {
        case "ArrowLeft":
          this.navigate(() => this.engine.previous());
          break;
        case "ArrowRight":
          this.navigate(() => this.engine.next());
          break;
        case "Home":
          this.navigate(() => this.engine.first());
          break;
        case "End":
          this.navigate(() => this.engine.last());
          break;
        case "Escape":
          this.navigate(() => this.engine.cancelTurn());
          break;
        case "Enter":
          this.navigate(() => this.engine.finishTurn());
          break;
        default:
          return;
      }
      event.preventDefault();
    });
  }
}
