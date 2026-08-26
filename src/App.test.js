import {
  analyzeHand,
  createDefaultHandContext,
  createHongKongScoreConfig,
  createRiichiScoreConfig,
  createSichuanScoreConfig,
  countDora,
  calculateRiichiPayments,
  evaluateHand,
  getDoraFromIndicator,
} from "./mahjong";
import { replaceTileBackColor } from "./tileArt";

describe("tile artwork colors", () => {
  test("changes only the tile-back red", () => {
    const svg = '<path fill="#FF0004"/><path fill="#DE3A30"/>';

    expect(replaceTileBackColor(svg, "#7B2CBF")).toBe(
      '<path fill="#7B2CBF"/><path fill="#DE3A30"/>'
    );
  });

  test("supports the navy-blue tile back", () => {
    const svg = '<path fill="#FF0004"/><path fill="#DE3A30"/>';

    expect(replaceTileBackColor(svg, "#1F3A5F")).toBe(
      '<path fill="#1F3A5F"/><path fill="#DE3A30"/>'
    );
  });
});

describe("analyzeHand", () => {
  test("does not double count tiles across pongs and chis", () => {
    const result = analyzeHand([
      "1w",
      "1w",
      "1w",
      "2w",
      "3w",
      "4w",
      "5w",
      "6w",
      "7w",
      "8w",
      "8w",
      "8w",
      "9w",
      "9w",
    ]);

    expect(result.isWinningHand).toBe(true);
  });
});

describe("Hong Kong scoring", () => {
  test("scores all pongs with the Hong Kong default points", () => {
    const result = evaluateHand(
      [
        "1w",
        "1w",
        "1w",
        "2w",
        "2w",
        "2w",
        "3w",
        "3w",
        "3w",
        "4w",
        "4w",
        "4w",
        "5w",
        "5w",
      ],
      createHongKongScoreConfig()
    );

    expect(result.isWinningHand).toBe(true);
    expect(result.bestCandidate.matchedSpecialHands.map((hand) => hand.id)).toEqual(
      expect.arrayContaining(["all_pongs", "pure_one_suit"])
    );
    expect(result.bestCandidate.totalPoints).toBe(10);
  });

  test("scores mixed orphans on top of all pongs", () => {
    const result = evaluateHand(
      [
        "1w",
        "1w",
        "1w",
        "9w",
        "9w",
        "9w",
        "east",
        "east",
        "east",
        "red",
        "red",
        "red",
        "white",
        "white",
      ],
      createHongKongScoreConfig()
    );

    expect(result.isWinningHand).toBe(true);
    expect(result.bestCandidate.matchedSpecialHands.map((hand) => hand.id)).toEqual(
      expect.arrayContaining(["all_pongs", "mixed_orphans", "mixed_one_suit"])
    );
    expect(result.bestCandidate.matchedSpecialHands.map((hand) => hand.id)).toContain(
      "red_dragon"
    );
    expect(result.bestCandidate.totalPoints).toBe(8);
  });

  test("recognizes thirteen orphans", () => {
    const result = evaluateHand(
      [
        "1w",
        "9w",
        "1t",
        "9t",
        "1s",
        "9s",
        "east",
        "south",
        "west",
        "north",
        "red",
        "green",
        "white",
        "white",
      ],
      createHongKongScoreConfig()
    );

    expect(result.isWinningHand).toBe(true);
    expect(result.bestCandidate.handType).toBe("thirteen_orphans");
    expect(result.bestCandidate.matchedSpecialHands.map((hand) => hand.id)).toContain(
      "thirteen_orphans"
    );
  });

  test("does not add individual dragon points to Small Dragons", () => {
    const result = evaluateHand(
      [
        "red", "red", "red",
        "green", "green", "green",
        "white", "white",
        "1w", "2w", "3w",
        "4w", "5w", "6w",
      ],
      createHongKongScoreConfig()
    );
    const matchedIds = result.bestCandidate.matchedSpecialHands.map((hand) => hand.id);

    expect(matchedIds).toContain("small_dragons");
    expect(matchedIds).not.toEqual(
      expect.arrayContaining(["red_dragon", "green_dragon", "white_dragon"])
    );
  });

  test("does not add individual dragon points to Great Dragons", () => {
    const result = evaluateHand(
      [
        "red", "red", "red",
        "green", "green", "green",
        "white", "white", "white",
        "1w", "2w", "3w",
        "east", "east",
      ],
      createHongKongScoreConfig()
    );
    const matchedIds = result.bestCandidate.matchedSpecialHands.map((hand) => hand.id);

    expect(matchedIds).toContain("great_dragons");
    expect(matchedIds).not.toEqual(
      expect.arrayContaining(["red_dragon", "green_dragon", "white_dragon"])
    );
  });

  test("adds self draw as a hand condition bonus", () => {
    const handContext = createDefaultHandContext();
    handContext.selfDraw = true;

    const result = evaluateHand(
      [
        "1w",
        "1w",
        "1w",
        "2w",
        "2w",
        "2w",
        "3w",
        "3w",
        "3w",
        "4w",
        "4w",
        "4w",
        "5w",
        "5w",
      ],
      createHongKongScoreConfig(),
      handContext
    );

    expect(result.bestCandidate.matchedSpecialConditions.map((condition) => condition.id)).toContain(
      "self_draw"
    );
    expect(result.bestCandidate.totalPoints).toBe(11);
  });
});

