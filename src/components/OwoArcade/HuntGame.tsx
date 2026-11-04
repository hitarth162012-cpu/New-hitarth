import React, { useState, useMemo } from 'react';
import { PetAnimal, WalletState } from '../../types';
import { formatINR, performHunt, subtractFromWallet, addToWallet } from '../../utils/economy';
import { sound } from '../../utils/audioSynth';
import confetti from 'canvas-confetti';
import {
  Compass,
  Sparkles,
  Shield,
  DollarSign,
  AlertTriangle,
  Search,
  Filter,
  ArrowUpDown,
  Flame,
  CheckCircle2,
} from 'lucide-react';

interface HuntGameProps {
  wallet: WalletState;
  onUpdateWallet: (newWallet: WalletState) => void;
  onOpenRedeem: () => void;
}

export const HuntGame: React.FC<HuntGameProps> = ({ wallet, onUpdateWallet, onOpenRedeem }) => {
  const [isHunting, setIsHunting] = useState<boolean>(false);
  const [caughtPet, setCaughtPet] = useState<PetAnimal | null>(null);
  const [activeTab, setActiveTab] = useState<'hunt' | 'zoo'>('hunt');

  // Filters for My Zoo
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [powerFilter, setPowerFilter] = useState<'all' | 'high' | 'mid' | 'low'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'value' | 'power' | 'rarity' | 'newest'>('newest');

  const huntCostINR = 200;

  const handleHunt = () => {
    if (isHunting) return;
    if (wallet.balanceINR < huntCostINR) {
      sound.playLoss();
      return;
    }

    const sub = subtractFromWallet(wallet, huntCostINR, 'Animal Hunt', 'Unified Safari Zoo expedition');
    if (!sub.success) return;

    setIsHunting(true);
    setCaughtPet(null);
    sound.playSlotTick();

    setTimeout(() => {
      const pet = performHunt();
      setIsHunting(false);
      setCaughtPet(pet);

      sound.playCatch();
      if (pet.rarity === 'epic' || pet.rarity === 'legendary' || pet.rarity === 'mythic') {
        confetti({ particleCount: 120, spread: 80 });
      }

      const updated: WalletState = {
        ...sub.updatedWallet,
        pets: [pet, ...sub.updatedWallet.pets],
        stats: {
          ...sub.updatedWallet.stats,
          huntsCount: sub.updatedWallet.stats.huntsCount + 1,
        },
      };

      onUpdateWallet(updated);
    }, 1100);
  };

  const handleSellPet = (pet: PetAnimal) => {
    sound.playWin();
    const remainingPets = wallet.pets.filter((p) => p.id !== pet.id);
    const updated = addToWallet(
      wallet,
      pet.valueINR,
      'Pet Market',
      `Sold ${pet.emoji} ${pet.name} for ${formatINR(pet.valueINR)}!`,
      'hunt_sell'
    );

    onUpdateWallet({
      ...updated,
      pets: remainingPets,
      equippedPetId: wallet.equippedPetId === pet.id ? remainingPets[0]?.id : wallet.equippedPetId,
    });
  };

  const handleEquipPet = (petId: string) => {
    sound.playSlotTick();
    onUpdateWallet({
      ...wallet,
      equippedPetId: petId,
    });
  };

  const getRarityBadge = (rarity: PetAnimal['rarity']) => {
    const colors: Record<string, string> = {
      common: 'bg-slate-800 text-slate-300 border-slate-700',
      uncommon: 'bg-emerald-950 text-emerald-300 border-emerald-800',
      rare: 'bg-blue-950 text-blue-300 border-blue-800',
      epic: 'bg-purple-950 text-purple-300 border-purple-800',
      legendary: 'bg-amber-950 text-amber-300 border-amber-500 animate-pulse',
      mythic: 'bg-gradient-to-r from-red-950 via-purple-950 to-amber-950 text-amber-200 border-amber-400 font-extrabold animate-pulse shadow-sm shadow-amber-500/20',
    };
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${colors[rarity] || colors.common}`}>
        {rarity}
      </span>
    );
  };

  // Filtered & Sorted Pets
  const filteredPets = useMemo(() => {
    const rarityRank: Record<string, number> = {
      mythic: 6,
      legendary: 5,
      epic: 4,
      rare: 3,
      uncommon: 2,
      common: 1,
    };

    return wallet.pets
      .filter((pet) => {
        if (rarityFilter !== 'all' && pet.rarity !== rarityFilter) return false;
        if (powerFilter === 'high' && pet.power < 100) return false;
        if (powerFilter === 'mid' && (pet.power < 50 || pet.power >= 100)) return false;
        if (powerFilter === 'low' && pet.power >= 50) return false;
        if (searchQuery.trim() && !pet.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'value') return b.valueINR - a.valueINR;
        if (sortBy === 'power') return b.power - a.power;
        if (sortBy === 'rarity') return (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0);
        return 0; // Default newest order (already order in array)
      });
  }, [wallet.pets, rarityFilter, powerFilter, searchQuery, sortBy]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>🦁</span>
              <span>HITARTH UNIFIED SAFARI ZOO</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Pure Luck Roll
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              One central Zoo where pure player luck rolls Mythic, Legendary, Epic, Rare, and Uncommon companions!
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('hunt')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'hunt'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Safari Expedition
            </button>
            <button
              onClick={() => setActiveTab('zoo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'zoo'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Zoo Collection</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-emerald-300 font-mono text-[10px]">
                {wallet.pets.length}
              </span>
            </button>
          </div>
        </div>

        {activeTab === 'hunt' ? (
          <div className="space-y-6 py-4">
            {/* Odds Table */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Common</span>
                <span className="font-bold text-slate-200">22%</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-emerald-400 block text-[10px]">Uncommon</span>
                <span className="font-bold text-emerald-300">26%</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-blue-400 block text-[10px]">Rare</span>
                <span className="font-bold text-blue-300">26%</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-purple-400 block text-[10px]">Epic</span>
                <span className="font-bold text-purple-300">15%</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-amber-500/30 bg-amber-950/20">
                <span className="text-amber-400 block text-[10px] font-bold">Legendary</span>
                <span className="font-extrabold text-amber-300">8%</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-950/80 border border-red-500/30 bg-red-950/20">
                <span className="text-red-400 block text-[10px] font-bold animate-pulse">Mythic</span>
                <span className="font-extrabold text-red-300">3%</span>
              </div>
            </div>

            {/* Hunting Arena Visual */}
            <div className="py-10 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-slate-800/80 relative overflow-hidden">
              <div className="text-center px-4">
                {isHunting ? (
                  <div className="space-y-3">
                    <div className="text-6xl animate-bounce">🌲 🐾 🌿</div>
                    <p className="text-base font-bold text-emerald-400 animate-pulse">
                      Rolling Safari Zoo Luck & Tracking Wildlife...
                    </p>
                  </div>
                ) : caughtPet ? (
                  <div className="space-y-4 animate-in zoom-in-95 duration-200">
                    <div className="text-7xl drop-shadow-xl">{caughtPet.emoji}</div>
                    <div>
                      <div className="text-2xl font-black text-white">{caughtPet.name}</div>
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                        {getRarityBadge(caughtPet.rarity)}
                        <span className="text-xs text-slate-300 flex items-center gap-1 bg-slate-800/70 px-2 py-0.5 rounded-full">
                          <Shield className="w-3.5 h-3.5 text-cyan-400" />
                          Power: {caughtPet.power}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-500/30">
                          Value: {formatINR(caughtPet.valueINR)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-slate-400">
                    <div className="text-6xl">🏕️</div>
                    <p className="text-sm font-semibold text-slate-300">
                      Welcome to the Unified Safari Zoo!
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Embark on an expedition to roll for rare mythical guardians, legendary beasts, and powerful companions.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Insufficient Funds Warning */}
            {wallet.balanceINR < huntCostINR && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Need safari pass funds? Claim your daily bonus or redeem secret codes!
                  </span>
                </div>
                <button
                  onClick={onOpenRedeem}
                  className="px-2.5 py-1 text-xs font-bold bg-amber-500 text-slate-950 rounded-lg hover:bg-amber-400 transition-colors shrink-0"
                >
                  Redeem
                </button>
              </div>
            )}

            {/* Action */}
            <button
              type="button"
              disabled={isHunting || wallet.balanceINR < huntCostINR}
              onClick={handleHunt}
              className={`w-full py-4 rounded-xl font-black text-base tracking-wide flex items-center justify-center gap-2 shadow-xl transition-all ${
                isHunting
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : wallet.balanceINR < huntCostINR
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/30 active:scale-[0.99]'
              }`}
            >
              <Compass className="w-5 h-5" />
              {isHunting ? 'Hunting in Zoo...' : `EMBARK ON SAFARI HUNT (${formatINR(huntCostINR)})`}
            </button>
          </div>
        ) : (
          /* Zoo Tab with Comprehensive Filters */
          <div className="py-4 space-y-4">
            {/* Filter Bar */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="flex-1 flex items-center bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs">
                  <Search className="w-4 h-4 text-slate-400 mr-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pets by name..."
                    className="bg-transparent text-white outline-none w-full"
                  />
                </div>

                {/* Sort selector */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-slate-900 border border-slate-800 text-white rounded-lg px-2.5 py-2 text-xs outline-none"
                  >
                    <option value="newest">Sort: Newest</option>
                    <option value="value">Sort: Highest Value</option>
                    <option value="power">Sort: Highest Power</option>
                    <option value="rarity">Sort: Rarity</option>
                  </select>
                </div>
              </div>

              {/* Rarity filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-400 text-[11px] font-medium mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Rarity:
                </span>
                {['all', 'mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRarityFilter(r)}
                    className={`px-2.5 py-1 rounded-lg font-semibold uppercase text-[10px] tracking-wider transition ${
                      rarityFilter === r
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Power filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-400 text-[11px] font-medium mr-1 flex items-center gap-1">
                  ⚡ Power:
                </span>
                {[
                  { id: 'all', label: 'All Power' },
                  { id: 'high', label: '100+ PWR (Godly)' },
                  { id: 'mid', label: '50-99 PWR (Battle)' },
                  { id: 'low', label: '<50 PWR (Standard)' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPowerFilter(p.id as any)}
                    className={`px-2.5 py-1 rounded-lg font-medium text-[10px] transition ${
                      powerFilter === p.id
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results count & stats */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                Showing {filteredPets.length} of {wallet.pets.length} Companions
              </span>
              <span>
                Total Zoo Value:{' '}
                <strong className="text-amber-400 font-mono">
                  {formatINR(wallet.pets.reduce((acc, p) => acc + p.valueINR, 0))}
                </strong>
              </span>
            </div>

            {filteredPets.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                <p className="text-sm">No animals match your selected filters.</p>
                <button
                  onClick={() => {
                    setRarityFilter('all');
                    setPowerFilter('all');
                    setSearchQuery('');
                  }}
                  className="mt-2 text-xs text-emerald-400 hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                {filteredPets.map((pet) => {
                  const isEquipped = wallet.equippedPetId === pet.id;
                  return (
                    <div
                      key={pet.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                        isEquipped
                          ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md shadow-emerald-950/30'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-3xl sm:text-4xl">{pet.emoji}</div>
                        <div>
                          <div className="font-bold text-sm text-white flex items-center gap-1.5">
                            {pet.name}
                            {isEquipped && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 font-bold">
                                EQUIPPED
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {getRarityBadge(pet.rarity)}
                            <span className="text-[11px] text-slate-400">⚡ {pet.power} PWR</span>
                          </div>
                          <div className="text-xs font-mono font-bold text-amber-400 mt-1">
                            {formatINR(pet.valueINR)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        {!isEquipped && (
                          <button
                            onClick={() => handleEquipPet(pet.id)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                          >
                            Equip
                          </button>
                        )}
                        <button
                          onClick={() => handleSellPet(pet)}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1"
                        >
                          <DollarSign className="w-3 h-3" />
                          <span>Sell</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
