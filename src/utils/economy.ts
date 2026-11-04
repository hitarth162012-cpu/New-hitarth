import { PetAnimal, Transaction, WalletState } from '../types';

export const INITIAL_WALLET: WalletState = {
  balanceINR: 0, // Starting balance is strictly 0 INR
  totalWonINR: 0,
  totalLostINR: 0,
  redeemedCodes: [],
  pets: [
    {
      id: 'starter_cub',
      name: 'Baby Bengal Cub',
      rarity: 'rare',
      emoji: '🐯',
      biome: 'Indian Jungle',
      valueINR: 5000,
      power: 45,
      caughtAt: Date.now(),
      level: 1,
    },
  ],
  equippedPetId: 'starter_cub',
  teamPetIds: ['starter_cub'],
  transactions: [
    {
      id: 'tx_init',
      type: 'daily',
      game: 'Wallet Setup',
      amount: 0,
      timestamp: Date.now(),
      note: 'Wallet initialized with ₹0 INR. Ready for OwO Arcade games & secret codes.',
    },
  ],
  inventory: [
    {
      id: 'safari_net_basic',
      name: 'Explorer Safari Net',
      count: 3,
      icon: '🕸️',
      description: 'Standard expedition net for capturing wild beasts.',
      rarity: 'common',
    },
  ],
  level: 1,
  xp: 0,
  stats: {
    flipsPlayed: 0,
    flipsWon: 0,
    slotsSpun: 0,
    slotsJackpots: 0,
    huntsCount: 0,
    battlesWon: 0,
    multiplayerDuelsWon: 0,
    workCount: 0,
    dailyStreak: 0,
  },
};

/**
 * Format Joules currency
 */
export function formatJoules(val: number): string {
  const rounded = Math.round(val);
  return `${rounded.toLocaleString()} Joules`;
}

/**
 * Format Indian Rupees with proper Lakh/Crore comma notation:
 * e.g. 50000 -> "₹50,000"
 */
export function formatINR(val: number): string {
  const rounded = Math.round(val);
  const isNegative = rounded < 0;
  const absStr = Math.abs(rounded).toString();

  if (absStr.length <= 3) {
    return `${isNegative ? '-' : ''}₹${absStr}`;
  }

  const lastThree = absStr.substring(absStr.length - 3);
  const otherNumbers = absStr.substring(0, absStr.length - 3);
  const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');

  return `${isNegative ? '-' : ''}₹${formattedOther},${lastThree}`;
}

/**
 * Add Indian Rupees to wallet
 */
export function addToWallet(
  wallet: WalletState,
  amountINR: number,
  game: string,
  note: string,
  type: Transaction['type'] = 'win'
): WalletState {
  if (amountINR <= 0) return wallet;

  const tx: Transaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    game,
    amount: amountINR,
    timestamp: Date.now(),
    note,
  };

  return {
    ...wallet,
    balanceINR: wallet.balanceINR + amountINR,
    totalWonINR: wallet.totalWonINR + amountINR,
    transactions: [tx, ...wallet.transactions.slice(0, 49)],
  };
}

/**
 * Subtract Indian Rupees from wallet
 */
export function subtractFromWallet(
  wallet: WalletState,
  amountINR: number,
  game: string,
  note: string,
  type: Transaction['type'] = 'loss'
): { success: boolean; updatedWallet: WalletState; error?: string } {
  if (amountINR <= 0) {
    return { success: false, updatedWallet: wallet, error: 'Amount must be greater than 0' };
  }

  if (wallet.balanceINR < amountINR) {
    return {
      success: false,
      updatedWallet: wallet,
      error: `Insufficient balance! You need ${formatINR(amountINR)}, but you have ${formatINR(wallet.balanceINR)}. Claim your daily reward or redeem a secret code!`,
    };
  }

  const tx: Transaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    type,
    game,
    amount: -amountINR,
    timestamp: Date.now(),
    note,
  };

  return {
    success: true,
    updatedWallet: {
      ...wallet,
      balanceINR: wallet.balanceINR - amountINR,
      totalLostINR: wallet.totalLostINR + amountINR,
      transactions: [tx, ...wallet.transactions.slice(0, 49)],
    },
  };
}

