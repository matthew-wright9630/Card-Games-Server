import { Schema, MapSchema, type, ArraySchema } from "@colyseus/schema";
import { DeckResponse } from "../../../deckOfCardsApi";

export class Card extends  Schema {
  @type("string") suit = "";
  @type("string") value = "";
  @type("string") code = "";
  @type("string") image = "";
  @type("string") owner = "";
}

export interface DrawResponse extends DeckResponse {
  cards: Card[];
}

export class Player extends Schema {
    @type("string") userName = "";
    @type("string") pileName = "";
    @type([ Card ]) cards = new ArraySchema<Card>();
    @type([ Card ]) discard = new ArraySchema<Card>();
}

export class MyRoomState extends Schema {

  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Player }) readyPlayers = new Set();

}
