import { describe, expect, it } from "vitest";
import { GameParser } from "../src/parser/GameParser";
import { Position, allPositions } from "../src/model/Position";
import { ViewSettings } from "../src/view/ViewSettings";

const at = (code: string) => Position.fromCode(code);
const labels = () => allPositions().map((point) => point.label);

describe("board labelling", () => {
  it("names all 60 points uniquely", () => {
    const all = labels();
    expect(all).toHaveLength(60);
    expect(new Set(all).size).toBe(60);
    for (const label of all) expect(label).toMatch(/^[A-I][1-9]$/);
  });

  it("keeps the central hole at E5", () => {
    // The hole is not playable, so no point may claim its name.
    expect(labels()).not.toContain("E5");
  });

  /** Points read off game 2558925, whose notation is known. */
  it("counts ranks down from the top of each column", () => {
    expect(at("qm").label).toBe("G5");
    expect(at("rl").label).toBe("H5");
    expect(at("ok").label).toBe("E9");
    expect(at("ol").label).toBe("E8");
    expect(at("po").label).toBe("F4");
    expect(at("pn").label).toBe("F5");
  });

  /**
   * The two ends of every file — the points the board frame names. Files A–D
   * are the ones that distinguish this scheme from counting along the x + y
   * diagonal; the recorded moves above all fall on E–I, where the two agree.
   */
  it("names both ends of every file", () => {
    const ends: Record<string, string> = {
      ks: "A1", ls: "B1", ms: "C1", ns: "D1", os: "E1",
      pr: "F1", qq: "G1", rp: "H1", so: "I1",
      ko: "A5", ln: "B6", mm: "C7", nl: "D8", ok: "E9",
      pk: "F8", qk: "G7", rk: "H6", sk: "I5",
    };
    for (const [code, label] of Object.entries(ends)) {
      expect(at(code).label, code).toBe(label);
    }
  });

  it("writes the notation of a real record the way LittleGolem does", () => {
    const game = new GameParser().parse(
      "(;FF[TZAAR]POS[acccCBaaACbccBCCcbbBCBCcCbCabCBACCccbCACAACbccbcabBaBcBBcCAc]" +
        ";W[qmrl];B[okol-popn])"
    );
    expect(game.moves[0].displayNotation).toBe("G5H5");
    expect(game.moves[1].displayNotation).toBe("E9E8-F4F5");
    // The recorded token itself is never rewritten.
    expect(game.moves[1].notation).toBe("okol-popn");
  });
});

describe("ViewSettings", () => {
  it("starts on the current look and toggles each aspect independently", () => {
    const settings = new ViewSettings({
      board: "dots",
      pieces: "classic",
      orientation: "standard",
    });

    settings.toggleBoard();
    expect(settings.board).toBe("lines");
    expect(settings.pieces).toBe("classic"); // untouched
    expect(settings.orientation).toBe("standard");

    settings.togglePieces();
    settings.toggleOrientation();
    expect(settings.current).toEqual({
      board: "lines",
      pieces: "colored",
      orientation: "littlegolem",
    });
  });

  it("notifies subscribers only on a real change", () => {
    const settings = new ViewSettings({
      board: "dots",
      pieces: "classic",
      orientation: "standard",
    });
    let calls = 0;
    const unsubscribe = settings.subscribe(() => (calls += 1));

    settings.update({ board: "dots" }); // same value
    expect(calls).toBe(0);

    settings.update({ board: "lines" });
    expect(calls).toBe(1);

    unsubscribe();
    settings.update({ board: "dots" });
    expect(calls).toBe(1);
  });
});
