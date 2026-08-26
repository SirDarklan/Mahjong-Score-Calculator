import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import "./App.css";
import { createColorizedTileImages } from "./tileArt";

import tile1w from "./assets/1w.svg";
import tile2w from "./assets/2w.svg";
import tile3w from "./assets/3w.svg";
import tile4w from "./assets/4w.svg";
import tile5w from "./assets/5w.svg";
import tile6w from "./assets/6w.svg";
import tile7w from "./assets/7w.svg";
import tile8w from "./assets/8w.svg";
import tile9w from "./assets/9w.svg";
import tile1t from "./assets/1t.svg";
import tile2t from "./assets/2t.svg";
import tile3t from "./assets/3t.svg";
import tile4t from "./assets/4t.svg";
import tile5t from "./assets/5t.svg";
import tile6t from "./assets/6t.svg";
import tile7t from "./assets/7t.svg";
import tile8t from "./assets/8t.svg";
import tile9t from "./assets/9t.svg";
import tile1s from "./assets/1s.svg";
import tile2s from "./assets/2s.svg";
import tile3s from "./assets/3s.svg";
import tile4s from "./assets/4s.svg";
import tile5s from "./assets/5s.svg";
import tile6s from "./assets/6s.svg";
import tile7s from "./assets/7s.svg";
import tile8s from "./assets/8s.svg";
import tile9s from "./assets/9s.svg";
import tileEast from "./assets/east_wind.svg";
import tileSouth from "./assets/south_wind.svg";
import tileWest from "./assets/west_wind.svg";
import tileNorth from "./assets/north_wind.svg";
import tileRed from "./assets/red_dragon.svg";
import tileGreen from "./assets/green_dragon.svg";
import tileWhite from "./assets/white_dragon.svg";

import {
  createDefaultHandContext,
  createHongKongScoreConfig,
  createDefaultScoreConfig,
  createRiichiScoreConfig,
  createSichuanScoreConfig,
  evaluateHand,
  SPECIAL_CONDITION_DEFINITIONS,
  SPECIAL_HAND_DEFINITIONS,
  tile_labels,
  tile_types,
  WIND_OPTIONS,
} from "./mahjong";

const HAND_SIZE = 14;
const INITIAL_HAND = Array(HAND_SIZE).fill(null);

const identifyOpenMeld = (selectedTiles, declareAsKan = false) => {
  if (selectedTiles.length !== 3) {
    return { type: null, error: "Choose exactly 3 tiles." };
  }

  const [first, second, third] = [...selectedTiles].sort();
  const allMatch = first === second && second === third;

  if (allMatch) {
    return { type: declareAsKan ? "kan" : "pon", error: "" };
  }

  if (declareAsKan) {
    return { type: null, error: "A Kan must contain identical tiles." };
  }

  const suitedTiles = selectedTiles.every((tile) => /^[1-9][wts]$/.test(tile));
  const sameSuit = selectedTiles.every((tile) => tile[1] === selectedTiles[0][1]);
  const ranks = selectedTiles.map((tile) => Number(tile[0])).sort((a, b) => a - b);
  const consecutive = ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1;

  return suitedTiles && sameSuit && consecutive
    ? { type: "chi", error: "" }
    : {
        type: null,
        error: "Select either three identical tiles or three consecutive tiles from one suit.",
      };
};

const TILE_COLOR_OPTIONS = [
  { id: "red", label: "Red", value: "#FF0004" },
  { id: "green", label: "Green", value: "#7A958E" },
  { id: "orange", label: "Orange", value: "#D69E00" },
  { id: "blue", label: "Blue", value: "#000072" },
  { id: "purple", label: "Purple", value: "#BE75BE" },
  { id: "pink", label: "Pink", value: "#FF69B4" },
  { id: "black", label: "Black", value: "#000000" },
];

const TILE_GROUPS = [
  { label: "Characters", tiles: tile_types.filter((tile) => /^[1-9]w$/.test(tile)) },
  { label: "Dots", tiles: tile_types.filter((tile) => /^[1-9]t$/.test(tile)) },
  { label: "Bamboo", tiles: tile_types.filter((tile) => /^[1-9]s$/.test(tile)) },
  { label: "Honor tiles", tiles: tile_types.filter((tile) => !/^[1-9][wts]$/.test(tile)) },
];

const getEnabledRuleIds = (ruleGroup) =>
  Object.entries(ruleGroup)
    .filter(([, config]) => config.enabled)
    .map(([id]) => id);

const createPresetRuleset = (ruleset, scoreConfig) => ({
  ...ruleset,
  scoreConfig,
  baseSpecialHandIds: getEnabledRuleIds(scoreConfig.specialHands),
  baseSpecialConditionIds: getEnabledRuleIds(scoreConfig.specialConditions),
});

