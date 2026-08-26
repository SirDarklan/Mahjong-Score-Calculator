const SUITS = ["w", "t", "s"];
const WINDS = ["east", "south", "west", "north"];
const DRAGONS = ["red", "green", "white"];
const HONORS = [...WINDS, ...DRAGONS];
const ORPHAN_TILES = [
  "1w",
  "9w",
  "1t",
  "9t",
  "1s",
  "9s",
  ...HONORS,
];

export const tile_types = [
  ...SUITS.flatMap((suit) =>
    Array.from({ length: 9 }, (_, index) => `${index + 1}${suit}`)
  ),
  ...HONORS,
];

export const tile_labels = {
  "1w": "1 Character",
  "2w": "2 Character",
  "3w": "3 Character",
  "4w": "4 Character",
  "5w": "5 Character",
  "6w": "6 Character",
  "7w": "7 Character",
  "8w": "8 Character",
  "9w": "9 Character",
  "1t": "1 Dot",
  "2t": "2 Dot",
  "3t": "3 Dot",
  "4t": "4 Dot",
  "5t": "5 Dot",
  "6t": "6 Dot",
  "7t": "7 Dot",
  "8t": "8 Dot",
  "9t": "9 Dot",
  "1s": "1 Bamboo",
  "2s": "2 Bamboo",
  "3s": "3 Bamboo",
  "4s": "4 Bamboo",
  "5s": "5 Bamboo",
  "6s": "6 Bamboo",
  "7s": "7 Bamboo",
  "8s": "8 Bamboo",
  "9s": "9 Bamboo",
  east: "East Wind",
  south: "South Wind",
  west: "West Wind",
  north: "North Wind",
  red: "Red Dragon",
  green: "Green Dragon",
  white: "White Dragon",
};

const isSuit = (tile) => /^[1-9][wts]$/.test(tile);
const isHonor = (tile) => !isSuit(tile);
const isWind = (tile) => WINDS.includes(tile);
const isDragon = (tile) => DRAGONS.includes(tile);
const isTerminal = (tile) => isSuit(tile) && (tile[0] === "1" || tile[0] === "9");
const isTerminalOrHonor = (tile) => isTerminal(tile) || isHonor(tile);

// Convert the current tile counts into a stable cache key for memoized recursion.
const serializeCounts = (counts) =>
  tile_types.map((tile) => counts[tile] || 0).join("|");

// Always recurse from the first remaining tile so search order stays deterministic.
const getFirstAvailableTile = (counts) =>
  tile_types.find((tile) => (counts[tile] || 0) > 0);

const serializeMeld = (meld) => `${meld.type}:${meld.tiles.join(",")}`;
const serializeDecomposition = (decomposition) =>
  `${decomposition.pair}|${decomposition.melds.map(serializeMeld).join("|")}`;

const getStructuralMeldKey = (meld) => {
  const tiles = meld.tiles.slice(0, 3).sort();
  const type = meld.type === "chi" ? "chi" : "pong";
  return `${type}:${tiles.join(",")}`;
};

const annotateDeclaredMelds = (decomposition, handContext) => {
  const declared = (handContext.openMelds || []).map((meld) => ({
    ...meld,
    structuralKey: getStructuralMeldKey(meld),
    matched: false,
  }));

  return {
    ...decomposition,
    melds: decomposition.melds.map((meld) => {
      const structuralKey = getStructuralMeldKey(meld);
      const match = declared.find(
        (declaredMeld) => !declaredMeld.matched && declaredMeld.structuralKey === structuralKey
      );

      if (!match) return { ...meld, open: false, isKan: false };

      match.matched = true;
      return {
        ...meld,
        open: true,
        isKan: match.type === "kan",
        declaredType: match.type,
      };
    }),
  };
};

export const WIND_OPTIONS = WINDS.map((wind) => ({
  id: wind,
  label: tile_labels[wind],
}));

const getMeldBaseTile = (meld) => meld.tiles[0];

const countpongMeldsBy = (decomposition, predicate) =>
  decomposition.melds.filter(
    (meld) => meld.type === "pong" && predicate(getMeldBaseTile(meld))
  ).length;

const hasSingleSuit = (tiles) => {
  const suitedTiles = tiles.filter(isSuit);

  return (
    suitedTiles.length > 0 &&
    new Set(suitedTiles.map((tile) => tile[1])).size === 1
  );
};

const isAllPongsDecomposition = (decomposition) =>
  decomposition.melds.every((meld) => meld.type === "pong");

const isSevenPairsCounts = (counts) => {
  const usedCounts = Object.values(counts).filter((count) => count > 0);

  return (
    usedCounts.every((count) => count === 2 || count === 4) &&
    usedCounts.reduce((total, count) => total + count / 2, 0) === 7
  );
};

const countFourOfAKinds = (counts) =>
  Object.values(counts).filter((count) => count === 4).length;

const meldContainsTerminal = (meld) => meld.tiles.some(isTerminal);
const meldContainsTerminalOrHonor = (meld) =>
  meld.tiles.some(isTerminalOrHonor);
const isClosedHand = (handContext) => (handContext.openMelds || []).length === 0;
const getWinningTile = (tiles, handContext) =>
  handContext.winningTileIndex == null
    ? null
    : tiles[handContext.winningTileIndex] || null;
const getSequenceKey = (meld) =>
  meld.type === "chi" ? `${meld.tiles[0][0]}${meld.tiles[0][1]}` : null;
const getTripletTile = (meld) =>
  meld.type === "pong" || meld.isKan ? meld.tiles[0] : null;
const getDeclaredKans = (handContext) =>
  (handContext.openMelds || []).filter((meld) => meld.type === "kan");

const hasRyanmenWait = (decomposition, tiles, handContext) => {
  const winningTile = getWinningTile(tiles, handContext);

  if (!winningTile || !isSuit(winningTile)) return false;

  return decomposition.melds.some((meld) => {
    if (meld.type !== "chi" || !meld.tiles.includes(winningTile)) return false;

    const start = Number(meld.tiles[0][0]);
    const winningRank = Number(winningTile[0]);

    if (winningRank === start + 1) return false;
    if (start === 1 && winningRank === 3) return false;
    if (start === 7 && winningRank === 7) return false;
    return true;
  });
};

const countConcealedTriplets = (decomposition, tiles, handContext) => {
  const winningTile = getWinningTile(tiles, handContext);

  return decomposition.melds.filter((meld) => {
    if (meld.type !== "pong" || meld.open) return false;
    return !(
      handContext.winMethod === "ron" &&
      winningTile &&
      getMeldBaseTile(meld) === winningTile
    );
  }).length;
};

const riichiOpenHan = (context, closedHan, openHan = closedHan - 1) =>
  isClosedHand(context.handContext) ? closedHan : openHan;

export const getDoraFromIndicator = (indicator) => {
  if (isSuit(indicator)) {
    const nextRank = Number(indicator[0]) === 9 ? 1 : Number(indicator[0]) + 1;
    return `${nextRank}${indicator[1]}`;
  }

  if (isWind(indicator)) {
    return WINDS[(WINDS.indexOf(indicator) + 1) % WINDS.length];
  }

  if (isDragon(indicator)) {
    const dragonOrder = ["green", "red", "white"];
    return dragonOrder[(dragonOrder.indexOf(indicator) + 1) % dragonOrder.length];
  }

  return null;
};

const getPhysicalTiles = (tiles, handContext) => [
  ...tiles,
  ...getDeclaredKans(handContext).map((kan) => kan.tiles[0]),
];

