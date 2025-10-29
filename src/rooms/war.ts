import { Room, Delayed, Client } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

import { createNewDeck, shuffleAllCards, drawCard } from "../../deckOfCardsApi";
import { Card, Player } from "./schema/MyRoomState";
import { getCardValue } from "../utils/war";

// ------------------------------
// Constants
// ------------------------------
const TURN_TIMEOUT = 10;

// ------------------------------
// Schema Definition
// ------------------------------
class WarState extends Schema {
  @type("string") currentTurn: string;
  @type("string") deck_id: string;
  @type("number") remaining: number = 0;
  @type({ map: Player }) players = new MapSchema<Player>();
  @type(["string"]) board: ArraySchema<string> = new ArraySchema<string>();
  @type([Card]) currentBattle = new ArraySchema<Card>();
  @type([Card]) warPile = new ArraySchema<Card>();
  @type("string") winner: string;
  @type("string") status: string = "waiting";
}

// ------------------------------
// Room Definition
// ------------------------------
export class WarGame extends Room<WarState> {
  state = new WarState();
  maxClients = 2;
  turnTimeout: Delayed;
  isSinglePlayer: boolean;
  contestedCards: Card;
  roomPassword?: string;

  readyPlayers = new Set();

  // Called when the room is first created
  onCreate(options: any) {
    console.log("WarGame room created");

    this.isSinglePlayer = options.isSinglePlayer === true;
    this.onMessage("ready", (client) => {
      this.readyPlayers.add(client.sessionId);

      if (this.roomPassword) {
      }

      if (options.password) {
        this.roomPassword = options.password;
        console.log(`Room created with password: ${this.roomPassword}`);
      }

      if (this.state.players.size !== this.maxClients) {
        this.broadcast("searching_for_players");
      }
    });
    this.onMessage("create_deck", async (client, data) => {
      console.log("Received create_deck:", data);
      try {
        const { deckCount } = data;
        const deckData = await createNewDeck(deckCount);

        if (!deckData || !deckData.deck_id) {
          throw new Error("Invalid deck data received from API");
        }

        this.state.deck_id = deckData.deck_id;
        this.state.remaining = deckData.remaining;
        this.broadcast("deck_created", deckData);
        console.log(`Deck created: ${deckData.deck_id}`);
      } catch (err) {
        console.error("Error in create_deck:", err);
      }
    });

    this.onMessage("shuffle_deck", async (client, data) => {
      console.log("Received shuffle_deck:", data);

      try {
        if (!data.deck_id) throw new Error("Missing deck_id");
        const deckData = await shuffleAllCards(data.deck_id);

        this.state.deck_id = deckData.deck_id;
        this.state.remaining = deckData.remaining;
        this.broadcast("deck_created", deckData);
        console.log(`Deck shuffled: ${deckData.deck_id}`);
      } catch (err) {
        console.error("Error in shuffle_deck:", err);
      }
    });

    this.onMessage("deal_cards", async (client, data) => {
      try {
        if (!data.deck_id) throw new Error("Missing deck_id");
        const deck = await drawCard(data.deck_id, 52);
        const cards = deck.cards;

        if (!cards || cards.length < 52) {
          throw new Error("Failed to draw full deck");
        }

        const playerIds = Array.from(this.state.players.keys());

        if (playerIds.length < 2) {
          console.warn("Not enough players to deal cards");
          return;
        }

        const player1Id = playerIds[0];
        const player2Id = playerIds[1];

        let cardNumber = 0;

        const schemaCards = cards.map((c) => {
          const card = new Card();
          card.code = c.code;
          card.image = c.image;
          card.suit = c.suit;
          card.value = c.value;
          if (cardNumber < 26) {
            card.owner = player1Id;
          } else {
            card.owner = player2Id;
          }
          cardNumber++;
          return card;
        });

        const half = Math.floor(schemaCards.length / 2);
        const player1Cards = schemaCards.slice(0, half);
        const player2Cards = schemaCards.slice(half);

        const player1 = this.state.players.get(player1Id);
        const player2 = this.state.players.get(player2Id);

        player1.cards.clear();
        player2.cards.clear();

        player1Cards.forEach((card) => player1.cards.push(card));
        player2Cards.forEach((card) => player2.cards.push(card));

        this.state.status = "playing";

        this.broadcast("cards_dealt", {
          player1: { sessionId: player1Id, cards: player1.cards },
          player2: { sessionId: player2Id, cards: player2.cards },
        });
      } catch (err) {
        console.error("Error in deal_cards:", err);
      }
    });

    this.onMessage("draw_card", async (client, data) => {
      const player = this.state.players.get(data.sessionId);

      if (!player) return;

      if (player.cards.length === 0 && player.discard.length === 0) {
        console.warn(`${player.userName} has no cards left!`);
        this.broadcast("player_out", { userName: player.userName });
        return;
      }

      const drawnCard = player.cards.pop();
      this.state.currentBattle.push(drawnCard);

      // if (this.state.currentBattle.length === 2) {
      //     this.resolveBattle();
      // }

      this.broadcast("card_drawn", { card: drawnCard, deck: player.cards });
    });

    this.onMessage("resolve_battle", async () => {
      this.resolveBattle();
    });

    this.onMessage("reshuffle_cards", async (client, data) => {
      const player = this.state.players.get(data.sessionId);

      player.discard.forEach((card) => {
        card.owner = data.sessionId;
        player.cards.unshift(card);
      });

      player.discard.splice(0, player.discard.length);

      this.broadcast("cards_reshuffled", {
        player: data.sessionId,
        drawPile: player.cards,
        discard: player.discard,
      });
    });

    this.onMessage("forfeit_game", async (data) => {
      const player = this.state.players.get(data.sessionId);

      player.discard = new ArraySchema<Card>();
      player.cards = new ArraySchema<Card>();

      this.broadcast("forfeit", { player: data.sessionId });
    });

    this.onMessage("end_game", async (client, data) => {
      this.state.players.forEach((player) => {
        player.discard.clear();
        player.cards.clear();
      });
      this.state.warPile.clear();
      this.broadcast("end_game");
    });

    this.onMessage("leave_room", async () => {
      this.broadcast("room_closed");
    });
  }