describe("Sichuan scoring", () => {
  const matchedIds = (result) =>
    result.bestCandidate.matchedSpecialHands.map((hand) => hand.id);

  test("enables Sichuan hands only in the Sichuan preset", () => {
    const sichuan = createSichuanScoreConfig();
    const hongKong = createHongKongScoreConfig();

    expect(sichuan.specialHands.tile_hog.enabled).toBe(true);
    expect(sichuan.specialHands.pure_dragon_seven_pairs.enabled).toBe(true);
    expect(hongKong.specialHands.tile_hog.enabled).toBe(false);
    expect(hongKong.specialHands.pure_dragon_seven_pairs.enabled).toBe(false);
    expect(sichuan.specialConditions.shooting_after_kong.enabled).toBe(true);
    expect(hongKong.specialConditions.shooting_after_kong.enabled).toBe(false);
  });

  test("recognizes a root and Pure All Pongs", () => {
    const rootResult = evaluateHand(
      [
        "1w", "1w", "1w", "1w", "2w", "3w", "4w",
        "5w", "6w", "7w", "8w", "9w", "2t", "2t",
      ],
      createSichuanScoreConfig()
    );
    const purePongsResult = evaluateHand(
      [
        "1w", "1w", "1w", "2w", "2w", "2w", "3w",
        "3w", "3w", "4w", "4w", "4w", "5w", "5w",
      ],
      createSichuanScoreConfig()
    );

    expect(matchedIds(rootResult)).toContain("tile_hog");
    expect(matchedIds(purePongsResult)).toEqual(
      expect.arrayContaining(["all_pongs", "pure_one_suit", "pure_all_pongs"])
    );
  });

  test("recognizes All 2-5-8 Pongs and terminal-containing sets", () => {
    const all258 = evaluateHand(
      [
        "2w", "2w", "2w", "5w", "5w", "5w", "8w",
        "8w", "8w", "2t", "2t", "2t", "5t", "5t",
      ],
      createSichuanScoreConfig()
    );
    const terminals = evaluateHand(
      [
        "1w", "2w", "3w", "7w", "8w", "9w", "1t",
        "1t", "1t", "9t", "9t", "9t", "1s", "1s",
      ],
      createSichuanScoreConfig()
    );
    const pureTerminals = evaluateHand(
      [
        "1w", "2w", "3w", "1w", "2w", "3w", "7w",
        "8w", "9w", "9w", "9w", "9w", "1w", "1w",
      ],
      createSichuanScoreConfig()
    );

    expect(matchedIds(all258)).toContain("all_258_pongs");
    expect(matchedIds(terminals)).toContain("sichuan_all_terminals");
    expect(matchedIds(pureTerminals)).toEqual(
      expect.arrayContaining(["sichuan_all_terminals", "pure_all_terminals"])
    );
  });

  test("recognizes Dragon Seven Pairs and Pure Dragon Seven Pairs", () => {
    const dragonPairs = evaluateHand(
      [
        "1w", "1w", "3w", "3w", "4w", "4w", "6w",
        "6w", "6w", "6w", "5t", "5t", "8t", "8t",
      ],
      createSichuanScoreConfig()
    );
    const pureDragonPairs = evaluateHand(
      [
        "1w", "1w", "1w", "1w", "2w", "2w", "3w",
        "3w", "4w", "4w", "5w", "5w", "6w", "6w",
      ],
      createSichuanScoreConfig()
    );

    expect(matchedIds(dragonPairs)).toContain("dragon_seven_pairs");
    expect(matchedIds(pureDragonPairs)).toEqual(
      expect.arrayContaining([
        "dragon_seven_pairs",
        "pure_seven_pairs",
        "pure_dragon_seven_pairs",
      ])
    );
  });

  test("scores Sichuan-only wait and after-kong inputs", () => {
    const context = createDefaultHandContext();
    context.goldenWait = true;
    context.shootingAfterKong = true;

    const result = evaluateHand(
      [
        "1w", "1w", "1w", "2w", "2w", "2w", "3w",
        "3w", "3w", "4w", "4w", "4w", "5w", "5w",
      ],
      createSichuanScoreConfig(),
      context
    );

    expect(matchedIds(result)).toContain("golden_wait");
    expect(
      result.bestCandidate.matchedSpecialConditions.map((condition) => condition.id)
    ).toContain("shooting_after_kong");
  });
});