export const countDora = (tiles, handContext = createDefaultHandContext()) => {
  const physicalTiles = getPhysicalTiles(tiles, handContext);
  const counts = countTiles(physicalTiles);
  const countIndicators = (indicators) =>
    indicators.reduce((result, indicator) => {
      const doraTile = getDoraFromIndicator(indicator);
      const count = doraTile ? counts[doraTile] || 0 : 0;

      return {
        count: result.count + count,
        items: [...result.items, { indicator, doraTile, count }],
      };
    }, { count: 0, items: [] });
  const regular = countIndicators(handContext.doraIndicators || []);
  const ura = handContext.riichiDeclared
    ? countIndicators(handContext.uraDoraIndicators || [])
    : { count: 0, items: [] };
  const red = Math.max(0, Number(handContext.redDoraCount) || 0);

  return {
    regular: regular.count,
    ura: ura.count,
    red,
    total: regular.count + ura.count + red,
    regularItems: regular.items,
    uraItems: ura.items,
  };
};

const getWaitFu = (tiles, decomposition, handContext, hasPinfu) => {
  if (hasPinfu) return null;
  const winningTile = getWinningTile(tiles, handContext);

  if (!winningTile) return null;
  if (winningTile === decomposition.pair) {
    return { name: "Pair wait", value: 2 };
  }

  const matchingSequences = decomposition.melds.filter(
    (meld) => meld.type === "chi" && meld.tiles.includes(winningTile)
  );
  const hasTwoSidedPlacement = matchingSequences.some((meld) => {
    const start = Number(meld.tiles[0][0]);
    const winningRank = Number(winningTile[0]);
    return (
      winningRank !== start + 1 &&
      !(start === 1 && winningRank === 3) &&
      !(start === 7 && winningRank === 7)
    );
  });

  if (hasTwoSidedPlacement || matchingSequences.length === 0) return null;
  return { name: "Closed or edge wait", value: 2 };
};

export const calculateFu = ({
  tiles,
  handType,
  decomposition,
  handContext,
  matchedSpecialHands = [],
}) => {
  if (handType === "seven_pairs") {
    return {
      total: 25,
      items: [{ name: "Seven Pairs", value: 25 }],
      fixed: true,
    };
  }

  if (handType !== "standard") {
    return { total: 0, items: [], fixed: true };
  }

  const hasPinfu = matchedSpecialHands.some((hand) => hand.id === "pinfu");
  if (hasPinfu && handContext.winMethod === "tsumo") {
    return {
      total: 20,
      items: [{ name: "Pinfu Tsumo", value: 20 }],
      fixed: true,
    };
  }

  const items = [{ name: "Base fu", value: 20 }];

  if (handContext.winMethod === "ron" && isClosedHand(handContext)) {
    items.push({ name: "Closed Ron", value: 10 });
  } else if (handContext.winMethod === "tsumo") {
    items.push({ name: "Tsumo", value: 2 });
  }

  if (isDragon(decomposition.pair)) {
    items.push({ name: "Dragon pair", value: 2 });
  }
  if (decomposition.pair === handContext.seatWind) {
    items.push({ name: "Seat-wind pair", value: 2 });
  }
  if (decomposition.pair === handContext.roundWind) {
    items.push({ name: "Round-wind pair", value: 2 });
  }

  decomposition.melds.forEach((meld) => {
    if (meld.type !== "pong") return;
    const terminalOrHonor = isTerminalOrHonor(getMeldBaseTile(meld));
    const completedByRon =
      handContext.winMethod === "ron" &&
      getWinningTile(tiles, handContext) === getMeldBaseTile(meld);
    const treatedAsOpen = meld.open || completedByRon;
    let value;

    if (meld.isKan) {
      value = treatedAsOpen
        ? terminalOrHonor ? 16 : 8
        : terminalOrHonor ? 32 : 16;
    } else {
      value = treatedAsOpen
        ? terminalOrHonor ? 4 : 2
        : terminalOrHonor ? 8 : 4;
    }

    items.push({
      name: `${treatedAsOpen ? "Open" : "Concealed"} ${meld.isKan ? "Kan" : "Pon"} (${terminalOrHonor ? "terminal/honor" : "simple"})`,
      value,
    });
  });

  const waitFu = getWaitFu(tiles, decomposition, handContext, hasPinfu);
  if (waitFu) items.push(waitFu);

  const subtotal = items.reduce((total, item) => total + item.value, 0);
  const minimum = !isClosedHand(handContext) && subtotal === 20 ? 30 : subtotal;
  if (minimum !== subtotal) {
    items.push({ name: "Open-hand minimum", value: minimum - subtotal });
  }
  const rounded = Math.ceil(minimum / 10) * 10;
  if (rounded !== minimum) {
    items.push({ name: "Round up", value: rounded - minimum });
  }

  return { total: rounded, items, fixed: false };
};

const roundUpToHundred = (value) => Math.ceil(value / 100) * 100;

export const calculateRiichiPayments = ({
  han = 0,
  fu = 0,
  isYakuman = false,
  yakumanCount = 1,
  isDealer = false,
  winMethod = "ron",
  honba = 0,
  riichiSticks = 0,
  kiriageMangan = false,
}) => {
  let basicPoints;
  let limit = null;

  if (isYakuman) {
    basicPoints = 8000 * Math.max(1, yakumanCount);
    limit = {
      id: "yakuman",
      name: yakumanCount > 1 ? `${yakumanCount}× Yakuman` : "Yakuman",
    };
  } else if (han >= 11) {
    basicPoints = 6000;
    limit = { id: "sanbaiman", name: "Sanbaiman" };
  } else if (han >= 8) {
    basicPoints = 4000;
    limit = { id: "baiman", name: "Baiman" };
  } else if (han >= 6) {
    basicPoints = 3000;
    limit = { id: "haneman", name: "Haneman" };
  } else {
    const rawBasicPoints = fu * 2 ** (han + 2);
    const reachesMangan =
      han >= 5 ||
      (han === 4 && fu >= 40) ||
      (han === 3 && fu >= 70) ||
      (kiriageMangan && ((han === 4 && fu === 30) || (han === 3 && fu === 60)));

    if (reachesMangan) {
      basicPoints = 2000;
      limit = { id: "mangan", name: "Mangan" };
    } else {
      basicPoints = Math.min(2000, rawBasicPoints);
    }
  }

  const honbaCount = Math.max(0, Number(honba) || 0);
  const stickCount = Math.max(0, Number(riichiSticks) || 0);
  const riichiBonus = stickCount * 1000;

  if (winMethod === "tsumo") {
    if (isDealer) {
      const each = roundUpToHundred(basicPoints * 2) + honbaCount * 100;
      const totalFromPlayers = each * 3;
      return {
        basicPoints,
        limit,
        method: "tsumo",
        isDealer,
        eachOpponentPays: each,
        dealerPays: null,
        nonDealerPays: null,
        ronPayment: null,
        honbaBonus: honbaCount * 300,
        riichiBonus,
        totalFromPlayers,
        totalReceived: totalFromPlayers + riichiBonus,
      };
    }

    const dealerPays = roundUpToHundred(basicPoints * 2) + honbaCount * 100;
    const nonDealerPays = roundUpToHundred(basicPoints) + honbaCount * 100;
    const totalFromPlayers = dealerPays + nonDealerPays * 2;
    return {
      basicPoints,
      limit,
      method: "tsumo",
      isDealer,
      eachOpponentPays: null,
      dealerPays,
      nonDealerPays,
      ronPayment: null,
      honbaBonus: honbaCount * 300,
      riichiBonus,
      totalFromPlayers,
      totalReceived: totalFromPlayers + riichiBonus,
    };
  }

  const baseRonPayment = roundUpToHundred(basicPoints * (isDealer ? 6 : 4));
  const honbaBonus = honbaCount * 300;
  const ronPayment = baseRonPayment + honbaBonus;

  return {
    basicPoints,
    limit,
    method: "ron",
    isDealer,
    eachOpponentPays: null,
    dealerPays: null,
    nonDealerPays: null,
    ronPayment,
    honbaBonus,
    riichiBonus,
    totalFromPlayers: ronPayment,
    totalReceived: ronPayment + riichiBonus,
  };
};

