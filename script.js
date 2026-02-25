const tileTypes = [
  // Characters
  ...Array.from({ length: 9 }, (_, i) => `${i+1}m`),
  // Dots
  ...Array.from({ length: 9 }, (_, i) => `${i+1}p`),
  // Bamboo
  ...Array.from({ length: 9 }, (_, i) => `${i+1}s`),
  // Honors
  "E","S","W","N","R","G","Wh"
];

const tileInputsDiv = document.getElementById("tile-inputs");

for (let i = 0; i < 14; i++) {
  const select = document.createElement("select");

  tileTypes.forEach(tile => {
    const option = document.createElement("option");
    option.value = tile;
    option.textContent = tile;
    select.appendChild(option);
  });

  tileInputsDiv.appendChild(select);
}


function getHand() {
  const selects = document.querySelectorAll("#tile-inputs select");
  return Array.from(selects).map(s => s.value);
}

function countTiles(hand) {
  const counts = {};
  hand.forEach(tile => {
    counts[tile] = (counts[tile] || 0) + 1;
  });
  return counts;
}

document.getElementById("calculateBtn").addEventListener("click", () => {
  const hand = getHand();
  const output = document.getElementById("output");

  if (!isValidHand(hand)) {
    output.textContent = "Invalid hand (too many of a tile or wrong size).";
    return;
  }

  output.textContent = "Valid hand!\n\n(Scoring logic coming next)";
});
