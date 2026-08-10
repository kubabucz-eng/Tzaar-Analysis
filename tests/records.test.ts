import { describe, expect, it } from "vitest";
import { GameParser } from "../src/parser/GameParser";
import { GameEngine } from "../src/engine/GameEngine";

/**
 * Every record shipped with the app must load and replay end to end. This is the
 * guard against notation the parser has not met yet — the kind of failure that
 * only shows up on a real game (a declined action written as "pass", say).
 *
 * The files are pulled in through Vite the same way `main.ts` bundles the sample
 * game, so adding a record to either folder puts it under test automatically.
 */
const RECORDS: Record<string, string> = {
  ...import.meta.glob("../Games/*", { query: "?raw", import: "default", eager: true }),
  ...import.meta.glob("../samples/*", { query: "?raw", import: "default", eager: true }),
};

describe("bundled game records", () => {
  const files = Object.keys(RECORDS);

  it("finds records to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s loads and replays to the end", (file) => {
    const game = new GameParser().parse(RECORDS[file]);
    expect(game.initialPosition).toHaveLength(60);
    expect(game.moves.length).toBeGreaterThan(0);

    const engine = new GameEngine();
    engine.load(game); // throws on any unparsable or illegal move
    engine.last();
    expect(engine.index).toBe(game.moves.length);
  });
});