export const countTiles = (tiles) => {
  const counts = {};

  tiles.forEach((tile) => {
    counts[tile] = (counts[tile] || 0) + 1;
  });

  return counts;
};

export const validateHand = (tiles) => {
  if (tiles.length !== 14) {
    return { isValid: false, message: "A valid hand must have 14 tiles." };
  }

  const counts = countTiles(tiles);
  const overLimit = Object.entries(counts).find(([, count]) => count > 4);

  if (overLimit) {
    const [tile] = overLimit;
    return {
      isValid: false,
      message: `${tile_labels[tile]} appears more than four times.`,
    };
  }

  return { isValid: true, message: "" };
};

// Enumerate every valid meld-only breakdown for the remaining tiles.
// This is what lets scoring compare different valid decompositions later.
const findAllMelds = (counts, memo = new Map()) => {
  const key = serializeCounts(counts);

  if (memo.has(key)) {
    return memo.get(key);
  }

  const tile = getFirstAvailableTile(counts);

  if (!tile) {
    const solved = [[]];
    memo.set(key, solved);
    return solved;
  }

  const results = [];

  // Try using the current tile as a pong first.
  if ((counts[tile] || 0) >= 3) {
    counts[tile] -= 3;
    const pongPaths = findAllMelds(counts, memo);
    counts[tile] += 3;

    pongPaths.forEach((path) => {
      results.push([{ type: "pong", tiles: [tile, tile, tile] }, ...path]);
    });
  }

  // Then try using the same tile as the start of a chi.
  if (isSuit(tile)) {
    const value = Number(tile[0]);
    const suit = tile[1];

    if (value <= 7) {
      const second = `${value + 1}${suit}`;
      const third = `${value + 2}${suit}`;

      if ((counts[second] || 0) > 0 && (counts[third] || 0) > 0) {
        counts[tile] -= 1;
        counts[second] -= 1;
        counts[third] -= 1;

        const chiPaths = findAllMelds(counts, memo);

        counts[tile] += 1;
        counts[second] += 1;
        counts[third] += 1;

        chiPaths.forEach((path) => {
          results.push([{ type: "chi", tiles: [tile, second, third] }, ...path]);
        });
      }
    }
  }

  memo.set(key, results);
  return results;
};

// Best-effort fallback for non-winning hands: maximize melds and minimize leftovers.
const extractBestMelds = (counts, memo = new Map()) => {
  const key = serializeCounts(counts);

  if (memo.has(key)) {
    return memo.get(key);
  }

  const tile = getFirstAvailableTile(counts);

  if (!tile) {
    const emptyResult = { melds: [], leftovers: [] };
    memo.set(key, emptyResult);
    return emptyResult;
  }

  const candidates = [];

  // Candidate 1: skip this tile entirely and count it as leftover.
  counts[tile] -= 1;
  const skipped = extractBestMelds(counts, memo);
  counts[tile] += 1;
  candidates.push({
    melds: skipped.melds,
    leftovers: [tile, ...skipped.leftovers],
  });

  // Candidate 2: form a pong if possible.
  if ((counts[tile] || 0) >= 3) {
    counts[tile] -= 3;
    const pongResult = extractBestMelds(counts, memo);
    counts[tile] += 3;
    candidates.push({
      melds: [{ type: "pong", tiles: [tile, tile, tile] }, ...pongResult.melds],
      leftovers: pongResult.leftovers,
    });
  }

  // Candidate 3: form a chi if possible.
  if (isSuit(tile)) {
    const value = Number(tile[0]);
    const suit = tile[1];

    if (value <= 7) {
      const second = `${value + 1}${suit}`;
      const third = `${value + 2}${suit}`;

      if ((counts[second] || 0) > 0 && (counts[third] || 0) > 0) {
        counts[tile] -= 1;
        counts[second] -= 1;
        counts[third] -= 1;

        const chiResult = extractBestMelds(counts, memo);

        counts[tile] += 1;
        counts[second] += 1;
        counts[third] += 1;

        candidates.push({
          melds: [{ type: "chi", tiles: [tile, second, third] }, ...chiResult.melds],
          leftovers: chiResult.leftovers,
        });
      }
    }
  }

  // Prefer the branch with more melds; if tied, prefer fewer leftover tiles.
  candidates.sort((left, right) => {
    if (right.melds.length !== left.melds.length) {
      return right.melds.length - left.melds.length;
    }

    return left.leftovers.length - right.leftovers.length;
  });

  const best = candidates[0];
  memo.set(key, best);
  return best;
};

