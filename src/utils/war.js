function getCardValue(card) {
  if (card === "KING") {
    return Number(13);
  } else if (card === "QUEEN") {
    return Number(12);
  } else if (card === "JACK") {
    return Number(11);
  } else if (card === 0) {
    return Number(10);
  } else if (card === "ACE") {
    return Number(14);
  } else {
    return Number(card);
  }
}

export { getCardValue };
