import { describe, expect, it } from "vitest";
import { GameParser } from "../src/parser/GameParser";
import { GameEngine } from "../src/engine/GameEngine";
import { Rules } from "../src/engine/Rules";
import { Color } from "../src/model/Piece";
import { Position } from "../src/model/Position";

const POS =
  "cBbCbcBCCBBcabaBbCcCbbbCCACAcbcbcBccBCCBaAAacCCcaacCACcCccAB";

const FULL_GAME =
  "(;FF[TZAAR]VA[RANDOM]EV[e]PB[b]PW[w]POS[" +
  POS +
  "]SO[s];W[npmq];B[prqq-kplp];W[smrn-pqqp];B[lqmp-lpmp];W[omnm-mnnm])";

const at = (code: string) => Position.fromCode(code);
const has = (list: readonly Position[], code: string) =>
  list.some((position) => position.equals(at(code)));

function engineAt(index: number): GameEngine {
  const engine = new GameEngine();
  engine.load(new GameParser().parse(FULL_GAME));
  engine.goTo(index);
  return engine;
}

/** Play a full legal turn for the side to move, ending on the mandatory capture. */
function playAnyCapture(engine: GameEngine, skip = 0): string {
  const origin = engine.movableOrigins()[skip];
  engine.playPart(origin, engine.targetsFrom(origin)[0]);
  engine.finishTurn();
  return engine.activeVariant!.moves[engine.variantIndex - 1].notation;
}

describe("Variant turn construction", () => {
  it("holds the turn open after the mandatory capture", () => {
    const engine = engineAt(2);
    expect(engine.sideToMove).toBe(Color.White);
    expect(engine.playPart(at("ko"), at("lo"))).toBe(true);

    expect(engine.pending?.parts).toHaveLength(1);
    expect(engine.variants).toHaveLength(0); // not committed yet
    expect(engine.board.get(at("lo"))?.color).toBe(Color.White);
    expect(engine.board.get(at("ko"))).toBeUndefined();
  });

  it("commits a one-action turn on finishTurn", () => {
    const engine = engineAt(2);
    engine.playPart(at("ko"), at("lo"));
    engine.finishTurn();

    expect(engine.pending).toBeUndefined();
    expect(engine.variants).toHaveLength(1);
    const variant = engine.activeVariant!;
    expect(variant.startIndex).toBe(2);
    expect(variant.moves).toHaveLength(1);
    // Stopping after the capture is a declined second action, as records write it.
    expect(variant.moves[0].notation).toBe("kolo-pass");
    expect(variant.moves[0].passed).toBe(true);
    expect(variant.moves[0].ply).toBe(2);
    expect(engine.variantIndex).toBe(1);
    expect(engine.ply).toBe(3);
    expect(engine.index).toBe(2); // the main-line cursor stays at the branch point
    expect(engine.sideToMove).toBe(Color.Black);
  });

  it("auto-commits after a second action and stacks onto the capturer", () => {
    const engine = engineAt(2);
    engine.playPart(at("ko"), at("lo"));
    expect(engine.playPart(at("ln"), at("lo"))).toBe(true);

    expect(engine.pending).toBeUndefined();
    const move = engine.activeVariant!.moves[0];
    expect(move.parts).toHaveLength(2);
    expect(move.notation).toBe("kolo-lnlo");
    expect(engine.board.get(at("lo"))?.height).toBe(2);
    expect(engine.board.get(at("lo"))?.color).toBe(Color.White);
  });

  it("allows stacking only as the second action", () => {
    const engine = engineAt(2);
    engine.playPart(at("ko"), at("lo")); // lo is now a friendly piece
    const board = engine.board;

    expect(has(Rules.turnTargets(board, at("ln"), "capture"), "lo")).toBe(false);
    expect(has(Rules.turnTargets(board, at("ln"), "any"), "lo")).toBe(true);
    expect(engine.turnPhase).toBe("any");
    expect(has(engine.targetsFrom(at("ln")), "lo")).toBe(true);
  });

  it("plays the opening turn of a game as a single capture", () => {
    const engine = engineAt(0);
    expect(engine.playPart(at("np"), at("mq"))).toBe(true);

    expect(engine.pending).toBeUndefined(); // committed immediately
    expect(engine.activeVariant?.moves).toHaveLength(1);
    expect(engine.ply).toBe(1);
    // There is no optional second action to decline in the opening turn.
    expect(engine.activeVariant?.moves[0].passed).toBe(false);
    expect(engine.activeVariant?.moves[0].notation).toBe("npmq");
  });

  it("rejects moving a piece that is not the side to move", () => {
    const engine = engineAt(2);
    expect(engine.playPart(at("lo"), at("ko"))).toBe(false); // lo is Black
    expect(engine.pending).toBeUndefined();
    expect(engine.variants).toHaveLength(0);
  });

  it("cancelTurn restores the position the turn started from", () => {
    const engine = engineAt(2);
    const before = engine.board;
    engine.playPart(at("ko"), at("lo"));
    engine.cancelTurn();

    expect(engine.pending).toBeUndefined();
    expect(engine.board).toBe(before);
    expect(engine.variants).toHaveLength(0);
  });
});