// Each definition describes one optional scoring rule the user can enable or price differently.
// https://en.wikipedia.org/wiki/Hong_Kong_mahjong_scoring_rules 
// https://en.wikipedia.org/wiki/Japanese_mahjong_scoring_rules
// https://baike.baidu.com/en/item/Sichuan%20Mahjong/17804
// https://baike.baidu.com/item/%E5%9B%9B%E5%B7%9D%E9%BA%BB%E5%B0%86/1287910?fromModule=BaiduWiki_En
export const SPECIAL_HAND_DEFINITIONS = [
  {
    id: "all_chis",
    name: "Common hand / All Chi (平糊）",
    description: "A standard hand where all four melds are chis.",
    defaultPoints: 1,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ decomposition }) =>
      decomposition.melds.every((meld) => meld.type === "chi"),
  },
  {
    id: "all_pongs",
    name: "All Pong / All Triplets （對對糊）",
    description: "A standard hand where all four melds are pongs.",
    defaultPoints: 3,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ decomposition }) =>
      decomposition.melds.every((meld) => meld.type === "pong"),
  },
  {
    id: "pure_all_pongs",
    name: "Pure All Pongs (清大對)",
    description: "All pong combined with all of one suit, includes all pong and all one suit.",
    defaultPoints: 4,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ tiles, decomposition }) =>
      tiles.every(isSuit) && hasSingleSuit(tiles) && isAllPongsDecomposition(decomposition),
  },
  {
    id: "red_dragon",
    name: "Red Dragon （紅中）",
    description: "A meld of the red dragon.",
    defaultPoints: 1,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ decomposition }) =>
      decomposition.melds.some(
        (meld) => meld.type === "pong" && getMeldBaseTile(meld) === "red"
      ),
  },
  {
    id: "seat_wind",
    name: "Seat Wind (自風牌)",
    description: "A triplet or kan of the player's seat wind.",
    defaultPoints: 1,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ decomposition, handContext }) =>
      decomposition.melds.some(
        (meld) => getTripletTile(meld) === handContext.seatWind
      ),
  },
  {
    id: "round_wind",
    name: "Round Wind (場風牌)",
    description: "A triplet or kan of the prevailing round wind.",
    defaultPoints: 1,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ decomposition, handContext }) =>
      decomposition.melds.some(
        (meld) => getTripletTile(meld) === handContext.roundWind
      ),
  },
  {
    id: "green_dragon",
    name: "Green Dragon （發財）",
    description: "A meld of the green dragon.",
    defaultPoints: 1,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ decomposition }) =>
      decomposition.melds.some(
        (meld) => meld.type === "pong" && getMeldBaseTile(meld) === "green"
      ),
  },
  {
    id: "white_dragon",
    name: "White Dragon （白板）",
    description: "A meld of the white dragon.",
    defaultPoints: 1,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ decomposition }) =>
      decomposition.melds.some(
        (meld) => meld.type === "pong" && getMeldBaseTile(meld) === "white"
      ),
  },
  {
    id: "mixed_one_suit",
    name: "Mixed One Suit （混一色）",
    description: "Tiles come from one numbered suit plus honor tiles.",
    defaultPoints: 3,
    enabledByDefault: false,
    supportedHandTypes: ["standard", "seven_pairs"],
    matches: ({ tiles }) => {
      const honorTiles = tiles.filter(isHonor);
      return honorTiles.length > 0 && hasSingleSuit(tiles);
    },
    getPoints: (context, configuredPoints, scoreConfig) =>
      scoreConfig.system === "riichi"
        ? riichiOpenHan(context, 3, 2)
        : configuredPoints,
  },
  {
    id: "pure_one_suit",
    name: "All One Suit (清一色）",
    description: "All tiles come from one numbered suit with no honors.",
    defaultPoints: 7,
    enabledByDefault: false,
    supportedHandTypes: ["standard", "seven_pairs", "nine_gates"],
    matches: ({ tiles }) => tiles.every(isSuit) && hasSingleSuit(tiles),
    getPoints: (context, configuredPoints, scoreConfig) =>
      scoreConfig.system === "riichi"
        ? riichiOpenHan(context, 6, 5)
        : configuredPoints,
  },
  {
    id: "mixed_orphans",
    name: "Mixed Orphans （花幺九）",
    description: "Only terminals and honors, with at least one of each category.",
    defaultPoints: 1,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ tiles, decomposition }) =>
      decomposition.melds.every((meld) => meld.type === "pong") &&
      tiles.every(isTerminalOrHonor) &&
      tiles.some(isHonor) &&
      tiles.some(isTerminal),
  },
  {
    id: "small_dragons",
    name: "Small Dragons （小三元）",
    description: "Two dragon melds with the remaining dragon as the pair.",
    defaultPoints: 5,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ decomposition }) =>
      countpongMeldsBy(decomposition, isDragon) === 2 &&
      isDragon(decomposition.pair),
  },
  {
    id: "great_dragons",
    name: "Great Dragons （大三元）",
    description: "Melds of all 3 dragons.",
    defaultPoints: 8,
    yakuman: true,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ decomposition }) =>
      countpongMeldsBy(decomposition, isDragon) === 3,
  },
  {
    id: "small_winds",
    name: "Small Winds （小四喜）",
    description: "Three wind melds with the remaining wind as the pair.",
    defaultPoints: 6,
    yakuman: true,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ decomposition }) =>
      countpongMeldsBy(decomposition, isWind) === 3 &&
      isWind(decomposition.pair),
  },
  {
    id: "great_winds",
    name: "Great Winds (大四喜)",
    description: "Four wind melds in one winning hand.",
    defaultPoints: 13,
    yakuman: true,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ decomposition }) =>
      countpongMeldsBy(decomposition, isWind) === 4,
  },
  {
    id: "concealed_triplets",
    name: "Self Triplets (四暗刻)",
    description: "All triplet-based melds, intended for concealed handling later.",
    defaultPoints: 13,
    yakuman: true,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ tiles, decomposition, handContext }) => {
      if (countConcealedTriplets(decomposition, tiles, handContext) !== 4) return false;
      const winningTile = getWinningTile(tiles, handContext);
      return handContext.winMethod === "tsumo" || winningTile === decomposition.pair;
    },
  },
  {
    id: "all_honors",
    name: "All Honors (字一色)",
    description: "Every tile in the hand is a wind or dragon tile.",
    defaultPoints: 10,
    yakuman: true,
    enabledByDefault: false,
    supportedHandTypes: ["standard", "seven_pairs"],
    matches: ({ tiles }) => tiles.every(isHonor),
  },
  {
    id: "all_terminals",
    name: "Orphans (么九)",
    description: "A hand made entirely of pongs/kongs of ones and nines only.",
    defaultPoints: 10,
    yakuman: true,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ tiles, decomposition }) =>
      decomposition.melds.every((meld) => meld.type === "pong") &&
      tiles.every(isTerminal),
  },
  {
    id: "sichuan_all_terminals",
    name: "All Terminals (带幺)",
    description: "Every meld contains a 1 or 9, and the pair is also a 1 or 9.",
    defaultPoints: 2,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ decomposition }) =>
      isTerminal(decomposition.pair) && decomposition.melds.every(meldContainsTerminal),
  },
  {
    id: "pure_all_terminals",
    name: "Pure All Terminals (清帶么)",
    description: "An All Terminals hand using only one numbered suit, includes all terminals and all one suit.",
    defaultPoints: 4,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ tiles, decomposition }) =>
      tiles.every(isSuit) &&
      hasSingleSuit(tiles) &&
      isTerminal(decomposition.pair) &&
      decomposition.melds.every(meldContainsTerminal),
  },
  {
    id: "seven_pairs",
    name: "Seven Pairs （七對子）",
    description: "Seven pairs instead of the standard four melds and a pair.",
    defaultPoints: 4,
    enabledByDefault: false,
    supportedHandTypes: ["seven_pairs"],
    matches: ({ counts }) => isSevenPairsCounts(counts),
  },
  {
    id: "dragon_seven_pairs",
    name: "Dragon Seven Pairs (龍七對)",
    description: "Seven concealed pairs containing at least one four-of-a-kind that was not declared as a kong, includes seven pairs.",
    defaultPoints: 4,
    enabledByDefault: false,
    supportedHandTypes: ["seven_pairs"],
    matches: ({ counts }) => isSevenPairsCounts(counts) && countFourOfAKinds(counts) > 0,
    getPoints: ({ counts }, configuredPoints) =>
      configuredPoints + Math.max(0, countFourOfAKinds(counts) - 1),
  },
  {
    id: "pure_seven_pairs",
    name: "Pure Seven Pairs (清七对)",
    description: "Seven concealed pairs using only one numbered suit, includes seven pairs and all one suit.",
    defaultPoints: 5,
    enabledByDefault: false,
    supportedHandTypes: ["seven_pairs"],
    matches: ({ tiles, counts }) =>
      isSevenPairsCounts(counts) && tiles.every(isSuit) && hasSingleSuit(tiles),
  },
  {
    id: "pure_dragon_seven_pairs",
    name: "Pure Dragon Seven Pairs (清龙七对)",
    description: "Dragon Seven Pairs using only one numbered suit, includes dragon seven pairs and all one suit.",
    defaultPoints: 6,
    enabledByDefault: false,
    supportedHandTypes: ["seven_pairs"],
    matches: ({ tiles, counts }) =>
      isSevenPairsCounts(counts) &&
      countFourOfAKinds(counts) > 0 &&
      tiles.every(isSuit) &&
      hasSingleSuit(tiles),
  },
  {
    id: "tile_hog",
    name: "Tile Hog / Root (四归一 / 根)",
    description: "Four identical tiles held across the concealed and melded parts of the hand, without declaring them as a kong.",
    defaultPoints: 1,
    enabledByDefault: false,
    supportedHandTypes: ["standard", "seven_pairs"],
    matches: ({ counts }) => countFourOfAKinds(counts) > 0,
    getPoints: ({ counts }, configuredPoints) =>
      configuredPoints * countFourOfAKinds(counts),
  },
  {
    id: "golden_wait",
    name: "Big Single Wait / Golden Wait (大單釣 /金鉤釣)",
    description: "Four completed pong or kong melds waiting for the winning tile to complete the pair.",
    defaultPoints: 3,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    handContextField: "goldenWait",
    matches: ({ decomposition, handContext }) =>
      handContext.goldenWait && isAllPongsDecomposition(decomposition),
  },
  {
    id: "nine_gates",
    name: "Nine Gates (九子連環)",
    description: "One suit in the pattern 1112345678999 plus any extra tile of that suit, must be entirely concealed.",
    defaultPoints: 10,
    yakuman: true,
    enabledByDefault: false,
    supportedHandTypes: ["nine_gates"],
    matches: ({ counts, tiles }) => {
      if (!tiles.every(isSuit) || !hasSingleSuit(tiles)) {
        return false;
      }

      const suit = tiles[0][1];
      const requiredCounts = {
        [`1${suit}`]: 3,
        [`2${suit}`]: 1,
        [`3${suit}`]: 1,
        [`4${suit}`]: 1,
        [`5${suit}`]: 1,
        [`6${suit}`]: 1,
        [`7${suit}`]: 1,
        [`8${suit}`]: 1,
        [`9${suit}`]: 3,
      };

      return Object.entries(requiredCounts).every(
        ([tile, minimum]) => (counts[tile] || 0) >= minimum
      );
    },
  },
  {
    id: "thirteen_orphans",
    name: "Thirteen Orphans (十三么)",
    description: "One of each one, nine, wind, and dragon, and a 14th tile (any honor/terminal).",
    defaultPoints: 13,
    yakuman: true,
    enabledByDefault: false,
    supportedHandTypes: ["thirteen_orphans"],
    matches: ({ counts }) => {
      const hasAllRequiredTiles = ORPHAN_TILES.every((tile) => (counts[tile] || 0) >= 1);
      const pairCount = ORPHAN_TILES.filter((tile) => counts[tile] === 2).length;

      return hasAllRequiredTiles && pairCount === 1;
    },
  },
  {
    id: "all_258_pongs",
    name: "All 2-5-8 Pongs (將對)",
    description: "An All Pongs hand composed entirely of numbered 2, 5, and 8 tiles.",
    defaultPoints: 5,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ tiles, decomposition }) =>
      isAllPongsDecomposition(decomposition) &&
      tiles.every((tile) => isSuit(tile) && ["2", "5", "8"].includes(tile[0])),
  },
  {
    id: "pinfu",
    name: "Pinfu (平和)",
    description: "A closed all-sequence hand with a non-value pair and a two-sided wait.",
    defaultPoints: 1,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ tiles, decomposition, handContext }) =>
      isClosedHand(handContext) &&
      decomposition.melds.every((meld) => meld.type === "chi") &&
      !isDragon(decomposition.pair) &&
      decomposition.pair !== handContext.seatWind &&
      decomposition.pair !== handContext.roundWind &&
      hasRyanmenWait(decomposition, tiles, handContext),
  },
  {
    id: "twin_sequences",
    name: "Twin Sequences (一盃口)",
    description: "A closed hand containing the same sequence twice in one suit.",
    defaultPoints: 1,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ decomposition, handContext }) => {
      if (!isClosedHand(handContext)) return false;
      const keys = decomposition.melds.map(getSequenceKey).filter(Boolean);
      return new Set(keys).size < keys.length;
    },
  },
  {
    id: "three_suit_sequences",
    name: "Three Suit Sequences (三色同順)",
    description: "The same numbered sequence appears once in each suit.",
    defaultPoints: 2,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ decomposition }) =>
      Array.from({ length: 7 }, (_, index) => index + 1).some((start) =>
        SUITS.every((suit) =>
          decomposition.melds.some((meld) => getSequenceKey(meld) === `${start}${suit}`)
        )
      ),
    getPoints: (context) => riichiOpenHan(context, 2, 1),
  },
  {
    id: "straight",
    name: "Straight (一気通貫)",
    description: "The 123, 456, and 789 sequences all appear in one suit.",
    defaultPoints: 2,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ decomposition }) =>
      SUITS.some((suit) =>
        [1, 4, 7].every((start) =>
          decomposition.melds.some((meld) => getSequenceKey(meld) === `${start}${suit}`)
        )
      ),
    getPoints: (context) => riichiOpenHan(context, 2, 1),
  },
  {
    id: "double_twin_sequences",
    name: "Double Twin Sequences (二盃口)",
    description: "A closed all-sequence hand containing two pairs of identical sequences.",
    defaultPoints: 3,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ decomposition, handContext }) => {
      if (!isClosedHand(handContext) || !decomposition.melds.every((meld) => meld.type === "chi")) {
        return false;
      }
      const counts = decomposition.melds.reduce((result, meld) => {
        const key = getSequenceKey(meld);
        result[key] = (result[key] || 0) + 1;
        return result;
      }, {});
      return Object.values(counts).reduce((pairs, count) => pairs + Math.floor(count / 2), 0) === 2;
    },
  },
  {
    id: "three_concealed_triplets",
    name: "Three Concealed Triplets (三暗刻)",
    description: "Three triplet or kan groups were completed without calling a discard.",
    defaultPoints: 2,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ tiles, decomposition, handContext }) =>
      countConcealedTriplets(decomposition, tiles, handContext) >= 3,
  },
  {
    id: "full_outside_hand",
    name: "Full Outside Hand (純全帯么九)",
    description: "Every group and the pair contains a terminal, with at least one sequence and no honors.",
    defaultPoints: 3,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ tiles, decomposition }) =>
      tiles.every((tile) => !isHonor(tile)) &&
      isTerminal(decomposition.pair) &&
      decomposition.melds.some((meld) => meld.type === "chi") &&
      decomposition.melds.every(meldContainsTerminal),
    getPoints: (context) => riichiOpenHan(context, 3, 2),
  },
  {
    id: "half_outside_hand",
    name: "Half Outside Hand (混全帯么九)",
    description: "Every group and the pair contains a terminal or honor, including at least one sequence and honor.",
    defaultPoints: 2,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ tiles, decomposition }) =>
      tiles.some(isHonor) &&
      isTerminalOrHonor(decomposition.pair) &&
      decomposition.melds.some((meld) => meld.type === "chi") &&
      decomposition.melds.every(meldContainsTerminalOrHonor),
    getPoints: (context) => riichiOpenHan(context, 2, 1),
  },
  {
    id: "three_suit_triplets",
    name: "Three Suit Triplets (三色同刻)",
    description: "The same numbered triplet appears once in each suit.",
    defaultPoints: 2,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ decomposition }) =>
      Array.from({ length: 9 }, (_, index) => index + 1).some((rank) =>
        SUITS.every((suit) =>
          decomposition.melds.some((meld) => getTripletTile(meld) === `${rank}${suit}`)
        )
      ),
  },
  {
    id: "three_kans",
    name: "Three Kans (三槓子)",
    description: "The hand contains three declared kans.",
    defaultPoints: 2,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ handContext }) => getDeclaredKans(handContext).length === 3,
  },
  {
    id: "four_kans",
    name: "Four Kans (四槓子)",
    description: "Yakuman consisting of four declared kans.",
    defaultPoints: 13,
    yakuman: true,
    enabledByDefault: false,
    supportedHandTypes: ["standard"],
    matches: ({ handContext }) => getDeclaredKans(handContext).length === 4,
  },
  {
    id: "all_green",
    name: "All Green (緑一色)",
    description: "Yakuman using only 2, 3, 4, 6, or 8 Bamboo and Green Dragons.",
    defaultPoints: 13,
    yakuman: true,
    enabledByDefault: false,
    supportedHandTypes: ["standard", "seven_pairs"],
    matches: ({ tiles }) =>
      tiles.every((tile) => ["2s", "3s", "4s", "6s", "8s", "green"].includes(tile)),
  },
];