// Secret & Promo Code Registry
// All codes reduced by 50% as requested!
// "hitarth" is a hidden secret code — NEVER displayed or listed publicly in UI text!
export const ALL_REDEEM_CODES: Record<string, { amount: number; description: string; isSecret: boolean }> = {
  hitarth: {
    amount: 50000, // 50% less amount (was 100,000, now 50,000)
    description: 'Secret Master Key Unlocked! +₹50,000 Indian Rupees added directly to your wallet!',
    isSecret: true, // Hidden from all public UI listings!
  },
  welcome: {
    amount: 2500, // 50% less amount (was 5,000, now 2,500)
    description: 'Welcome Bonus code! +₹2,500 added.',
    isSecret: false,
  },
  owo2026: {
    amount: 12500, // 50% less amount (was 25,000, now 12,500)
    description: 'OwO 2026 Celebration! +₹12,500 added.',
    isSecret: false,
  },
  arcadeking: {
    amount: 25000, // 50% less amount (was 50,000, now 25,000)
    description: 'Arcade Champion Grant! +₹25,000 added.',
    isSecret: false,
  },
  jackpot777: {
    amount: 38888, // 50% less amount (was 77,777, now 38,888)
    description: 'Lucky 777 Jackpot Drop! +₹38,888 added.',
    isSecret: false,
  },
};

// Only public discoverable codes (never leaking "hitarth")
export const PUBLIC_DISCOVERABLE_CODES = Object.entries(ALL_REDEEM_CODES)
  .filter(([_, v]) => !v.isSecret)
  .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {} as Record<string, { amount: number; description: string }>);

export interface RedeemResult {
  success: boolean;
  amount: number;
  message: string;
  code: string;
}

export function redeemCode(wallet: WalletState, rawCode: string): { updatedWallet: WalletState; result: RedeemResult } {
  const cleanCode = rawCode.trim().toLowerCase();

  if (!cleanCode) {
    return {
      updatedWallet: wallet,
      result: { success: false, amount: 0, message: 'Please enter a redeem code.', code: cleanCode },
    };
  }

  if (wallet.redeemedCodes.map((c) => c.toLowerCase()).includes(cleanCode)) {
    return {
      updatedWallet: wallet,
      result: { success: false, amount: 0, message: `Code has already been redeemed!`, code: cleanCode },
    };
  }

  const promo = ALL_REDEEM_CODES[cleanCode];
  if (!promo) {
    return {
      updatedWallet: wallet,
      result: {
        success: false,
        amount: 0,
        message: `Invalid code. Enter a valid creator or secret promo code.`,
        code: cleanCode,
      },
    };
  }

  const tx: Transaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: 'redeem',
    game: 'Code Redeem',
    amount: promo.amount,
    timestamp: Date.now(),
    note: promo.description,
  };

  const updatedWallet: WalletState = {
    ...wallet,
    balanceINR: wallet.balanceINR + promo.amount,
    totalWonINR: wallet.totalWonINR + promo.amount,
    redeemedCodes: [...wallet.redeemedCodes, cleanCode],
    transactions: [tx, ...wallet.transactions.slice(0, 49)],
  };

  return {
    updatedWallet,
    result: {
      success: true,
      amount: promo.amount,
      message: promo.description,
      code: cleanCode,
    },
  };
}

// --- Coin Flip Game Logic ---
// Rule: Exactly 50% Heads / 50% Tails
export interface FlipOutcome {
  resultSide: 'heads' | 'tails';
  isWin: boolean;
  payoutINR: number;
  netChangeINR: number;
}