const createRulesetConfig = () => ({
  hong_kong: createPresetRuleset(
    {
      id: "hong_kong",
      label: "Hong Kong",
      description: "Preset for Hong Kong scoring rules and special hands.",
      introduction:
        "Hong Kong Mahjong uses a fan-based scoring style with traditional patterns involving suits, honors, winds, dragons, and special winning conditions. In traditional Hong Kong Mahjong, 3 fan is a minimum to declare a win.",
    },
    createHongKongScoreConfig()
  ),
  riichi: createPresetRuleset(
    {
      id: "riichi",
      label: "Japanese (Riichi)",
      description: "Preset for Riichi scoring rules and yaku configuration.",
      introduction:
        "Japanese Riichi Mahjong scores through yaku, fu, and bonuses through dora. All winning hands must have at least 1 yaku.",
    },
    createRiichiScoreConfig()
  ),
  sichuan: createPresetRuleset(
    {
      id: "sichuan",
      label: "Sichuan",
      description: "Preset for Sichuan scoring rules and fan.",
      introduction:
        "Sichuan Mahjong is a fast paced variant that removes all honor tiles and includes the three suits, totaling to 108 tiles. It is typically played with no chi from other players and one missing suit (缺一門）. Points are counted in fan where payouts increase exponentially (1 fan = 2 score, 2 fan = 4 score, etc) where many variants have a fan count of 3 or 4.",
    },
    createSichuanScoreConfig()
  ),
  custom: {
    id: "custom",
    label: "Custom",
    description: "Choose your own working rulesets.",
    introduction:
      "Custom exposes the complete rule library. Enable any combination of special hands and conditions, then assign the point values you want to use.",
    scoreConfig: createDefaultScoreConfig(),
  },
});

const INITIAL_RULESETS = createRulesetConfig();

const tileImages = {
  "1w": tile1w,
  "2w": tile2w,
  "3w": tile3w,
  "4w": tile4w,
  "5w": tile5w,
  "6w": tile6w,
  "7w": tile7w,
  "8w": tile8w,
  "9w": tile9w,
  "1t": tile1t,
  "2t": tile2t,
  "3t": tile3t,
  "4t": tile4t,
  "5t": tile5t,
  "6t": tile6t,
  "7t": tile7t,
  "8t": tile8t,
  "9t": tile9t,
  "1s": tile1s,
  "2s": tile2s,
  "3s": tile3s,
  "4s": tile4s,
  "5s": tile5s,
  "6s": tile6s,
  "7s": tile7s,
  "8s": tile8s,
  "9s": tile9s,
  east: tileEast,
  south: tileSouth,
  west: tileWest,
  north: tileNorth,
  red: tileRed,
  green: tileGreen,
  white: tileWhite,
};

const TileArtContext = createContext(tileImages);

const CONDITION_FIELD_MAP = {
  riichi: "riichiDeclared",
  self_draw: "selfDraw",
  fully_concealed: "fullyConcealed",
  robbing_kong: "robbingKong",
  last_tile: "lastTile",
  kong_draw: "kongDraw",
  shooting_after_kong: "shootingAfterKong",
  double_kong_win: "doubleKongWin",
  heavenly_hand: "heavenlyHand",
  earthly_hand: "earthlyHand",
};

const formatMeld = (meld) => meld.tiles.map((tile) => tile_labels[tile]).join(" • ");

// Use an SVG when we have one; otherwise render a readable fallback tile face.
const TileFace = ({ tile }) => {
  const image = useContext(TileArtContext)[tile];

  if (image) {
    return <img src={image} alt={tile_labels[tile]} className="tile-image" />;
  }

  const suitMap = {
    t: "Dots",
    s: "Bamboo",
    east: "Wind",
    south: "Wind",
    west: "Wind",
    north: "Wind",
    red: "Dragon",
    green: "Dragon",
    white: "Dragon",
  };

  const value = /^[1-9]/.test(tile) ? tile[0] : tile_labels[tile].split(" ")[0];
  const category = suitMap[tile[1]] || suitMap[tile] || "Honor";

  return (
    <div className={`tile-image tile-fallback tile-${tile[1] || tile}`}>
      <span className="tile-fallback-value">{value}</span>
      <span className="tile-fallback-suit">{category}</span>
    </div>
  );
};