export const SPECIAL_CONDITION_DEFINITIONS = [
  {
    id: "riichi",
    name: "Riichi (立直)",
    description: "The player declared Riichi with a closed ready hand.",
    defaultPoints: 1,
    enabledByDefault: false,
    matches: ({ handContext }) =>
      handContext.riichiDeclared && isClosedHand(handContext),
  },
  {
    id: "self_draw",
    name: "Self Draw （自摸）",
    description: "The winning tile is drawn by the player instead of claimed from a discard.",
    defaultPoints: 1,
    enabledByDefault: false,
    matches: ({ handContext }) => handContext.selfDraw,
  },
  {
    id: "fully_concealed",
    name: "Fully Concealed （門前清）",
    description: "The hand is won without any exposed melds.",
    defaultPoints: 1,
    enabledByDefault: false,
    matches: ({ handContext }) => handContext.fullyConcealed,
  },
  {
    id: "robbing_kong",
    name: "Robbing Kong（搶槓）",
    description: "The win comes from claiming a tile used to upgrade a pong into a kong.",
    defaultPoints: 1,
    enabledByDefault: false,
    matches: ({ handContext }) => handContext.robbingKong,
  },
  {
    id: "last_tile",
    name: "Last Tile of Wall / Discard （海底撈月）",
    description: "The winning tile is the final tile from the wall or the final discard.",
    defaultPoints: 1,
    enabledByDefault: false,
    matches: ({ handContext }) => handContext.lastTile,
  },
  {
    id: "kong_draw",
    name: "Win by Kong Extra Tile （槓上開花)",
    description: "The hand wins on the replacement tile drawn after declaring a kong.",
    defaultPoints: 1,
    enabledByDefault: false,
    matches: ({ handContext }) => handContext.kongDraw,
  },
  {
    id: "shooting_after_kong",
    name: "Shooting After Kong (杠上炮)",
    description: "The hand wins on the discard made immediately after another player declares a kong.",
    defaultPoints: 1,
    enabledByDefault: false,
    matches: ({ handContext }) => handContext.shootingAfterKong,
  },
  {
    id: "double_kong_win",
    name: "Win by Double Kong （槓上槓）",
    description: "The winning hand occurs in a double-kong situation.",
    defaultPoints: 8,
    enabledByDefault: false,
    matches: ({ handContext }) => handContext.doubleKongWin,
  },
  {
    id: "heavenly_hand",
    name: "Heavenly Hand (天糊)",
    description: "East wins immediately with the initial dealt hand before any discard.",
    defaultPoints: 13,
    yakuman: true,
    enabledByDefault: false,
    matches: ({ handContext }) => handContext.heavenlyHand,
  },
  {
    id: "earthly_hand",
    name: "Earthly Hand (地糊)",
    description: "A non-East player wins on East's very first discard.",
    defaultPoints: 13,
    yakuman: true,
    enabledByDefault: false,
    matches: ({ handContext }) => handContext.earthlyHand,
  },
];