export function playCoinFlip(
  betINR: number,
  chosenSide: 'heads' | 'tails',
  forcedOutcome?: 'heads' | 'tails',
  winRateBuffPercent?: number
): FlipOutcome {
  let isWin: boolean;
  let outcome: 'heads' | 'tails';

  if (forcedOutcome) {
    outcome = forcedOutcome;
    isWin = outcome === chosenSide;
  } else if (winRateBuffPercent && winRateBuffPercent >= 10 && winRateBuffPercent <= 100) {
    // Custom developer win probability code active!
    isWin = Math.random() * 100 < winRateBuffPercent;
    outcome = isWin ? chosenSide : chosenSide === 'heads' ? 'tails' : 'heads';
  } else {
    outcome = Math.random() < 0.5 ? 'heads' : 'tails';
    isWin = outcome === chosenSide;
  }

  const payoutINR = isWin ? betINR * 2 : 0;
  const netChangeINR = isWin ? betINR : -betINR;

  return {
    resultSide: outcome,
    isWin,
    payoutINR,
    netChangeINR,
  };
}

// --- Slot Machine Game Logic ---
export interface SlotSymbol {
  id: string;
  emoji: string;
  label: string;
  weight: number;
  payout3x: number;
}

export const SLOT_SYMBOLS: SlotSymbol[] = [
  { id: 'seven', emoji: '7️⃣', label: 'Jackpot 7', weight: 4, payout3x: 50 },
  { id: 'diamond', emoji: '💎', label: 'Diamond', weight: 8, payout3x: 30 },
  { id: 'crown', emoji: '👑', label: 'Crown', weight: 12, payout3x: 20 },
  { id: 'rupee', emoji: '🪙', label: 'Rupee Coin', weight: 18, payout3x: 12 },
  { id: 'grape', emoji: '🍇', label: 'Grape', weight: 26, payout3x: 6 },
  { id: 'cherry', emoji: '🍒', label: 'Cherry', weight: 32, payout3x: 3 },
];

export interface SlotSpinOutcome {
  reels: [SlotSymbol, SlotSymbol, SlotSymbol];
  multiplier: number;
  payoutINR: number;
  isWin: boolean;
  isJackpot: boolean;
}

export function getRandomSlotSymbol(): SlotSymbol {
  const idx = Math.floor(Math.random() * SLOT_SYMBOLS.length);
  return SLOT_SYMBOLS[idx];
}

export function playSlots(
  betINR: number,
  forcedReels?: [SlotSymbol, SlotSymbol, SlotSymbol],
  winRateBuffPercent?: number
): SlotSpinOutcome {
  if (forcedReels) {
    const [s1, s2, s3] = forcedReels;
    let multiplier = 0;
    let isJackpot = false;
    if (s1.id === s2.id && s2.id === s3.id) {
      multiplier = s1.payout3x;
      isJackpot = s1.id === 'seven' || s1.id === 'diamond';
    } else if (s1.id === s2.id || s2.id === s3.id || s1.id === s3.id) {
      multiplier = 1.8;
    }
    return {
      reels: forcedReels,
      multiplier,
      payoutINR: Math.round(betINR * multiplier),
      isWin: multiplier > 0,
      isJackpot,
    };
  }

  // Use custom win percentage if provided (10% - 100%), otherwise standard 30%
  const winProbability =
    winRateBuffPercent && winRateBuffPercent >= 10 && winRateBuffPercent <= 100
      ? winRateBuffPercent / 100
      : 0.30;

  const isWinRoll = Math.random() < winProbability;

  if (!isWinRoll) {
    const shuffled = [...SLOT_SYMBOLS].sort(() => 0.5 - Math.random());
    const reels: [SlotSymbol, SlotSymbol, SlotSymbol] = [shuffled[0], shuffled[1], shuffled[2]];
    return {
      reels,
      multiplier: 0,
      payoutINR: 0,
      isWin: false,
      isJackpot: false,
    };
  }

  // Win spin
  const isJackpotRoll = Math.random() < 0.18;
  if (isJackpotRoll) {
    const sym = Math.random() < 0.5 ? SLOT_SYMBOLS[0] : SLOT_SYMBOLS[1]; // 7 or diamond
    return {
      reels: [sym, sym, sym],
      multiplier: sym.payout3x,
      payoutINR: Math.round(betINR * sym.payout3x),
      isWin: true,
      isJackpot: true,
    };
  }

  const sym = SLOT_SYMBOLS[Math.floor(2 + Math.random() * (SLOT_SYMBOLS.length - 2))];
  return {
    reels: [sym, sym, sym],
    multiplier: sym.payout3x,
    payoutINR: Math.round(betINR * sym.payout3x),
    isWin: true,
    isJackpot: false,
  };
}

