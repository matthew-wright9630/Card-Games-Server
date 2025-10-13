import { Card } from "./src/rooms/schema/MyRoomState";

  export interface DeckResponse {
    success: boolean;
    deck_id: string;
    shuffled: boolean;
    remaining: number;
    cards?: Card[];
  }

  export function createNewDeck(deckCount: number): Promise<DeckResponse>;
  export function shuffleAllCards(deck_id: string): Promise<DeckResponse>;
  export function drawCard(deck_id: string, numberOfCards:number): Promise<DeckResponse>;
