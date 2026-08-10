import { Game, GameMeta } from "../model/Game";
import { Move } from "../model/Move";
import { Color } from "../model/Piece";

/**
 * Parser for the LittleGolem SGF-like TZAAR format. Fully independent of the
 * UI, the renderer and the engine: it turns raw text into a `Game` model.
 *
 * Example input:
 *   (;FF[TZAAR]VA[RANDOM]EV[...]PB[...]PW[...]POS[...]SO[...]
 *    ;W[npmq];B[prqq-kplp];W[smrn-pqqp]...)
 */
export class GameParser {
  parse(text: string): Game {
    const position = this.readTag(text, "POS");
    if (position === undefined) {
      throw new Error("Missing POS field: not a valid TZAAR record");
    }

    const meta: GameMeta = {
      format: this.readTag(text, "FF") ?? "TZAAR",
      variant: this.readTag(text, "VA") ?? "",
      event: this.readTag(text, "EV") ?? "",
      playerWhite: this.readTag(text, "PW") ?? "White",
      playerBlack: this.readTag(text, "PB") ?? "Black",
      source: this.readTag(text, "SO") ?? "",
    };

    return new Game(meta, position, this.readMoves(text));
  }

  private readTag(text: string, tag: string): string | undefined {
    const match = new RegExp(`${tag}\\[([^\\]]*)\\]`).exec(text);
    return match ? match[1] : undefined;
  }

  private readMoves(text: string): Move[] {
    // A move node starts with ';' followed by the colour and a bracketed token.
    const moveRegex = /;([WB])\[([^\]]+)\]/g;
    const moves: Move[] = [];
    let match: RegExpExecArray | null;
    let ply = 0;
    while ((match = moveRegex.exec(text)) !== null) {
      const color = match[1] === "W" ? Color.White : Color.Black;
      moves.push(Move.parse(color, match[2], ply));
      ply += 1;
    }
    return moves;
  }
}