// --- High-Low Game Logic ---
export interface CardItem {
  value: number; // 1 to 13
  name: string;
  suit: '♠' | '♥' | '♦' | '♣';
}

export function drawCard(): CardItem {
  const suits: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
  const value = Math.floor(Math.random() * 13) + 1;
  const names: Record<number, string> = {
    1: 'Ace',
    11: 'Jack',
    12: 'Queen',
    13: 'King',
  };
  const name = names[value] || value.toString();
  const suit = suits[Math.floor(Math.random() * suits.length)];
  return { value, name, suit };
}

export function drawCardWithBuff(
  currentVal: number,
  guess: 'higher' | 'lower',
  winRateBuffPercent?: number
): CardItem {
  const normalCard = drawCard();
  if (!winRateBuffPercent || winRateBuffPercent < 10) return normalCard;

  const willWin = Math.random() * 100 < winRateBuffPercent;
  if (willWin) {
    let targetVal: number;
    if (guess === 'higher') {
      targetVal = currentVal >= 13 ? 13 : currentVal + 1 + Math.floor(Math.random() * (13 - currentVal));
    } else {
      targetVal = currentVal <= 1 ? 1 : 1 + Math.floor(Math.random() * (currentVal - 1));
    }
    const suits: ('♠' | '♥' | '♦' | '♣')[] = ['♠', '♥', '♦', '♣'];
    const names: Record<number, string> = { 1: 'Ace', 11: 'Jack', 12: 'Queen', 13: 'King' };
    return {
      value: targetVal,
      name: names[targetVal] || targetVal.toString(),
      suit: suits[Math.floor(Math.random() * suits.length)],
    };
  }
  return normalCard;
}

export const HIGH_LOW_STREAK_MULTIPLIERS = [1.3, 1.8, 2.6, 4.0, 6.5, 11.0, 20.0, 35.0];

export function checkHighLowGuess(currentVal: number, nextVal: number, guess: 'higher' | 'lower'): 'win' | 'loss' | 'tie' {
  if (nextVal === currentVal) return 'tie';
  if (guess === 'higher') {
    return nextVal > currentVal ? 'win' : 'loss';
  } else {
    return nextVal < currentVal ? 'win' : 'loss';
  }
}

