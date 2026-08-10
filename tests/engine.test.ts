import { describe, expect, it } from "vitest";
import { GameParser } from "../src/parser/GameParser";
import { GameEngine } from "../src/engine/GameEngine";
import { Rules } from "../src/engine/Rules";
import { Board } from "../src/model/Board";
import { Color, PieceType } from "../src/model/Piece";
import { Position } from "../src/model/Position";

const POS =
  "cBbCbcBCCBBcabaBbCcCbbbCCACAcbcbcBccBCCBaAAacCCcaacCACcCccAB";

const FULL_GAME =
  "(;FF[TZAAR]VA[RANDOM]EV[e]PB[b]PW[w]POS[" +
  POS +
  "]SO[s];W[npmq];B[prqq-kplp];W[smrn-pqqp];B[lqmp-lpmp];W[omnm-mnnm];" +
  "B[mpmo-lomo];W[nonq-nqop];B[monn-nsnr];W[nmpm-opmr];B[nror-orqp];" +
  "W[mrpo-pmqm];B[rorn-qpsn];W[slrm-qmrm];B[nnkq-snsk];W[oqms-rmrl];" +
  "B[skrk-rkqk];W[qlqn-rlpl];B[qkqn-qnpo];W[plkq-onln];B[lrmq-pols];" +
  "W[lnpn-mspp];B[lsks-ksmq];W[kqkr-mmnl];B[sorp-rnrp];W[ppqo-pnpk];" +
  "B[qqqo-olok];W[pkok-nlko])";

function at(board: Board, code: string) {
  return board.get(Position.fromCode(code));
}

describe("Board.fromPosition", () => {
  const board = Board.fromPosition(POS);

  it("places the correct colour and type at decoded coordinates", () => {
    const np = at(board, "np");
    const mq = at(board, "mq");
    expect(np?.color).toBe(Color.White);
    expect(mq?.color).toBe(Color.Black);
    expect(np?.type).toBe(PieceType.Tzarra); // POS[22] = 'b'
    expect(mq?.type).toBe(PieceType.Tzarra); // POS[15] = 'B'
  });

  it("has the correct piece census (30 per colour, 15/9/6 per type)", () => {
    const tally = new Map<string, number>();
    for (const { stack } of board.entries()) {
      tally.set(`${stack.color}:${stack.type}`, (tally.get(`${stack.color}:${stack.type}`) ?? 0) + 1);
    }
    for (const color of [Color.White, Color.Black]) {
      expect(tally.get(`${color}:${PieceType.Tott}`)).toBe(15);
      expect(tally.get(`${color}:${PieceType.Tzarra}`)).toBe(9);
      expect(tally.get(`${color}:${PieceType.Tzaar}`)).toBe(6);
    }
  });
});

describe("Rules.applyPart", () => {
  const board = Board.fromPosition(POS);

  it("captures: mover relocates and enemy is removed", () => {
    const move = { from: Position.fromCode("np"), to: Position.fromCode("mq") };
    const { board: next, kind } = Rules.applyPart(board, move);
    expect(kind).toBe("capture");
    expect(at(next, "np")).toBeUndefined();
    expect(at(next, "mq")?.color).toBe(Color.White);
    expect(at(next, "mq")?.height).toBe(1);
  });

  it("stacks: friendly pieces merge and heights add up", () => {
    const move = { from: Position.fromCode("kp"), to: Position.fromCode("lp") };
    const { board: next, kind } = Rules.applyPart(board, move);
    expect(kind).toBe("stack");
    expect(at(next, "kp")).toBeUndefined();
    expect(at(next, "lp")?.color).toBe(Color.Black);
    expect(at(next, "lp")?.height).toBe(2);
  });

  it("throws when moving from an empty point", () => {
    const move = { from: Position.fromCode("np"), to: Position.fromCode("mq") };
    const empty = board.remove(move.from);
    expect(() => Rules.applyPart(empty, move)).toThrow(/No piece/);
  });
});

describe("GameEngine navigation", () => {
  const game = new GameParser().parse(FULL_GAME);
  const engine = new GameEngine();
  engine.load(game);

  it("replays the whole game without illegal state", () => {
    expect(game.moves).toHaveLength(27);
    engine.last();
    expect(engine.index).toBe(27);
  });

  it("first() returns to the initial position", () => {
    engine.last();
    engine.first();
    expect(engine.index).toBe(0);
    expect(at(engine.board, "np")?.color).toBe(Color.White);
  });

  it("next()/previous() are inverse operations", () => {
    engine.first();
    engine.next();
    engine.next();
    const boardAt2 = engine.board;
    engine.previous();
    engine.next();
    expect(engine.board).toBe(boardAt2); // same cached snapshot
    expect(engine.index).toBe(2);
  });

  it("goTo clamps out-of-range indices", () => {
    engine.goTo(999);
    expect(engine.index).toBe(27);
    engine.goTo(-5);
    expect(engine.index).toBe(0);
  });

  it("reports whose turn it is", () => {
    engine.first();
    expect(engine.snapshot().toMove).toBe(Color.White);
    engine.next();
    expect(engine.snapshot().toMove).toBe(Color.Black);
  });

  it("exposes the current move after stepping", () => {
    engine.first();
    engine.next();
    expect(engine.currentMove?.notation).toBe("npmq");
  });
});

/** A real LittleGolem record (game 2558925) in which Black declines an action. */
const GAME_WITH_PASS =
  "(;FF[TZAAR]VA[RANDOM]EV[tzaar.ld.RANDOM]PB[SlowBrain]PW[ivyed_seer ?]" +
  "POS[acccCBaaACbccBCCcbbBCBCcCbCabCBACCccbCACAACbccbcabBaBcBBcCAc]" +
  "SO[https://www.littlegolem.net];W[qmrl];B[okol-popn];W[qnop-rmop];B[onom-nmnn];" +
  "W[nqnp-opnp];B[nopm-nnom];W[qopp-nppp];B[pnrl-pmom];W[pprn-slmr];B[rlql-ommo];" +
  "W[plpq-rnrk];B[qlqp-momp];W[pqoq-rkro];B[snmn-mpqp];W[qqpr-roso];B[smmm-mnln];" +
  "W[nlmm-msmr];B[lqkq-lrks];W[lpkq-kpkq];B[olpk-mqks];W[lopk-mrkr];B[ksls-oros];" +
  "W[nsnr-kqko];B[qkpk-lnls];W[sosk-prnr];B[osoq-pass];W[nroq-skpk])";

describe("GameEngine with a passed action", () => {
  const game = new GameParser().parse(GAME_WITH_PASS);
  const engine = new GameEngine();
  engine.load(game);

  it("replays the whole record, pass included", () => {
    expect(game.moves).toHaveLength(27);
    engine.last();
    expect(engine.index).toBe(27);
  });

  it("applies only the capture of the passed turn", () => {
    const passing = game.moves[25];
    expect(passing.passed).toBe(true);
    expect(passing.parts).toHaveLength(1);

    engine.goTo(25);
    const before = engine.board;
    engine.next();
    expect(at(engine.board, "os")).toBeUndefined(); // the capturer left
    expect(at(engine.board, "oq")?.color).toBe(at(before, "os")?.color);
  });
});
