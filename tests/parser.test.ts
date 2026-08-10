import { describe, expect, it } from "vitest";
import { GameParser } from "../src/parser/GameParser";
import { Color } from "../src/model/Piece";

const SAMPLE =
  "(;FF[TZAAR]VA[RANDOM]EV[tzaar.ch.43.1.1]PB[ivyed_seer ?]PW[Michael Reitz]" +
  "POS[cBbCbcBCCBBcabaBbCcCbbbCCACAcbcbcBccBCCBaAAacCCcaacCACcCccAB]" +
  "SO[https://www.littlegolem.net];W[npmq];B[prqq-kplp];W[smrn-pqqp])";

describe("GameParser", () => {
  const game = new GameParser().parse(SAMPLE);

  it("reads metadata", () => {
    expect(game.meta.format).toBe("TZAAR");
    expect(game.meta.variant).toBe("RANDOM");
    expect(game.meta.event).toBe("tzaar.ch.43.1.1");
    expect(game.meta.playerWhite).toBe("Michael Reitz");
    expect(game.meta.playerBlack).toBe("ivyed_seer ?");
    expect(game.meta.source).toBe("https://www.littlegolem.net");
  });

  it("reads the initial position (60 points)", () => {
    expect(game.initialPosition).toHaveLength(60);
  });

  it("reads all moves in order with the right colours", () => {
    expect(game.moves).toHaveLength(3);
    expect(game.moves[0].color).toBe(Color.White);
    expect(game.moves[1].color).toBe(Color.Black);
    expect(game.moves[2].color).toBe(Color.White);
  });

  it("splits a single-part first move", () => {
    const first = game.moves[0];
    expect(first.parts).toHaveLength(1);
    expect(first.parts[0].from.code).toBe("np");
    expect(first.parts[0].to.code).toBe("mq");
  });

  it("splits a two-part move on the dash", () => {
    const second = game.moves[1];
    expect(second.parts).toHaveLength(2);
    expect(second.parts[0].from.code).toBe("pr");
    expect(second.parts[0].to.code).toBe("qq");
    expect(second.parts[1].from.code).toBe("kp");
    expect(second.parts[1].to.code).toBe("lp");
  });

  it("throws when POS is missing", () => {
    expect(() => new GameParser().parse("(;FF[TZAAR];W[npmq])")).toThrow(/POS/);
  });
});

describe("GameParser: declined second actions", () => {
  const withPass = SAMPLE.replace(";W[smrn-pqqp])", ";W[smrn-pqqp];B[osoq-pass])");

  it("reads 'pass' as a declined action, not as coordinates", () => {
    const game = new GameParser().parse(withPass);
    const move = game.moves[3];

    expect(move.parts).toHaveLength(1); // the capture only
    expect(move.parts[0].from.code).toBe("os");
    expect(move.parts[0].to.code).toBe("oq");
    expect(move.passed).toBe(true);
    expect(move.notation).toBe("osoq-pass"); // the record is kept verbatim
    expect(move.displayNotation).toBe("E1E3-pass");
  });

  it("leaves ordinary moves unflagged", () => {
    const game = new GameParser().parse(withPass);
    expect(game.moves[0].passed).toBe(false);
    expect(game.moves[1].passed).toBe(false);
  });

  it("tolerates a whole turn recorded as a pass", () => {
    const game = new GameParser().parse(SAMPLE.replace(";W[smrn-pqqp])", ";W[pass])"));
    const move = game.moves[2];
    expect(move.parts).toHaveLength(0);
    expect(move.passed).toBe(true);
    expect(move.displayNotation).toBe("pass");
  });

  it("still rejects genuinely malformed segments", () => {
    expect(() => new GameParser().parse(SAMPLE.replace(";W[npmq]", ";W[npm]"))).toThrow(
      /Invalid move segment/
    );
  });
});