const createScoreConfig = (overrides = {}) => ({
  system: overrides.system || "additive",
  options: { ...(overrides.options || {}) },
  specialHands: Object.fromEntries(
    SPECIAL_HAND_DEFINITIONS.map((hand) => {
      const override = overrides.specialHands?.[hand.id];

      return [
        hand.id,
        {
          enabled: override?.enabled ?? hand.enabledByDefault,
          points: override?.points ?? hand.defaultPoints,
        },
      ];
    })
  ),
  specialConditions: Object.fromEntries(
    SPECIAL_CONDITION_DEFINITIONS.map((condition) => {
      const override = overrides.specialConditions?.[condition.id];

      return [
        condition.id,
        {
          enabled: override?.enabled ?? condition.enabledByDefault,
          points: override?.points ?? condition.defaultPoints,
        },
      ];
    })
  ),
});

// UI state uses this so the app can reset to a predictable scoring configuration.
export const createDefaultScoreConfig = () =>
  createScoreConfig({
    specialHands: Object.fromEntries(
      SPECIAL_HAND_DEFINITIONS.map((hand) => [
        hand.id,
        {
          enabled: false,
          points: hand.defaultPoints,
        },
      ])
    ),
    specialConditions: Object.fromEntries(
      SPECIAL_CONDITION_DEFINITIONS.map((condition) => [
        condition.id,
        {
          enabled: false,
          points: condition.defaultPoints,
        },
      ])
    ),
  });

export const createHongKongScoreConfig = () =>
  createScoreConfig({
    specialHands: {
      all_chis: { enabled: true, points: 1 },
      all_pongs: { enabled: true, points: 3 },
      red_dragon: { enabled: true, points: 1 },
      green_dragon: { enabled: true, points: 1 },
      white_dragon: { enabled: true, points: 1 },
      mixed_one_suit: { enabled: true, points: 3 },
      pure_one_suit: { enabled: true, points: 7 },
      mixed_orphans: { enabled: true, points: 1 },
      small_dragons: { enabled: true, points: 5 },
      great_dragons: { enabled: true, points: 8 },
      small_winds: { enabled: true, points: 6 },
      great_winds: { enabled: true, points: 13 },
      concealed_triplets: { enabled: true, points: 0 },
      all_honors: { enabled: true, points: 10 },
      all_terminals: { enabled: true, points: 10 },
      nine_gates: { enabled: true, points: 10 },
      seven_pairs: { enabled: true, points: 4 },
      thirteen_orphans: { enabled: true, points: 13 },
    },
    specialConditions: {
      self_draw: { enabled: true, points: 1 },
      fully_concealed: { enabled: true, points: 1 },
      robbing_kong: { enabled: true, points: 1 },
      last_tile: { enabled: true, points: 1 },
      kong_draw: { enabled: true, points: 1 },
      double_kong_win: { enabled: true, points: 8 },
      heavenly_hand: { enabled: true, points: 13 },
      earthly_hand: { enabled: true, points: 13 },
    },
  });

export const createRiichiScoreConfig = () =>
  createScoreConfig({
    system: "riichi",
    options: {
      kiriageMangan: false,
      countedYakuman: true,
    },
    specialHands: {
      all_pongs: { enabled: true, points: 2 },
      red_dragon: { enabled: true, points: 1 },
      green_dragon: { enabled: true, points: 1 },
      white_dragon: { enabled: true, points: 1 },
      seat_wind: { enabled: true, points: 1 },
      round_wind: { enabled: true, points: 1 },
      mixed_one_suit: { enabled: true, points: 3 },
      pure_one_suit: { enabled: true, points: 6 },
      mixed_orphans: { enabled: true, points: 2 },
      small_dragons: { enabled: true, points: 2 },
      great_dragons: { enabled: true, points: 13 },
      small_winds: { enabled: true, points: 13 },
      great_winds: { enabled: true, points: 13 },
      concealed_triplets: { enabled: true, points: 13 },
      all_honors: { enabled: true, points: 13 },
      all_terminals: { enabled: true, points: 13 },
      nine_gates: { enabled: true, points: 13 },
      seven_pairs: { enabled: true, points: 2 },
      thirteen_orphans: { enabled: true, points: 13 },
      pinfu: { enabled: true, points: 1 },
      twin_sequences: { enabled: true, points: 1 },
      three_suit_sequences: { enabled: true, points: 2 },
      straight: { enabled: true, points: 2 },
      double_twin_sequences: { enabled: true, points: 3 },
      three_concealed_triplets: { enabled: true, points: 2 },
      full_outside_hand: { enabled: true, points: 3 },
      half_outside_hand: { enabled: true, points: 2 },
      three_suit_triplets: { enabled: true, points: 2 },
      three_kans: { enabled: true, points: 2 },
      four_kans: { enabled: true, points: 13 },
      all_green: { enabled: true, points: 13 },
    },
    specialConditions: {
      riichi: { enabled: true, points: 1 },
      heavenly_hand: { enabled: true, points: 13 },
      earthly_hand: { enabled: true, points: 13 },
    },
  });