  resolveBattle() {
    const [card1, card2] = this.state.currentBattle;
    if (!card1 || !card2) {
      return;
    }

    const winner = this.compareCards(card1, card2);
    if (winner === "tie") {
      this.state.warPile.push(card1, card2);
      this.broadcast("battle_contested", { deck: this.state.warPile });
    } else {
      const winningPlayer = this.state.players.get(winner);
      if (winningPlayer) {
        if (this.state.warPile) {
          winningPlayer.discard.push(...this.state.warPile, card1, card2);
        } else {
          winningPlayer.discard.push(card1, card2);
        }
        this.state.warPile.splice(0, this.state.warPile.length);
      }
      this.broadcast("battle_resolved", {
        winner: winner,
        deck: winningPlayer.discard,
      });
    }
    this.state.currentBattle.splice(0, this.state.currentBattle.length); // clear round
  }

  compareCards(card1: Card, card2: Card) {
    const valueCard1 = getCardValue(card1.value);
    const valueCard2 = getCardValue(card2.value);

    if (valueCard1 > valueCard2) {
      return card1.owner;
    } else if (valueCard1 < valueCard2) {
      return card2.owner;
    } else return "tie";
  }

  async onAuth(client: Client, options: any) {
    if (this.roomPassword) {
      if (options.password !== this.roomPassword) {
        throw new Error("Invalid room password");
      }
    }
    return true;
  }

  // Called when a player joins the room
  onJoin(client: Client, options: any) {
    console.log(options.userName);

    const player = new Player();
    player.userName =
      options?.userName || `Player ${this.state.players.size + 1}`;
    player.pileName = "";
    player.cards = new ArraySchema<Card>();
    player.discard = new ArraySchema<Card>();

    this.state.players.set(client.sessionId, player);

    if (this.isSinglePlayer) {
      const bot = new Player();
      bot.userName = "Computer";
      bot.cards = new ArraySchema<Card>();
      bot.discard = new ArraySchema<Card>();
      bot.pileName = "";
      this.state.players.set("bot", bot);

      this.state.status = "playing";
      this.startGame();
      this.setTurnTimeout();
    }

    // Start automatically when enough players have joined
    if (this.state.players.size === this.maxClients) {
      this.state.currentTurn = client.sessionId;
      this.state.status = "playing";
      this.startGame();
      this.setTurnTimeout();

      // Lock to prevent more joins
      this.lock();
    }
  }

  // Initialize or shuffle resources
  startGame() {
    this.state.board = new ArraySchema<string>();

    const players = Array.from(this.state.players.entries()).map(
      ([id, player]) => ({
        id,
        userName: player.userName,
        pileName: player.pileName,
        cards: player.cards,
      })
    );

    this.broadcast("players_update", players);

    if (this.state.players.size === this.maxClients) {
      this.broadcast("game_ready");
    }
  }

  isRoundOver(): boolean {
    return false;
  }

  evaluateRound() {
    console.log("Round evaluated");
  }

  // Automatically trigger a move if the player takes too long
  setTurnTimeout() {
    if (this.turnTimeout) this.turnTimeout.clear();
    this.turnTimeout = this.clock.setTimeout(
      () => this.autoAction(),
      TURN_TIMEOUT * 1000
    );
  }

  // Automatically perform an action for the current player (bot / timeout)
  autoAction() {
    const currentId = this.state.currentTurn;
    console.log(`Auto move triggered for ${currentId}`);
    // Example: call this.playerAction({ sessionId: currentId } as Client, { auto: true });
  }

  // Called when a player leaves the room
  onLeave(client: Client) {
    console.log(`Player ${client.sessionId} left`);
    this.state.players.delete(client.sessionId);

    if (this.turnTimeout) this.turnTimeout.clear();

    const remaining = Array.from(this.state.players.keys());
    if (!this.state.winner && remaining.length > 0) {
      this.state.winner = remaining[0];
      this.state.status = "finished";
    }
  }
}