// --- Unified Grand Safari Zoo Pet Roster ---
// "in the hunt make only 1 zoo where our luck decide that which animal is come to our inventory add more pets add mythical legendary"
export const HUNT_ANIMALS_POOL: Omit<PetAnimal, 'id' | 'caughtAt' | 'level'>[] = [
  // MYTHIC PETS (Apex Tier)
  { name: 'Celestial Kirin', rarity: 'mythic', emoji: '🦄', biome: 'Grand Safari Zoo', valueINR: 180000, power: 320 },
  { name: 'Golden Garuda Dragon', rarity: 'mythic', emoji: '🐉', biome: 'Grand Safari Zoo', valueINR: 200000, power: 350 },
  { name: 'Cybernetic Phoenix', rarity: 'mythic', emoji: '🔥', biome: 'Grand Safari Zoo', valueINR: 190000, power: 330 },
  { name: 'Cosmic Void Leviathan', rarity: 'mythic', emoji: '🐋', biome: 'Grand Safari Zoo', valueINR: 175000, power: 310 },
  { name: 'Solar Sunflame Griffin', rarity: 'mythic', emoji: '🦅', biome: 'Grand Safari Zoo', valueINR: 165000, power: 300 },

  // LEGENDARY PETS (King Tier)
  { name: 'Royal Bengal White Tiger', rarity: 'legendary', emoji: '🐅', biome: 'Grand Safari Zoo', valueINR: 95000, power: 190 },
  { name: 'Sovereign Lion King', rarity: 'legendary', emoji: '🦁', biome: 'Grand Safari Zoo', valueINR: 90000, power: 185 },
  { name: 'Phantom Shadow Leopard', rarity: 'legendary', emoji: '🐆', biome: 'Grand Safari Zoo', valueINR: 85000, power: 175 },
  { name: 'Storm Thunder Worg', rarity: 'legendary', emoji: '🐺', biome: 'Grand Safari Zoo', valueINR: 80000, power: 170 },
  { name: 'Ancient Iron Rhino', rarity: 'legendary', emoji: '🦏', biome: 'Grand Safari Zoo', valueINR: 75000, power: 165 },

  // EPIC PETS (Champion Tier)
  { name: 'Majestic Tusker', rarity: 'epic', emoji: '🐘', biome: 'Grand Safari Zoo', valueINR: 48000, power: 130 },
  { name: 'Golden Mountain Eagle', rarity: 'epic', emoji: '🦅', biome: 'Grand Safari Zoo', valueINR: 45000, power: 125 },
  { name: 'Desert Phoenix Falcon', rarity: 'epic', emoji: '🪶', biome: 'Grand Safari Zoo', valueINR: 42000, power: 120 },
  { name: 'Shadow Panther', rarity: 'epic', emoji: '🐈‍⬛', biome: 'Grand Safari Zoo', valueINR: 38000, power: 115 },
  { name: 'King Golden Cobra', rarity: 'epic', emoji: '🐍', biome: 'Grand Safari Zoo', valueINR: 35000, power: 110 },
  { name: 'Silver Frost Wolf', rarity: 'epic', emoji: '🐺', biome: 'Grand Safari Zoo', valueINR: 32000, power: 105 },

  // RARE PETS (Veteran Tier)
  { name: 'Baby Bengal Cub', rarity: 'rare', emoji: '🐯', biome: 'Grand Safari Zoo', valueINR: 16000, power: 75 },
  { name: 'Snow Leopard', rarity: 'rare', emoji: '🐆', biome: 'Grand Safari Zoo', valueINR: 15000, power: 72 },
  { name: 'Golden Cobra', rarity: 'rare', emoji: '🐍', biome: 'Grand Safari Zoo', valueINR: 14000, power: 68 },
  { name: 'Celestial White Stag', rarity: 'rare', emoji: '🦌', biome: 'Grand Safari Zoo', valueINR: 13000, power: 65 },
  { name: 'Wild Water Buffalo', rarity: 'rare', emoji: '🐃', biome: 'Grand Safari Zoo', valueINR: 12000, power: 60 },

  // UNCOMMON PETS (Adventurer Tier)
  { name: 'Spotted Deer', rarity: 'uncommon', emoji: '🦌', biome: 'Grand Safari Zoo', valueINR: 3500, power: 35 },
  { name: 'Dancing Peacock', rarity: 'uncommon', emoji: '🦚', biome: 'Grand Safari Zoo', valueINR: 3200, power: 32 },
  { name: 'Mountain Ibex', rarity: 'uncommon', emoji: '🐐', biome: 'Grand Safari Zoo', valueINR: 2800, power: 30 },
  { name: 'Royal Dromedary Camel', rarity: 'uncommon', emoji: '🐪', biome: 'Grand Safari Zoo', valueINR: 2500, power: 28 },
  { name: 'Desert Jackal', rarity: 'uncommon', emoji: '🐕', biome: 'Grand Safari Zoo', valueINR: 2200, power: 25 },
  { name: 'River Otter', rarity: 'uncommon', emoji: '🦦', biome: 'Grand Safari Zoo', valueINR: 2000, power: 22 },

  // COMMON PETS (Starter Tier)
  { name: 'Jungle Hare', rarity: 'common', emoji: '🐇', biome: 'Grand Safari Zoo', valueINR: 600, power: 15 },
  { name: 'Desert Fennec Fox', rarity: 'common', emoji: '🦊', biome: 'Grand Safari Zoo', valueINR: 550, power: 14 },
  { name: 'Snow Hare', rarity: 'common', emoji: '🐇', biome: 'Grand Safari Zoo', valueINR: 500, power: 13 },
  { name: 'Forest Squirrel', rarity: 'common', emoji: '🐿️', biome: 'Grand Safari Zoo', valueINR: 450, power: 12 },
  { name: 'Jungle Baboon', rarity: 'common', emoji: '🐒', biome: 'Grand Safari Zoo', valueINR: 400, power: 11 },
];