export const createSichuanScoreConfig = () =>
  createScoreConfig({
    specialHands: {
      all_chis: { enabled: true, points: 1 },
      all_pongs: { enabled: true, points: 2 },
      golden_wait: { enabled: true, points: 3 },
      pure_one_suit: { enabled: true, points: 3 },
      pure_all_pongs: { enabled: true, points: 4 },
      tile_hog: { enabled: true, points: 1 },
      all_258_pongs: { enabled: true, points: 5 },
      sichuan_all_terminals: { enabled: true, points: 2 },
      pure_all_terminals: { enabled: true, points: 4 },
      seven_pairs: { enabled: true, points: 2 },
      dragon_seven_pairs: { enabled: true, points: 4 },
      pure_seven_pairs: { enabled: true, points: 5 },
      pure_dragon_seven_pairs: { enabled: true, points: 6 },
    },
    specialConditions: {
      self_draw: { enabled: true, points: 1 },
      robbing_kong: { enabled: true, points: 1 },
      last_tile: { enabled: true, points: 1 },
      kong_draw: { enabled: true, points: 1 },
      shooting_after_kong: { enabled: true, points: 1 },
      heavenly_hand: { enabled: true, points: 3 },
      earthly_hand: { enabled: true, points: 3 },
    },
  });

export const createDefaultHandContext = () => ({
  seatWind: "east",
  roundWind: "east",
  winMethod: "ron",
  winningTileIndex: null,
  openMelds: [],
  riichiDeclared: false,
  doraIndicators: [],
  uraDoraIndicators: [],
  redDoraCount: 0,
  honba: 0,
  riichiSticks: 0,
  selfDraw: false,
  fullyConcealed: false,
  robbingKong: false,
  lastTile: false,
  kongDraw: false,
  shootingAfterKong: false,
  goldenWait: false,
  doubleKongWin: false,
  heavenlyHand: false,
  earthlyHand: false,
});

// Standard winning hands are "pair + four melds". This returns every valid version of that shape.
export const findAllWinningDecompositions = (tiles) => {
  const validation = validateHand(tiles);

  if (!validation.isValid) {
    return [];
  }

  const counts = countTiles(tiles);
  const pairCandidates = tile_types.filter((tile) => (counts[tile] || 0) >= 2);
  const decompositions = [];
  const seen = new Set();

  pairCandidates.forEach((pairTile) => {
    counts[pairTile] -= 2;
    const meldPaths = findAllMelds(counts, new Map());
    counts[pairTile] += 2;

    // Different recursion paths can produce the same logical decomposition, so dedupe them.
    meldPaths.forEach((melds) => {
      const decomposition = { pair: pairTile, melds };
      const key = serializeDecomposition(decomposition);

      if (!seen.has(key)) {
        seen.add(key);
        decompositions.push(decomposition);
      }
    });
  });

  return decompositions;
};

// Filter the registry down to only the rules that are both enabled and legal for this hand type.
const getEnabledSpecialHands = (scoreConfig, handType) =>
  SPECIAL_HAND_DEFINITIONS.filter((definition) => {
    const config = scoreConfig.specialHands[definition.id];

    return config?.enabled && definition.supportedHandTypes.includes(handType);
  });

const INDIVIDUAL_DRAGON_HAND_IDS = new Set([
  "red_dragon",
  "green_dragon",
  "white_dragon",
]);

// Run all enabled rules against a candidate and attach the point values the user configured.
const getMatchedSpecialHands = (context, scoreConfig, handType) => {
  const matchedHands = getEnabledSpecialHands(scoreConfig, handType)
    .filter((definition) => definition.matches(context))
    .map((definition) => ({
      id: definition.id,
      name: definition.name,
      yakuman: Boolean(definition.yakuman),
      points: definition.getPoints
        ? definition.getPoints(
            context,
            scoreConfig.specialHands[definition.id].points,
            scoreConfig
          )
        : scoreConfig.specialHands[definition.id].points,
    }));

  const hasCombinedDragonHand = matchedHands.some(
    (hand) => hand.id === "small_dragons" || hand.id === "great_dragons"
  );

  const withoutDragonDuplicates = hasCombinedDragonHand
    ? matchedHands.filter((hand) => !INDIVIDUAL_DRAGON_HAND_IDS.has(hand.id))
    : matchedHands;

  const hasDoubleTwinSequences = withoutDragonDuplicates.some(
    (hand) => hand.id === "double_twin_sequences"
  );

  return hasDoubleTwinSequences
    ? withoutDragonDuplicates.filter((hand) => hand.id !== "twin_sequences")
    : withoutDragonDuplicates;
};

const getMatchedSpecialConditions = (context, scoreConfig) =>
  SPECIAL_CONDITION_DEFINITIONS.filter((definition) => {
    const config = scoreConfig.specialConditions?.[definition.id];

    return config?.enabled && definition.matches(context);
  }).map((definition) => ({
    id: definition.id,
    name: definition.name,
    yakuman: Boolean(definition.yakuman),
    points: scoreConfig.specialConditions[definition.id].points,
  }));

// Turn one valid hand candidate into a scored result the UI can rank and display.
const buildScoredCandidate = ({
  tiles,
  counts,
  handType,
  name,
  decomposition,
  scoreConfig,
  handContext,
}) => {
  const scoredDecomposition =
    handType === "standard"
      ? annotateDeclaredMelds(decomposition, handContext)
      : decomposition;
  const matchedSpecialHands = getMatchedSpecialHands(
    { tiles, counts, decomposition: scoredDecomposition, handContext },
    scoreConfig,
    handType
  );
  const matchedSpecialConditions = getMatchedSpecialConditions(
    { tiles, counts, decomposition: scoredDecomposition, handContext },
    scoreConfig
  );
  const yakumanMatches = [
    ...matchedSpecialHands,
    ...matchedSpecialConditions,
  ].filter((match) => match.yakuman);
  const normalTotal =
    matchedSpecialHands.reduce((total, hand) => total + hand.points, 0) +
    matchedSpecialConditions.reduce((total, condition) => total + condition.points, 0);
  const dora =
    scoreConfig.system === "riichi"
      ? countDora(tiles, handContext)
      : { regular: 0, ura: 0, red: 0, total: 0, regularItems: [], uraItems: [] };
  const hanTotal = normalTotal + dora.total;
  const isCountedYakuman =
    scoreConfig.system === "riichi" &&
    scoreConfig.options?.countedYakuman !== false &&
    yakumanMatches.length === 0 &&
    hanTotal >= 13;
  const finalSpecialHands =
    scoreConfig.system === "riichi" && yakumanMatches.length > 0
      ? matchedSpecialHands.filter((hand) => hand.yakuman)
      : isCountedYakuman
        ? [
            {
              id: "counted_yakuman",
              name: "Counted Yakuman (数え役満)",
              yakuman: true,
              points: 13,
            },
          ]
        : matchedSpecialHands;
  const finalSpecialConditions =
    scoreConfig.system === "riichi" && yakumanMatches.length > 0
      ? matchedSpecialConditions.filter((condition) => condition.yakuman)
      : isCountedYakuman
        ? []
        : matchedSpecialConditions;
  const totalPoints =
    scoreConfig.system === "riichi" && yakumanMatches.length > 0
      ? yakumanMatches.reduce((total, match) => total + match.points, 0)
      : isCountedYakuman
        ? 13
        : scoreConfig.system === "riichi" ? hanTotal : normalTotal;
  const fu =
    scoreConfig.system === "riichi" && yakumanMatches.length === 0 && !isCountedYakuman
      ? calculateFu({
          tiles,
          handType,
          decomposition: scoredDecomposition,
          handContext,
          matchedSpecialHands: finalSpecialHands,
        })
      : null;
  const yakumanCount = isCountedYakuman
    ? 1
    : yakumanMatches.reduce(
        (total, match) => total + Math.max(1, match.points / 13),
        0
      );
  const payments =
    scoreConfig.system === "riichi"
      ? calculateRiichiPayments({
          han: hanTotal,
          fu: fu?.total || 0,
          isYakuman: yakumanMatches.length > 0 || isCountedYakuman,
          yakumanCount,
          isDealer: handContext.seatWind === "east",
          winMethod: handContext.winMethod,
          honba: handContext.honba,
          riichiSticks: handContext.riichiSticks,
          kiriageMangan: scoreConfig.options?.kiriageMangan,
        })
      : null;

  return {
    handType,
    name,
    pair: decomposition?.pair || null,
    melds: scoredDecomposition?.melds || [],
    matchedSpecialHands: finalSpecialHands,
    matchedSpecialConditions: finalSpecialConditions,
    totalPoints,
    han: scoreConfig.system === "riichi" && !yakumanMatches.length && !isCountedYakuman
      ? hanTotal
      : null,
    yakuHan: scoreConfig.system === "riichi" ? normalTotal : null,
    dora,
    fu,
    isYakuman: yakumanMatches.length > 0 || isCountedYakuman,
    isCountedYakuman,
    yakumanCount,
    payments,
  };
};

