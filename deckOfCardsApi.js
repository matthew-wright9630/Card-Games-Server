// import { request } from "./api";

import fetch from "node-fetch";

async function request(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

const deckOfCardsUrl = "https://deckofcardsapi.com/api/deck/";

function createNewDeck(deckNumber) {
  return request(`${deckOfCardsUrl}new/shuffle/?deck_count=${deckNumber}`);
}

function drawCard(deck_id, numberOfCards) {
  return request(`${deckOfCardsUrl}${deck_id}/draw/?count=${numberOfCards}`);
}

function drawFromPile(deck_id, pileName) {
  return request(`${deckOfCardsUrl}${deck_id}/pile/${pileName}/draw/`);
}

function shuffleAllCards(deck_id) {
  return request(`${deckOfCardsUrl}${deck_id}/shuffle/`);
}

//This function will shuffle all cards in the Main pile. For example, in Solitaire you shuffle the main deck once all cards have been flipped.
//You don't want to shuffle the other piles.
function shuffleCardsNotInPlay(deck_id) {
  return request(`${deckOfCardsUrl}${deck_id}/shuffle/?remaining=true`);
}

function createUnshuffledDeck() {
  return request(`${deckOfCardsUrl}new/`);
}

//Gets a partial deck for games such as Euchre. See https://deckofcardsapi.com/ for more information.
function createPartialDeck(cards) {
  return request(`${deckOfCardsUrl}new/shuffle/?cards=${cards}`);
}

function addCardsToPiles(deck_id, pileName, cardCode) {
  return request(
    `${deckOfCardsUrl}${deck_id}/pile/${pileName}/add/?cards=${cardCode}`
  );
}

function shufflePilesTogether(deck_id, pileName) {
  return request(`${deckOfCardsUrl}${deck_id}/pile/${pileName}/shuffle/`);
}

function listCardsInPile(deck_id, pileName) {
  return request(`${deckOfCardsUrl}${deck_id}/pile/${pileName}/list/`);
}

function returnAllCards(deck_id) {
  return request(`${deckOfCardsUrl}${deck_id}/return/`);
}

function returnCardsFromPile(deck_id, pileName) {
  return request(`${deckOfCardsUrl}${deck_id}/pile/${pileName}/return/`);
}

export {
  createNewDeck,
  drawCard,
  drawFromPile,
  shuffleAllCards,
  shuffleCardsNotInPlay,
  createUnshuffledDeck,
  createPartialDeck,
  addCardsToPiles,
  shufflePilesTogether,
  listCardsInPile,
  returnAllCards,
  returnCardsFromPile,
};