describe("Riichi yaku and yakuman detection", () => {
  const evaluateRiichi = (tiles, contextOverrides = {}) => {
    const context = { ...createDefaultHandContext(), ...contextOverrides };
    return evaluateHand(tiles, createRiichiScoreConfig(), context);
  };
  const matchedIds = (result) => [
    ...result.bestCandidate.matchedSpecialHands,
    ...result.bestCandidate.matchedSpecialConditions,
  ].map((match) => match.id);

  test("detects sequence-based yaku", () => {
    const twin = evaluateRiichi([
      "1w", "2w", "3w", "1w", "2w", "3w", "4t",
      "5t", "6t", "7s", "8s", "9s", "east", "east",
    ]);
    const threeSuits = evaluateRiichi([
      "1w", "2w", "3w", "1t", "2t", "3t", "1s",
      "2s", "3s", "4w", "5w", "6w", "east", "east",
    ]);
    const straight = evaluateRiichi([
      "1w", "2w", "3w", "4w", "5w", "6w", "7w",
      "8w", "9w", "1t", "1t", "1t", "east", "east",
    ]);
    const doubleTwin = evaluateRiichi([
      "1w", "2w", "3w", "1w", "2w", "3w", "4t",
      "5t", "6t", "4t", "5t", "6t", "east", "east",
    ]);

    expect(matchedIds(twin)).toContain("twin_sequences");
    expect(matchedIds(threeSuits)).toContain("three_suit_sequences");
    expect(matchedIds(straight)).toContain("straight");
    expect(matchedIds(doubleTwin)).toContain("double_twin_sequences");
    expect(matchedIds(doubleTwin)).not.toContain("twin_sequences");
  });

  test("detects concealed triplets, outside hands, and three-suit triplets", () => {
    const concealed = evaluateRiichi([
      "1w", "1w", "1w", "2t", "2t", "2t", "3s",
      "3s", "3s", "4w", "5w", "6w", "7t", "7t",
    ], { winMethod: "tsumo", selfDraw: true, winningTileIndex: 13 });
    const fullOutside = evaluateRiichi([
      "1w", "2w", "3w", "7w", "8w", "9w", "1t",
      "1t", "1t", "9s", "9s", "9s", "1s", "1s",
    ]);
    const halfOutside = evaluateRiichi([
      "1w", "2w", "3w", "7t", "8t", "9t", "east",
      "east", "east", "red", "red", "red", "1s", "1s",
    ]);
    const suitTriplets = evaluateRiichi([
      "2w", "2w", "2w", "2t", "2t", "2t", "2s",
      "2s", "2s", "4w", "5w", "6w", "east", "east",
    ]);

    expect(matchedIds(concealed)).toContain("three_concealed_triplets");
    expect(matchedIds(fullOutside)).toContain("full_outside_hand");
    expect(matchedIds(halfOutside)).toContain("half_outside_hand");
    expect(matchedIds(suitTriplets)).toContain("three_suit_triplets");
  });

  test("detects three kans, four kans, and All Green", () => {
    const threeKanTiles = [
      "1w", "1w", "1w", "2t", "2t", "2t", "3s",
      "3s", "3s", "4w", "5w", "6w", "7t", "7t",
    ];
    const threeKans = evaluateRiichi(threeKanTiles, {
      openMelds: [
        { type: "kan", tiles: ["1w", "1w", "1w", "1w"], tileIndices: [0, 1, 2], open: true },
        { type: "kan", tiles: ["2t", "2t", "2t", "2t"], tileIndices: [3, 4, 5], open: true },
        { type: "kan", tiles: ["3s", "3s", "3s", "3s"], tileIndices: [6, 7, 8], open: true },
      ],
    });
    const fourKans = evaluateRiichi([
      "1w", "1w", "1w", "2t", "2t", "2t", "3s",
      "3s", "3s", "4w", "4w", "4w", "east", "east",
    ], {
      openMelds: [
        ["1w", [0, 1, 2]], ["2t", [3, 4, 5]],
        ["3s", [6, 7, 8]], ["4w", [9, 10, 11]],
      ].map(([tile, tileIndices]) => ({
        type: "kan", tiles: [tile, tile, tile, tile], tileIndices, open: true,
      })),
    });
    const allGreen = evaluateRiichi([
      "2s", "2s", "2s", "3s", "3s", "3s", "4s",
      "4s", "4s", "6s", "6s", "6s", "8s", "8s",
    ]);

    expect(matchedIds(threeKans)).toContain("three_kans");
    expect(matchedIds(fourKans)).toContain("four_kans");
    expect(fourKans.bestCandidate.isYakuman).toBe(true);
    expect(matchedIds(allGreen)).toContain("all_green");
  });

  test("promotes a non-yakuman hand with at least 13 han to Counted Yakuman", () => {
    const result = evaluateRiichi([
      "1w", "2w", "3w", "1w", "2w", "3w", "7w",
      "8w", "9w", "7w", "8w", "9w", "9w", "9w",
    ], { riichiDeclared: true, winningTileIndex: 1 });

    expect(result.bestCandidate.isCountedYakuman).toBe(true);
    expect(matchedIds(result)).toEqual(["counted_yakuman"]);
    expect(result.bestCandidate.totalPoints).toBe(13);
  });
});