// Seven Pairs is not a standard meld hand, so it gets its own candidate builder.
const getSevenPairsCandidate = (tiles, counts, scoreConfig, handContext) => {
  const definition = SPECIAL_HAND_DEFINITIONS.find(
    (hand) => hand.id === "seven_pairs"
  );
  const config = scoreConfig.specialHands[definition.id];

  if (!config?.enabled || !definition.matches({ counts })) {
    return null;
  }

  const pairTiles = tile_types.flatMap((tile) =>
    Array.from({ length: (counts[tile] || 0) / 2 }, () => tile)
  );
  const decomposition = {
    pair: null,
    melds: pairTiles.map((tile) => ({ type: "pair", tiles: [tile, tile] })),
  };

  return buildScoredCandidate({
    tiles,
    counts,
    handType: "seven_pairs",
    name: "Seven Pairs",
    decomposition,
    scoreConfig,
    handContext,
  });
};

const getNineGatesCandidate = (tiles, counts, scoreConfig, handContext) => {
  const definition = SPECIAL_HAND_DEFINITIONS.find(
    (hand) => hand.id === "nine_gates"
  );
  const config = scoreConfig.specialHands[definition.id];

  if (!config?.enabled || !definition.matches({ counts, tiles })) {
    return null;
  }

  return buildScoredCandidate({
    tiles,
    counts,
    handType: "nine_gates",
    name: "Nine Gates",
    decomposition: { pair: null, melds: [] },
    scoreConfig,
    handContext,
  });
};

const getThirteenOrphansCandidate = (tiles, counts, scoreConfig, handContext) => {
  const definition = SPECIAL_HAND_DEFINITIONS.find(
    (hand) => hand.id === "thirteen_orphans"
  );
  const config = scoreConfig.specialHands[definition.id];

  if (!config?.enabled || !definition.matches({ counts })) {
    return null;
  }

  return buildScoredCandidate({
    tiles,
    counts,
    handType: "thirteen_orphans",
    name: "13 Orphans",
    decomposition: { pair: null, melds: [] },
    scoreConfig,
    handContext,
  });
};

// Main evaluator: generate every supported candidate, score them, and keep the best one.
export const evaluateHand = (
  tiles,
  scoreConfig = createDefaultScoreConfig(),
  handContext = createDefaultHandContext()
) => {
  const validation = validateHand(tiles);

  if (!validation.isValid) {
    return {
      ...validation,
      isWinningHand: false,
      bestCandidate: null,
      candidates: [],
      partial: { pair: null, pongs: [], chis: [], leftovers: [] },
    };
  }

  const counts = countTiles(tiles);
  const candidates = [];
  const winningDecompositions = findAllWinningDecompositions(tiles);

  // Score every standard decomposition, because different breakdowns can produce different bonuses.
  winningDecompositions.forEach((decomposition) => {
    candidates.push(
      buildScoredCandidate({
        tiles,
        counts,
        handType: "standard",
        name: "Standard Hand",
        decomposition,
        scoreConfig,
        handContext,
      })
    );
  });

  [
    getSevenPairsCandidate(tiles, counts, scoreConfig, handContext),
    getNineGatesCandidate(tiles, counts, scoreConfig, handContext),
    getThirteenOrphansCandidate(tiles, counts, scoreConfig, handContext),
  ]
    .filter(Boolean)
    .forEach((candidate) => candidates.push(candidate));

  const eligibleCandidates =
    scoreConfig.system === "riichi"
      ? candidates.filter((candidate) => candidate.isYakuman || candidate.yakuHan > 0)
      : candidates;

  // Riichi candidates rank by actual payment; additive rulesets continue ranking by points.
  eligibleCandidates.sort((left, right) => {
    if (
      scoreConfig.system === "riichi" &&
      right.payments.totalFromPlayers !== left.payments.totalFromPlayers
    ) {
      return right.payments.totalFromPlayers - left.payments.totalFromPlayers;
    }

    if (right.totalPoints !== left.totalPoints) {
      return right.totalPoints - left.totalPoints;
    }

    if ((right.fu?.total || 0) !== (left.fu?.total || 0)) {
      return (right.fu?.total || 0) - (left.fu?.total || 0);
    }

    return right.matchedSpecialHands.length - left.matchedSpecialHands.length;
  });

  if (eligibleCandidates.length > 0) {
    return {
      isValid: true,
      message: "Best scoring hand found.",
      isWinningHand: true,
      bestCandidate: eligibleCandidates[0],
      candidates: eligibleCandidates,
      partial: { pair: null, pongs: [], chis: [], leftovers: [] },
    };
  }

  // If nothing wins, still show the user the best meld-like partial breakdown we can find.
  const bestPartial = extractBestMelds({ ...counts });

  return {
    isValid: true,  
    message:
      scoreConfig.system === "riichi" && candidates.length > 0
        ? "The tiles form a complete hand, but it has no yaku. Dora alone cannot make a hand valid."
        : "Hand is valid, but it does not form a selected winning hand.",
    isWinningHand: false,
    bestCandidate: null,
    candidates: [],
    partial: {
      pair: null,
      pongs: bestPartial.melds.filter((meld) => meld.type === "pong"),
      chis: bestPartial.melds.filter((meld) => meld.type === "chi"),
      leftovers: bestPartial.leftovers,
    },
  };
};

// Legacy-friendly summary for the simpler UI and tests that only care about pairs, pongs, and chis.
export const analyzeHand = (tiles) => {
  const evaluation = evaluateHand(tiles);

  if (!evaluation.isWinningHand || !evaluation.bestCandidate) {
    return {
      isValid: evaluation.isValid,
      message: evaluation.message,
      isWinningHand: false,
      pair: evaluation.partial.pair,
      pongs: evaluation.partial.pongs,
      chis: evaluation.partial.chis,
      leftovers: evaluation.partial.leftovers,
    };
  }

  return {
    isValid: true,
    message: evaluation.message,
    isWinningHand: true,
    pair: evaluation.bestCandidate.pair,
    pongs: evaluation.bestCandidate.melds.filter((meld) => meld.type === "pong"),
    chis: evaluation.bestCandidate.melds.filter((meld) => meld.type === "chi"),
    leftovers: [],
  };
};