function App() {
  const resultPanelRef = useRef(null);
  const [hand, setHand] = useState(INITIAL_HAND);
  const [activeSlot, setActiveSlot] = useState(0);
  const [tileColor, setTileColor] = useState(TILE_COLOR_OPTIONS[0]);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState("calculator");
  const [selectedRulesetId, setSelectedRulesetId] = useState("hong_kong");
  // Each ruleset keeps its own scoring config so presets and custom can evolve independently.
  const [rulesets, setRulesets] = useState(INITIAL_RULESETS);
  const [handContext, setHandContext] = useState(createDefaultHandContext());
  const [declareOpenMeldAsKan, setDeclareOpenMeldAsKan] = useState(false);
  const [openMeldSelection, setOpenMeldSelection] = useState([]);
  const [openMeldError, setOpenMeldError] = useState("");
  const [doraIndicatorDraft, setDoraIndicatorDraft] = useState("1w");
  const [uraDoraIndicatorDraft, setUraDoraIndicatorDraft] = useState("1w");
  // Evaluation is only recomputed when the user presses calculate.
  const [evaluation, setEvaluation] = useState(() =>
    evaluateHand(
      INITIAL_HAND.filter(Boolean),
      INITIAL_RULESETS.hong_kong.scoreConfig,
      createDefaultHandContext()
    )
  );
  const [activeTileImages, setActiveTileImages] = useState(tileImages);
  const activeTileImagesRef = useRef({ revoke: () => {} });

  useEffect(() => {
    let cancelled = false;

    createColorizedTileImages(tileImages, tileColor.value)
      .then((colorized) => {
        if (cancelled) {
          colorized.revoke();
          return;
        }

        const previous = activeTileImagesRef.current;
        activeTileImagesRef.current = colorized;
        setActiveTileImages(colorized.images);
        setTimeout(() => previous.revoke(), 0);
      })
      .catch(() => {
        if (!cancelled) {
          const previous = activeTileImagesRef.current;
          activeTileImagesRef.current = { revoke: () => {} };
          setActiveTileImages(tileImages);
          setTimeout(() => previous.revoke(), 0);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tileColor.value]);

  useEffect(
    () => () => activeTileImagesRef.current.revoke(),
    []
  );

  const activeRuleset = rulesets[selectedRulesetId];
  const activeScoreConfig = activeRuleset.scoreConfig;
  const activeManualHandDefinitions = SPECIAL_HAND_DEFINITIONS.filter(
    (definition) =>
      definition.handContextField &&
      activeScoreConfig.specialHands[definition.id]?.enabled
  );

  const handleHandTileClick = (index) => {
    if (!hand[index]) {
      setActiveSlot(index);
      return;
    }

    setHand((current) => current.map((tile, tileIndex) => (tileIndex === index ? null : tile)));
    setHandContext((current) => ({
      ...current,
      winningTileIndex:
        current.winningTileIndex === index ? null : current.winningTileIndex,
      openMelds: current.openMelds.filter(
        (meld) => !meld.tileIndices.includes(index)
      ),
    }));
    setOpenMeldSelection((current) => current.filter((tileIndex) => tileIndex !== index));
    setActiveSlot(index);
  };

  const handlePaletteTileClick = (tile) => {
    if (hand.filter((handTile) => handTile === tile).length >= 4) return;

    const targetSlot = hand[activeSlot] ? hand.findIndex((handTile) => !handTile) : activeSlot;
    if (targetSlot === -1) return;

    const nextHand = [...hand];
    nextHand[targetSlot] = tile;
    setHand(nextHand);

    const nextEmpty = nextHand.findIndex((handTile, index) => index > targetSlot && !handTile);
    const firstEmpty = nextHand.findIndex((handTile) => !handTile);
    setActiveSlot(nextEmpty === -1 ? (firstEmpty === -1 ? targetSlot : firstEmpty) : nextEmpty);
  };

  const handleClearHand = () => {
    setHand(Array(HAND_SIZE).fill(null));
    setActiveSlot(0);
    setHandContext((current) => ({
      ...current,
      winningTileIndex: null,
      openMelds: [],
      doraIndicators: [],
      uraDoraIndicators: [],
      redDoraCount: 0,
      honba: 0,
      riichiSticks: 0,
    }));
    setOpenMeldSelection([]);
    setDeclareOpenMeldAsKan(false);
    setOpenMeldError("");
  };

  const handleWinMethodChange = (winMethod) => {
    setHandContext((current) => ({
      ...current,
      winMethod,
      selfDraw: winMethod === "tsumo",
    }));
  };

  const handleOpenMeldTileToggle = (index) => {
    setOpenMeldError("");
    setDeclareOpenMeldAsKan(false);
    setOpenMeldSelection((current) => {
      if (current.includes(index)) {
        return current.filter((tileIndex) => tileIndex !== index);
      }

      return current.length < 3 ? [...current, index] : current;
    });
  };

  const handleAddOpenMeld = () => {
    const selectedTiles = openMeldSelection.map((index) => hand[index]);
    const { type, error } = identifyOpenMeld(selectedTiles, declareOpenMeldAsKan);

    if (error) {
      setOpenMeldError(error);
      return;
    }

    const tiles = type === "kan" ? [...selectedTiles, selectedTiles[0]] : selectedTiles;

    setHandContext((current) => ({
      ...current,
      fullyConcealed: false,
      winningTileIndex: openMeldSelection.includes(current.winningTileIndex)
        ? null
        : current.winningTileIndex,
      openMelds: [
        ...current.openMelds,
        {
          id: `${type}-${openMeldSelection.join("-")}`,
          type,
          tiles,
          tileIndices: [...openMeldSelection].sort((a, b) => a - b),
          open: true,
        },
      ],
    }));
    setOpenMeldSelection([]);
    setDeclareOpenMeldAsKan(false);
    setOpenMeldError("");
  };

  const handleRemoveOpenMeld = (meldId) => {
    setHandContext((current) => ({
      ...current,
      openMelds: current.openMelds.filter((meld) => meld.id !== meldId),
    }));
  };

  const handleAddDoraIndicator = (field, indicator) => {
    setHandContext((current) => ({
      ...current,
      [field]: [...current[field], indicator],
    }));
  };

  const handleRemoveDoraIndicator = (field, indexToRemove) => {
    setHandContext((current) => ({
      ...current,
      [field]: current[field].filter((_, index) => index !== indexToRemove),
    }));
  };

  const updateRulesetScoreConfig = (rulesetId, updater) => {
    setRulesets((current) => ({
      ...current,
      [rulesetId]: {
        ...current[rulesetId],
        scoreConfig: updater(current[rulesetId].scoreConfig),
      },
    }));
  };

  const handleSpecialToggle = (rulesetId, id) => {
    updateRulesetScoreConfig(rulesetId, (current) => ({
      ...current,
      specialHands: {
        ...current.specialHands,
        [id]: {
          ...current.specialHands[id],
          enabled: !current.specialHands[id].enabled,
        },
      },
    }));
  };

  const handleSpecialPointsChange = (rulesetId, id, value) => {
    const nextValue = Number(value);

    updateRulesetScoreConfig(rulesetId, (current) => ({
      ...current,
      specialHands: {
        ...current.specialHands,
        [id]: {
          ...current.specialHands[id],
          points: Number.isNaN(nextValue) ? 0 : nextValue,
        },
      },
    }));
  };

  const handleConditionToggle = (rulesetId, id) => {
    updateRulesetScoreConfig(rulesetId, (current) => ({
      ...current,
      specialConditions: {
        ...current.specialConditions,
        [id]: {
          ...current.specialConditions[id],
          enabled: !current.specialConditions[id].enabled,
        },
      },
    }));
  };

  const handleConditionPointsChange = (rulesetId, id, value) => {
    const nextValue = Number(value);

    updateRulesetScoreConfig(rulesetId, (current) => ({
      ...current,
      specialConditions: {
        ...current.specialConditions,
        [id]: {
          ...current.specialConditions[id],
          points: Number.isNaN(nextValue) ? 0 : nextValue,
        },
      },
    }));
  };

  const handleRulesetSelection = (nextRulesetId) => {
    setSelectedRulesetId(nextRulesetId);
    setEvaluation(
      evaluateHand(hand.filter(Boolean), rulesets[nextRulesetId].scoreConfig, handContext)
    );
  };

  const handleCalculate = () => {
    setEvaluation(evaluateHand(hand.filter(Boolean), activeScoreConfig, handContext));

    requestAnimationFrame(() => {
      resultPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  // The result panel renders either the best full winning candidate or the best partial breakdown.
  const bestCandidate = evaluation.bestCandidate;
  const partial = evaluation.partial;
  const selectedOpenMeld = identifyOpenMeld(
    openMeldSelection.map((index) => hand[index]),
    declareOpenMeldAsKan
  );
  const selectedTilesFormPon =
    identifyOpenMeld(
      openMeldSelection.map((index) => hand[index]),
      false
    ).type === "pon";

  const renderScoreEditor = (rulesetId) => {
    const ruleset = rulesets[rulesetId];
    const scoreConfig = ruleset.scoreConfig;
    const isCustomRuleset = rulesetId === "custom";
    const visibleSpecialHands = SPECIAL_HAND_DEFINITIONS.filter(
      (definition) =>
        isCustomRuleset || ruleset.baseSpecialHandIds.includes(definition.id)
    );
    const visibleSpecialConditions = SPECIAL_CONDITION_DEFINITIONS.filter(
      (definition) =>
        isCustomRuleset || ruleset.baseSpecialConditionIds.includes(definition.id)
    );

    const renderRuleRow = (definition, groupKey, onToggle, onPointsChange) => {
      const config = scoreConfig[groupKey][definition.id];

      return (
        <article key={definition.id} className="rule-row">
          <div className="rule-example">
            <span>Example</span>
            <small>SVG placeholder</small>
          </div>

          <div className="rule-copy">
            <div className="rule-copy-header">
              <label className="special-hand-row">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={() => onToggle(rulesetId, definition.id)}
                />
                <span className="config-title">{definition.name}</span>
              </label>
            </div>
            <p className="rule-description">{definition.description}</p>
          </div>

          <label className="rule-points">
            <span className="config-caption">Points</span>
            <input
              type="number"
              min="0"
              value={config.points}
              onChange={(event) =>
                onPointsChange(rulesetId, definition.id, event.target.value)
              }
            />
          </label>
        </article>
      );
    };

    return (
      <div className="config-panel">
        <div className="rule-list">
          {visibleSpecialHands.length ? (
            visibleSpecialHands.map((definition) =>
              renderRuleRow(
                definition,
                "specialHands",
                handleSpecialToggle,
                handleSpecialPointsChange
              )
            )
          ) : (
            <p className="empty-rules-message">
              No scoring rules have been configured for this preset yet.
            </p>
          )}
        </div>

        {visibleSpecialConditions.length > 0 && (
          <>
            <div className="section-heading compact-heading">
              <div>
                <p className="eyebrow">Condition Bonuses</p>
                <h2>Choose special conditions and point values</h2>
              </div>
            </div>

            <div className="rule-list">
              {visibleSpecialConditions.map((definition) =>
                renderRuleRow(
                  definition,
                  "specialConditions",
                  handleConditionToggle,
                  handleConditionPointsChange
                )
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const handleHandContextToggle = (field) => {
    setHandContext((current) => ({
      ...current,
      [field]: !current[field],
    }));
  };

  const handleWindChange = (field, value) => {
    setHandContext((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <TileArtContext.Provider value={activeTileImages}>
    <main className="app-shell">
      <header className="main-header">
        <h1>Mahjong Score Calculator</h1>
        <p className="analysis-message header-copy">
          Build a hand, choose a ruleset or a custom ruleset and let the app calculate the highest scoring hand.
        </p>
        {currentPage === "rules" && (
          <div className="topbar">
          <button
            type="button"
            className="ghost-button"
            onClick={() => setCurrentPage("calculator")}
          >
            Back to calculator
          </button>
          </div>
        )}
      </header>

      {currentPage === "calculator" ? (
        <>
          <section className="workspace-panel">
            <div className="section-heading">
              <div>
                <h2>Build a 14-tile hand</h2>
              </div>
            </div>
           
            <div className="tile-palette" aria-label="Mahjong tile grid">
              <div className="palette-actions">
                <div className="tile-color-picker">
                  <button
                    type="button"
                    className="ghost-button tile-color-button"
                    aria-haspopup="true"
                    aria-expanded={isColorPickerOpen}
                    onClick={() => setIsColorPickerOpen((isOpen) => !isOpen)}
                  >
                    <span
                      className="color-preview"
                      style={{ backgroundColor: tileColor.value }}
                      aria-hidden="true"
                    />
                    Tile back color: {tileColor.label}
                  </button>
                  {isColorPickerOpen && (
                    <div className="color-selector" role="radiogroup" aria-label="Tile back color">
                      {TILE_COLOR_OPTIONS.map((color) => (
                        <button
                          key={color.id}
                          type="button"
                          role="radio"
                          aria-checked={tileColor.id === color.id}
                          className={`color-option ${
                            tileColor.id === color.id ? "color-option-selected" : ""
                          }`}
                          onClick={() => {
                            setTileColor(color);
                            setIsColorPickerOpen(false);
                          }}
                        >
                          <span
                            className="color-swatch"
                            style={{ backgroundColor: color.value }}
                            aria-hidden="true"
                          />
                          {color.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="ghost-button clear-hand-button"
                  onClick={handleClearHand}
                  disabled={!hand.some(Boolean)}
                >
                  Clear all
                </button>
              </div>
              {TILE_GROUPS.map((group) => (
                <div className="palette-row" key={group.label}>
                  <div className="palette-tiles">
                    {group.tiles.map((tile) => {
                      const used = hand.filter((handTile) => handTile === tile).length;
                      return (
                        <button
                          type="button"
                          className="palette-tile"
                          key={tile}
                          onClick={() => handlePaletteTileClick(tile)}
                          disabled={used >= 4 || hand.every(Boolean)}
                          aria-label={`Add ${tile_labels[tile]} (${used} of 4 used)`}
                        >
                          <TileFace tile={tile} />
                          {used > 0 && <span className="tile-count">{used}/4</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="hand-progress" aria-live="polite">
              <span>Building tile {activeSlot + 1} of {HAND_SIZE}</span>
              <span>{hand.filter(Boolean).length} / {HAND_SIZE} selected</span>
            </div>

            <div className="hand-slots" aria-label="Your hand">
              {hand.map((tile, index) => (
                (() => {
                  const isWinningTile = handContext.winningTileIndex === index;
                  const isOpenMeldTile = handContext.openMelds.some((meld) =>
                    meld.tileIndices.includes(index)
                  );

                  return (
                <button
                  key={index}
                  type="button"
                  className={`hand-slot ${activeSlot === index ? "hand-slot-active" : ""} ${!tile ? "hand-slot-empty" : ""} ${isWinningTile ? "hand-slot-winning" : ""} ${isOpenMeldTile ? "hand-slot-open" : ""}`}
                  onClick={() => handleHandTileClick(index)}
                  aria-label={tile ? `Remove ${tile_labels[tile]} from tile ${index + 1}` : `Select empty tile ${index + 1}`}
                >
                  <span className="slot-number">{index + 1}</span>
                  {tile ? <TileFace tile={tile} /> : <span className="empty-tile">+</span>}
                  {isWinningTile && <span className="hand-tile-marker winning-marker">Win</span>}
                  {isOpenMeldTile && <span className="hand-tile-marker open-marker">Open</span>}
                </button>
                  );
                })()
              ))}
            </div>

            <section className="riichi-input-panel" aria-labelledby="meld-input-title">
                <div className="riichi-input-heading">
                  <div>
                    <h3 id="meld-input-title">
                      {selectedRulesetId === "riichi" ? "Riichi win details" : "Open melds"}
                    </h3>
                    <p>
                      {selectedRulesetId === "riichi"
                        ? "Set how the hand won, its winning tile, and any called melds."
                        : "Mark any Chi, Pon, or Kan called from another player."}
                    </p>
                  </div>
                </div>

                {selectedRulesetId === "riichi" && (
                <div className="riichi-primary-inputs">
                  <fieldset className="riichi-fieldset">
                    <legend>Win method</legend>
                    <div className="segmented-control">
                      {[
                        ["ron", "Ron"],
                        ["tsumo", "Tsumo"],
                      ].map(([value, label]) => (
                        <label key={value}>
                          <input
                            type="radio"
                            name="win-method"
                            value={value}
                            checked={handContext.winMethod === value}
                            onChange={() => handleWinMethodChange(value)}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <label className="winning-tile-field">
                    <span>Winning tile</span>
                    <select
                      value={handContext.winningTileIndex ?? ""}
                      onChange={(event) =>
                        setHandContext((current) => ({
                          ...current,
                          winningTileIndex:
                            event.target.value === "" ? null : Number(event.target.value),
                        }))
                      }
                    >
                      <option value="">Choose the winning tile</option>
                      {hand.map((tile, index) => {
                        const belongsToOpenMeld = handContext.openMelds.some((meld) =>
                          meld.tileIndices.includes(index)
                        );

                        return tile && !belongsToOpenMeld ? (
                            <option key={index} value={index}>
                              Tile {index + 1}: {tile_labels[tile]}
                            </option>
                          ) : null;
                      })}
                    </select>
                  </label>
                </div>
                )}

                <div className="open-meld-builder">
                  <div className="open-meld-copy">
                    <strong>Open melds</strong>
                    <span>Select three tiles. The calculator recognizes a Chi or Pon automatically.</span>
                  </div>
                  <div className="open-meld-controls">
                    <button
                      type="button"
                      className={`ghost-button kan-toggle-button ${declareOpenMeldAsKan ? "kan-toggle-active" : ""}`}
                      aria-pressed={declareOpenMeldAsKan}
                      disabled={!selectedTilesFormPon}
                      onClick={() => {
                        setDeclareOpenMeldAsKan((current) => !current);
                        setOpenMeldError("");
                      }}
                    >
                      {declareOpenMeldAsKan ? "Marked as Kan" : "Declare as Kan"}
                    </button>
                    <button
                      type="button"
                      className="ghost-button add-meld-button"
                      onClick={handleAddOpenMeld}
                      disabled={openMeldSelection.length !== 3}
                    >
                      Add open {selectedOpenMeld.type
                        ? selectedOpenMeld.type === "pon"
                          ? "Pon"
                          : selectedOpenMeld.type === "kan"
                            ? "Kan"
                            : "Chi"
                        : "meld"}
                    </button>
                  </div>

                  <div className="meld-tile-picker" aria-label="Select tiles for open meld">
                    {hand.map((tile, index) => {
                      if (!tile) return null;
                      const alreadyUsed = handContext.openMelds.some((meld) =>
                        meld.tileIndices.includes(index)
                      );
                      const selected = openMeldSelection.includes(index);

                      return (
                        <button
                          key={index}
                          type="button"
                          className={`meld-picker-tile ${selected ? "selected" : ""}`}
                          disabled={alreadyUsed}
                          aria-pressed={selected}
                          aria-label={`Tile ${index + 1}: ${tile_labels[tile]}`}
                          onClick={() => handleOpenMeldTileToggle(index)}
                        >
                          <TileFace tile={tile} />
                          <span>{index + 1}</span>
                        </button>
                      );
                    })}
                  </div>

                  {openMeldError && <p className="meld-error" role="alert">{openMeldError}</p>}

                  {handContext.openMelds.length > 0 && (
                    <div className="open-meld-list">
                      {handContext.openMelds.map((meld) => (
                        <div className="open-meld-item" key={meld.id}>
                          <strong>{meld.type === "pon" ? "Pon" : meld.type === "kan" ? "Kan" : "Chi"}</strong>
                          <div className="open-meld-tiles">
                            {meld.tiles.map((tile, index) => (
                              <TileFace key={`${tile}-${index}`} tile={tile} />
                            ))}
                          </div>
                          <button
                            type="button"
                            className="ghost-button remove-meld-button"
                            onClick={() => handleRemoveOpenMeld(meld.id)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedRulesetId === "riichi" && (
                <div className="dora-builder">
                  <div className="open-meld-copy">
                    <strong>Dora indicators</strong>
                    <span>Add the visible indicators. Ura indicators count only after declaring Riichi.</span>
                  </div>

                  <div className="dora-input-grid">
                    <div className="dora-input-group">
                      <label htmlFor="dora-indicator">Dora indicator</label>
                      <div className="dora-add-row">
                        <select
                          id="dora-indicator"
                          value={doraIndicatorDraft}
                          onChange={(event) => setDoraIndicatorDraft(event.target.value)}
                        >
                          {tile_types.map((tile) => (
                            <option key={tile} value={tile}>{tile_labels[tile]}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => handleAddDoraIndicator("doraIndicators", doraIndicatorDraft)}
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="dora-input-group">
                      <label htmlFor="ura-dora-indicator">Ura-dora indicator</label>
                      <div className="dora-add-row">
                        <select
                          id="ura-dora-indicator"
                          value={uraDoraIndicatorDraft}
                          onChange={(event) => setUraDoraIndicatorDraft(event.target.value)}
                        >
                          {tile_types.map((tile) => (
                            <option key={tile} value={tile}>{tile_labels[tile]}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => handleAddDoraIndicator("uraDoraIndicators", uraDoraIndicatorDraft)}
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <label className="dora-input-group red-dora-input">
                      <span>Red dora in hand</span>
                      <input
                        type="number"
                        min="0"
                        max="3"
                        value={handContext.redDoraCount}
                        onChange={(event) =>
                          setHandContext((current) => ({
                            ...current,
                            redDoraCount: Math.max(0, Math.min(3, Number(event.target.value) || 0)),
                          }))
                        }
                      />
                    </label>

                    <label className="dora-input-group red-dora-input">
                      <span>Honba</span>
                      <input
                        type="number"
                        min="0"
                        value={handContext.honba}
                        onChange={(event) =>
                          setHandContext((current) => ({
                            ...current,
                            honba: Math.max(0, Number(event.target.value) || 0),
                          }))
                        }
                      />
                    </label>

                    <label className="dora-input-group red-dora-input">
                      <span>Riichi sticks on table</span>
                      <input
                        type="number"
                        min="0"
                        value={handContext.riichiSticks}
                        onChange={(event) =>
                          setHandContext((current) => ({
                            ...current,
                            riichiSticks: Math.max(0, Number(event.target.value) || 0),
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="indicator-lists">
                    {[
                      ["Dora", "doraIndicators"],
                      ["Ura", "uraDoraIndicators"],
                    ].map(([label, field]) => (
                      <div className="indicator-list" key={field}>
                        <strong>{label}</strong>
                        {handContext[field].length ? handContext[field].map((indicator, index) => (
                          <div className="indicator-chip" key={`${indicator}-${index}`}>
                            <TileFace tile={indicator} />
                            <button
                              type="button"
                              aria-label={`Remove ${label} indicator ${tile_labels[indicator]}`}
                              onClick={() => handleRemoveDoraIndicator(field, index)}
                            >
                              ×
                            </button>
                          </div>
                        )) : <span className="no-indicators">None</span>}
                      </div>
                    ))}
                  </div>
                </div>
                )}
              </section>
            
            <section className="ruleset-section">
              <div className="section-heading ruleset-section-header">
                <h2>Ruleset</h2>
              </div>
              <div className="ruleset-under-hand">
                <span>Current ruleset: <strong>{activeRuleset.label}</strong></span>
                <p>
                  Change the ruleset used to calculate points. Choose Hong Kong,
                  Japanese (Riichi), Sichuan, or create a custom ruleset by
                  selecting which conditions apply and how many points they are worth.
                </p>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setCurrentPage("rules")}
                >
                  Change ruleset
                </button>
              </div>
            </section>
           
            
            <div className="section-heading">
                <div> 
                  <h2>Other Conditions</h2>
                </div>
            </div>

            <div className="context-grid">
              <label className="config-card wind-card">
                <span className="config-title">Seat Wind</span>
                <select
                  value={handContext.seatWind}
                  onChange={(event) =>
                    handleWindChange("seatWind", event.target.value)
                  }
                >
                  {WIND_OPTIONS.map((wind) => (
                    <option key={wind.id} value={wind.id}>
                      {wind.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="config-card wind-card">
                <span className="config-title">Round Wind</span>
                <select
                  value={handContext.roundWind}
                  onChange={(event) =>
                    handleWindChange("roundWind", event.target.value)
                  }
                >
                  {WIND_OPTIONS.map((wind) => (
                    <option key={wind.id} value={wind.id}>
                      {wind.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="config-panel condition-panel">

              <div className="special-hand-grid">
                {SPECIAL_CONDITION_DEFINITIONS.filter(
                  (definition) =>
                    activeScoreConfig.specialConditions[definition.id]?.enabled
                ).map((definition) => (
                  <label
                    key={definition.id}
                    className="config-card special-hand-card special-condition-card"
                  >
                    <span className="special-hand-row">
                      <input
                        type="checkbox"
                        checked={handContext[CONDITION_FIELD_MAP[definition.id]]}
                        onChange={() => handleHandContextToggle(CONDITION_FIELD_MAP[definition.id])}
                      />
                      <span className="config-title">{definition.name}</span>
                    </span>
                  </label>
                ))}
                {activeManualHandDefinitions.map((definition) => (
                  <label
                    key={definition.id}
                    className="config-card special-hand-card special-condition-card"
                  >
                    <span className="special-hand-row">
                      <input
                        type="checkbox"
                        checked={handContext[definition.handContextField]}
                        onChange={() =>
                          handleHandContextToggle(definition.handContextField)
                        }
                      />
                      <span className="config-title">{definition.name}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
              
            <button
              type="button"
              className="calculate-hand-button"
              onClick={handleCalculate}
            >
              Calculate hand
            </button>
          </section>

          <section ref={resultPanelRef} className="result-panel">
            <div className="section-heading">
              <div>
                <h2>
                  {evaluation.isWinningHand
                    ? "Optimal scoring hand found"
                    : "Best breakdown found"}
                </h2>
              </div>
              <span
                className={`status-pill ${
                  evaluation.isWinningHand ? "valid" : "partial"
                }`}
              >
                {evaluation.isWinningHand ? "Winning hand" : "Partial hand"}
              </span>
            </div>

            <p className="analysis-message">{evaluation.message}</p>

            {bestCandidate ? (
              <>
                <div className="score-banner">
                  {selectedRulesetId === "riichi" ? (
                    bestCandidate.isYakuman ? (
                      <><span className="score-label">Result</span><strong>Yakuman</strong></>
                    ) : (
                      <>
                        <span className="score-label">Total</span>
                        <strong>{bestCandidate.han} han</strong>
                        <span className="score-divider">•</span>
                        <strong>{bestCandidate.fu?.total ?? 0} fu</strong>
                      </>
                    )
                  ) : (
                    <><span className="score-label">Total points</span><strong>{bestCandidate.totalPoints}</strong></>
                  )}
                </div>

                <div className="result-grid">
                  <article className="result-card">
                    <h3>Hand Type</h3>
                    <p>{bestCandidate.name}</p>
                  </article>

                  {selectedRulesetId === "riichi" && (
                    <>
                      <article className="result-card">
                        <h3>Dora</h3>
                        <ul>
                          <li>Visible dora: {bestCandidate.dora.regular}</li>
                          <li>Ura-dora: {bestCandidate.dora.ura}</li>
                          <li>Red dora: {bestCandidate.dora.red}</li>
                        </ul>
                        <p className="result-card-total">Total: {bestCandidate.dora.total} han</p>
                      </article>

                      {!bestCandidate.isYakuman && bestCandidate.fu && (
                        <article className="result-card">
                          <h3>Fu breakdown</h3>
                          <ul>
                            {bestCandidate.fu.items.map((item, index) => (
                              <li key={`${item.name}-${index}`}>{item.name}: {item.value} fu</li>
                            ))}
                          </ul>
                          <p className="result-card-total">Total: {bestCandidate.fu.total} fu</p>
                        </article>
                      )}

                      <article className="result-card result-card-wide payment-card">
                        <h3>Payment</h3>
                        {bestCandidate.payments.limit && (
                          <p className="limit-name">{bestCandidate.payments.limit.name}</p>
                        )}
                        {bestCandidate.payments.method === "ron" ? (
                          <p>
                            Discarder pays <strong>{bestCandidate.payments.ronPayment.toLocaleString()}</strong> points
                          </p>
                        ) : bestCandidate.payments.isDealer ? (
                          <p>
                            Each opponent pays <strong>{bestCandidate.payments.eachOpponentPays.toLocaleString()}</strong> points
                          </p>
                        ) : (
                          <p>
                            Dealer pays <strong>{bestCandidate.payments.dealerPays.toLocaleString()}</strong>; each other opponent pays <strong>{bestCandidate.payments.nonDealerPays.toLocaleString()}</strong> points
                          </p>
                        )}
                        {(bestCandidate.payments.honbaBonus > 0 || bestCandidate.payments.riichiBonus > 0) && (
                          <p className="payment-bonuses">
                            Includes {bestCandidate.payments.honbaBonus.toLocaleString()} from honba
                            {bestCandidate.payments.riichiBonus > 0
                              ? `; add ${bestCandidate.payments.riichiBonus.toLocaleString()} from Riichi sticks`
                              : ""}
                          </p>
                        )}
                        <p className="result-card-total">
                          Total received: {bestCandidate.payments.totalReceived.toLocaleString()} points
                        </p>
                      </article>
                    </>
                  )}

                  <article className="result-card">
                    <h3>Special Hands</h3>
                    {bestCandidate.matchedSpecialHands.length ? (
                      <ul>
                        {bestCandidate.matchedSpecialHands.map((matchedHand) => (
                          <li key={matchedHand.id}>
                            {matchedHand.name}
                            {": "}
                            {matchedHand.points}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>None</p>
                    )}
                  </article>

                  <article className="result-card">
                    <h3>Special Conditions</h3>
                    {bestCandidate.matchedSpecialConditions.length ? (
                      <ul>
                        {bestCandidate.matchedSpecialConditions.map((condition) => (
                          <li key={condition.id}>
                            {condition.name}: {condition.points}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>None</p>
                    )}
                  </article>

                  <article className="result-card result-card-wide">
                    <h3>Pair &amp; Melds / Sets</h3>
                    <div className="result-tile-groups">
                      {bestCandidate.melds.map((meld, index) => (
                        <div
                          className="result-tile-group"
                          key={`${meld.type}-${meld.tiles.join("-")}-${index}`}
                        >
                          <span className="result-group-label">
                            {meld.isKan
                              ? "Kan"
                              : meld.type === "pair"
                              ? "Pair"
                              : meld.type === "pong"
                                ? "Pong"
                                : meld.type.toUpperCase()}
                          </span>
                          <div className="result-tile-images">
                            {meld.tiles.map((tile, tileIndex) => (
                              <TileFace
                                key={`${tile}-${tileIndex}`}
                                tile={tile}
                              />
                            ))}
                          </div>
                        </div>
                      ))}

                      {bestCandidate.pair && (
                        <div className="result-tile-group result-pair-group">
                          <span className="result-group-label">Pair</span>
                          <div className="result-tile-images">
                            <TileFace tile={bestCandidate.pair} />
                            <TileFace tile={bestCandidate.pair} />
                          </div>
                        </div>
                      )}

                      {!bestCandidate.pair && !bestCandidate.melds.length && (
                        <p>No pair or meld decomposition</p>
                      )}
                    </div>
                  </article>
                </div>
              </>
            ) : (
              <div className="result-grid">
                <article className="result-card">
                  <h3>Pongs</h3>
                  {partial.pongs.length ? (
                    <ul>
                      {partial.pongs.map((meld, index) => (
                        <li key={`${meld.tiles.join("-")}-${index}`}>{formatMeld(meld)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No pongs</p>
                  )}
                </article>

                <article className="result-card">
                  <h3>Chis</h3>
                  {partial.chis.length ? (
                    <ul>
                      {partial.chis.map((meld, index) => (
                        <li key={`${meld.tiles.join("-")}-${index}`}>{formatMeld(meld)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No chis</p>
                  )}
                </article>

                <article className="result-card">
                  <h3>Leftovers</h3>
                  <p>
                    {partial.leftovers.length
                      ? partial.leftovers
                          .map((tile) => tile_labels[tile])
                          .join(", ")
                      : "None"}
                  </p>
                </article>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="workspace-panel">
          <div className="section-heading">
            <div>
              <h2>Choose and edit rulesets</h2>
            </div>
          </div>

          <div className="ruleset-card-grid">
            {Object.values(rulesets).map((ruleset) => (
              <article
                key={ruleset.id}
                className={`ruleset-card ${
                  selectedRulesetId === ruleset.id ? "ruleset-card-active" : ""
                }`}
              >
                <div>
                  <h3>{ruleset.label}</h3>
                  <p>{ruleset.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRulesetSelection(ruleset.id)}
                >
                  {selectedRulesetId === ruleset.id ? "Active ruleset" : "Use this ruleset"}
                </button>
              </article>
            ))}
          </div>

          <div className="section-heading rules-editor-heading">
            <div>
              <h2>{activeRuleset.label}</h2>
              <p className="ruleset-introduction">{activeRuleset.introduction}</p>
            </div>
          </div>
          {renderScoreEditor(selectedRulesetId)}
        </section>
      )}
    </main>
    </TileArtContext.Provider>
  );
}

export default App;