describe("Variant navigation", () => {
  function twoMoveVariant(): GameEngine {
    const engine = engineAt(2);
    engine.playPart(at("ko"), at("lo"));
    engine.finishTurn();
    playAnyCapture(engine); // Black replies
    return engine;
  }

  it("steps back and forth inside the variant", () => {
    const engine = twoMoveVariant();
    expect(engine.activeVariant?.length).toBe(2);
    expect(engine.variantIndex).toBe(2);

    engine.previous();
    expect(engine.variantIndex).toBe(1);
    expect(engine.activeVariant).toBeDefined();

    engine.next();
    expect(engine.variantIndex).toBe(2);
    expect(engine.ply).toBe(4);
  });

  it("leaves the variant when stepping back past its branch point", () => {
    const engine = twoMoveVariant();
    engine.goToVariant(engine.activeVariant!.id, 0);
    expect(engine.activeVariant).toBeDefined();
    // Index 0 of a variant is the branch point: the main-line position itself.
    expect(engine.board).toEqual(engineAt(2).board);

    engine.previous();
    expect(engine.activeVariant).toBeUndefined();
    expect(engine.index).toBe(1); // one main-line ply before the branch
  });

  it("goTo on the main line leaves the variant", () => {
    const engine = twoMoveVariant();
    engine.goTo(4);
    expect(engine.activeVariant).toBeUndefined();
    expect(engine.variantIndex).toBe(0);
    expect(engine.ply).toBe(4);
    expect(engine.variants).toHaveLength(1); // the variant itself is kept
  });

  it("last() stays inside the active variant", () => {
    const engine = twoMoveVariant();
    engine.goToVariant(engine.activeVariant!.id, 0);
    engine.last();
    expect(engine.variantIndex).toBe(2);
  });

  it("keeps several independent variants", () => {
    const engine = twoMoveVariant();
    engine.goTo(4);
    playAnyCapture(engine);

    expect(engine.variants).toHaveLength(2);
    expect(engine.variants[0].startIndex).toBe(2);
    expect(engine.variants[1].startIndex).toBe(4);
    expect(engine.activeVariant?.id).toBe(engine.variants[1].id);
  });

  it("opens a sibling line when replaying from a variant's branch point", () => {
    const engine = twoMoveVariant();
    const first = engine.activeVariant!;
    engine.goToVariant(first.id, 0);
    playAnyCapture(engine, 1);

    expect(first.length).toBe(2); // untouched
    expect(engine.variants).toHaveLength(2);
    expect(engine.activeVariant?.id).not.toBe(first.id);
    expect(engine.activeVariant?.startIndex).toBe(2);
  });

  it("deleteVariant drops the line and returns to its branch point", () => {
    const engine = twoMoveVariant();
    const id = engine.activeVariant!.id;
    engine.deleteVariant(id);

    expect(engine.variants).toHaveLength(0);
    expect(engine.activeVariant).toBeUndefined();
    expect(engine.index).toBe(2);
  });

  it("replaying from the middle of a variant replaces its tail", () => {
    const engine = twoMoveVariant();
    const variant = engine.activeVariant!;
    const replaced = variant.moves[1].notation;

    engine.goToVariant(variant.id, 1);
    const notation = playAnyCapture(engine, 1); // a different Black reply

    expect(notation).not.toBe(replaced);
    expect(variant.length).toBe(2);
    expect(variant.moves[1].notation).toBe(notation);
    expect(engine.variantIndex).toBe(2);
  });
});

describe("Variant state reporting", () => {
  it("reports the line, ply and pending turn to the UI", () => {
    const engine = engineAt(2);
    engine.playPart(at("ko"), at("lo"));

    const state = engine.snapshot();
    expect(state.pending?.parts).toHaveLength(1);
    expect(state.canFinishTurn).toBe(true);
    expect(state.ply).toBe(2); // still building the ply-2 turn
    expect(state.toMove).toBe(Color.White);
    expect(state.board).toBe(engine.pending?.board);

    engine.finishTurn();
    const after = engine.snapshot();
    expect(after.activeVariant?.moves).toHaveLength(1);
    expect(after.variantIndex).toBe(1);
    expect(after.currentMove?.notation).toBe("kolo-pass");
    expect(after.canFinishTurn).toBe(false);
  });

  it("clears variants when a new game is loaded", () => {
    const engine = engineAt(2);
    engine.playPart(at("ko"), at("lo"));
    engine.finishTurn();

    engine.load(new GameParser().parse(FULL_GAME));
    expect(engine.variants).toHaveLength(0);
    expect(engine.activeVariant).toBeUndefined();
    expect(engine.pending).toBeUndefined();
    expect(engine.index).toBe(0);
  });
});