/**
 * 1 Unified Grand Safari Zoo Hunt
 * Luck determines which animal enters your inventory!
 */
export function performHunt(_legacyBiome?: string): PetAnimal {
  const roll = Math.random() * 100;
  let targetRarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

  if (roll < 3) {
    targetRarity = 'mythic'; // 3%
  } else if (roll < 11) {
    targetRarity = 'legendary'; // 8%
  } else if (roll < 26) {
    targetRarity = 'epic'; // 15%
  } else if (roll < 52) {
    targetRarity = 'rare'; // 26%
  } else if (roll < 78) {
    targetRarity = 'uncommon'; // 26%
  } else {
    targetRarity = 'common'; // 22%
  }

  const matching = HUNT_ANIMALS_POOL.filter((p) => p.rarity === targetRarity);
  const picked =
    matching.length > 0
      ? matching[Math.floor(Math.random() * matching.length)]
      : HUNT_ANIMALS_POOL[Math.floor(Math.random() * HUNT_ANIMALS_POOL.length)];

  return {
    ...picked,
    id: `pet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    caughtAt: Date.now(),
    level: 1,
  };
}

// --- Battle Monsters (Hard To Defeat) ---
// "make boss hard to defeat and we defeat a boos so the boos will come next day"
export interface MonsterBoss {
  id: string;
  name: string;
  avatar: string;
  maxHp: number;
  currentHp: number;
  attackPower: number;
  rewardINR: number;
  description: string;
  difficulty: 'Hard' | 'Extreme' | 'Nightmare' | 'Mythic Apex';
}

export const MONSTERS: MonsterBoss[] = [
  {
    id: 'goblin',
    name: 'Shadow Goblin Master Thief',
    avatar: '👺',
    maxHp: 750, // Buffed from 200
    currentHp: 750,
    attackPower: 50, // Buffed from 25
    rewardINR: 5000,
    description: 'A cunning shadow goblin thief with enchanted daggers and evasive parries.',
    difficulty: 'Hard',
  },
  {
    id: 'worg',
    name: 'Cybernetic Worg Alpha Packleader',
    avatar: '🐺',
    maxHp: 1800, // Buffed from 450
    currentHp: 1800,
    attackPower: 110, // Buffed from 45
    rewardINR: 15000,
    description: 'Titanium-armored cyber beast boasting plasma-coated fangs and brutal charge.',
    difficulty: 'Extreme',
  },
  {
    id: 'golem',
    name: 'Ancient Runed Stone Colossus',
    avatar: '🗿',
    maxHp: 3800, // Buffed from 800
    currentHp: 3800,
    attackPower: 190, // Buffed from 70
    rewardINR: 40000,
    description: 'An ancient mountain monolith infused with seismic shockwaves and impenetrable granite armor.',
    difficulty: 'Nightmare',
  },
  {
    id: 'dragon',
    name: 'Crimson Dragon Sovereign',
    avatar: '🐲',
    maxHp: 8500, // Buffed from 1500
    currentHp: 8500,
    attackPower: 320, // Buffed from 110
    rewardINR: 100000,
    description: 'The apocalyptic volcanic lord of ashes. Breathes white-hot dragonfire that devastates unprepared squads.',
    difficulty: 'Mythic Apex',
  },
];