describe("Riichi dora and fu", () => {
  const evaluateRiichi = (tiles, contextOverrides = {}) =>
    evaluateHand(
      tiles,
      createRiichiScoreConfig(),
      { ...createDefaultHandContext(), ...contextOverrides }
    );

  test("converts suited, wind, and dragon indicators with wraparound", () => {
    expect(getDoraFromIndicator("9w")).toBe("1w");
    expect(getDoraFromIndicator("north")).toBe("east");
    expect(getDoraFromIndicator("green")).toBe("red");
    expect(getDoraFromIndicator("white")).toBe("green");
  });

  test("counts visible, ura, red, and the fourth tile of a kan", () => {
    const tiles = [
      "1w", "1w", "1w", "2t", "3t", "4t", "5t",
      "6t", "7t", "2s", "3s", "4s", "east", "east",
    ];
    const context = {
      ...createDefaultHandContext(),
      riichiDeclared: true,
      doraIndicators: ["9w"],
      uraDoraIndicators: ["north"],
      redDoraCount: 1,
      openMelds: [{
        type: "kan",
        tiles: ["1w", "1w", "1w", "1w"],
        tileIndices: [0, 1, 2],
        open: true,
      }],
    };

    expect(countDora(tiles, context)).toMatchObject({
      regular: 4,
      ura: 2,
      red: 1,
      total: 7,
    });
    expect(countDora(tiles, { ...context, riichiDeclared: false }).ura).toBe(0);
  });

  test("calculates ordinary rounded fu with an itemized breakdown", () => {
    const result = evaluateRiichi([
      "1w", "1w", "1w", "2w", "2w", "2w", "3t",
      "4t", "5t", "6s", "7s", "8s", "red", "red",
    ], { winMethod: "ron", winningTileIndex: 13, riichiDeclared: true });

    expect(result.bestCandidate.fu.total).toBe(50);
    expect(result.bestCandidate.fu.items).toEqual(expect.arrayContaining([
      { name: "Base fu", value: 20 },
      { name: "Closed Ron", value: 10 },
      { name: "Dragon pair", value: 2 },
      { name: "Pair wait", value: 2 },
      { name: "Round up", value: 4 },
    ]));
  });

  test("handles fixed Pinfu Tsumo and Seven Pairs fu", () => {
    const pinfu = evaluateRiichi([
      "1w", "2w", "3w", "4w", "5w", "6w", "2t",
      "3t", "4t", "6s", "7s", "8s", "5t", "5t",
    ], { winMethod: "tsumo", selfDraw: true, winningTileIndex: 0 });
    const sevenPairs = evaluateRiichi([
      "1w", "1w", "2w", "2w", "3t", "3t", "4t",
      "4t", "5s", "5s", "6s", "6s", "east", "east",
    ]);

    expect(pinfu.bestCandidate.matchedSpecialHands.map((hand) => hand.id)).toContain("pinfu");
    expect(pinfu.bestCandidate.fu).toMatchObject({ total: 20, fixed: true });
    expect(sevenPairs.bestCandidate.fu).toMatchObject({ total: 25, fixed: true });
  });
});

describe("Riichi payments", () => {
  test("calculates rounded Ron payments for dealer and non-dealer", () => {
    const nonDealer = calculateRiichiPayments({ han: 1, fu: 30 });
    const dealer = calculateRiichiPayments({ han: 1, fu: 30, isDealer: true });

    expect(nonDealer.ronPayment).toBe(1000);
    expect(dealer.ronPayment).toBe(1500);
  });

  test("splits Tsumo payments by dealer status", () => {
    const nonDealer = calculateRiichiPayments({
      han: 1, fu: 30, winMethod: "tsumo",
    });
    const dealer = calculateRiichiPayments({
      han: 1, fu: 30, winMethod: "tsumo", isDealer: true,
    });

    expect(nonDealer).toMatchObject({
      dealerPays: 500,
      nonDealerPays: 300,
      totalFromPlayers: 1100,
    });
    expect(dealer).toMatchObject({
      eachOpponentPays: 500,
      totalFromPlayers: 1500,
    });
  });

  test("applies limits, honba, Riichi sticks, and optional kiriage", () => {
    const mangan = calculateRiichiPayments({
      han: 5, fu: 30, honba: 2, riichiSticks: 3,
    });
    const belowKiriage = calculateRiichiPayments({ han: 4, fu: 30 });
    const kiriage = calculateRiichiPayments({
      han: 4, fu: 30, kiriageMangan: true,
    });
    const yakuman = calculateRiichiPayments({
      isYakuman: true, yakumanCount: 2, isDealer: true,
    });

    expect(mangan).toMatchObject({
      limit: { id: "mangan", name: "Mangan" },
      ronPayment: 8600,
      totalReceived: 11600,
    });
    expect(belowKiriage.ronPayment).toBe(7700);
    expect(kiriage).toMatchObject({
      limit: { id: "mangan", name: "Mangan" },
      ronPayment: 8000,
    });
    expect(yakuman).toMatchObject({
      limit: { id: "yakuman", name: "2× Yakuman" },
      ronPayment: 96000,
    });
  });

  test("integrates payment calculation into the selected Riichi candidate", () => {
    const result = evaluateHand(
      [
        "1w", "2w", "3w", "4w", "5w", "6w", "2t",
        "3t", "4t", "6s", "7s", "8s", "5t", "5t",
      ],
      createRiichiScoreConfig(),
      {
        ...createDefaultHandContext(),
        seatWind: "south",
        winMethod: "tsumo",
        selfDraw: true,
        winningTileIndex: 0,
      }
    );

    expect(result.bestCandidate.han).toBe(1);
    expect(result.bestCandidate.fu.total).toBe(20);
    expect(result.bestCandidate.payments).toMatchObject({
      method: "tsumo",
      dealerPays: 400,
      nonDealerPays: 200,
      totalFromPlayers: 800,
    });
  });
});
