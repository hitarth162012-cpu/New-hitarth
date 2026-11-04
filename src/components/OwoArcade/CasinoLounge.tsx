import React, { useState } from 'react';
import { WalletState } from '../../types';
import { CoinFlipGame } from './CoinFlipGame';
import { SlotsGame } from './SlotsGame';
import { HighLowGame } from './HighLowGame';
import { Coins, Sparkles, Flame, Dices, Layers, ShieldCheck, Gift } from 'lucide-react';

interface CasinoLoungeProps {
  wallet: WalletState;
  onUpdateWallet: (newWallet: WalletState) => void;
  onOpenRedeem: () => void;
}

export const CasinoLounge: React.FC<CasinoLoungeProps> = ({
  wallet,
  onUpdateWallet,
  onOpenRedeem,
}) => {
  const [activeGame, setActiveGame] = useState<'coinflip' | 'slots' | 'highlow'>('coinflip');

  const activeBuff =
    wallet.activeWinRateBuff &&
    wallet.activeWinRateBuff.roundsRemaining > 0 &&
    wallet.activeWinRateBuff.expiresAt > Date.now()
      ? wallet.activeWinRateBuff
      : null;

  return (
    <div className="space-y-6">
      {/* Top Header / Buff Bar */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-slate-900 border border-amber-500/30 p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-wide">GRAND CASINO LOUNGE</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Unified Floor
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Play Coin Flip, Slots, and High-Low in one unified arena with real-time win rate boosts!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenRedeem}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
            >
              <Gift className="w-3.5 h-3.5 text-amber-400" />
              Redeem Code
            </button>
          </div>
        </div>

        {/* Win Rate Buff Alert Banner */}
        {activeBuff ? (
          <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border border-amber-500/50 flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2.5">
              <Flame className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <span className="text-sm font-extrabold text-amber-300">
                  DEVELOPER WIN RATE BUFF ACTIVE: {activeBuff.percent}% WIN CHANCE!
                </span>
                <span className="text-xs text-amber-200/80 block sm:inline sm:ml-2">
                  ({activeBuff.roundsRemaining} rounds left on &ldquo;{activeBuff.codeName}&rdquo;)
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/30 text-amber-200 text-xs font-black uppercase tracking-wider">
              Buff Active
            </span>
          </div>
        ) : (
          <div className="mt-4 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Fair Provably-Random RNG Active
            </span>
            <span className="text-slate-500 hidden sm:inline">
              Developer secret promo codes grant 10% - 100% Win Rate buffs.
            </span>
          </div>
        )}
      </div>

      {/* Unified Casino Navigation Bar */}
      <div className="flex items-center justify-center p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 max-w-md mx-auto shadow-xl">
        <button
          onClick={() => setActiveGame('coinflip')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeGame === 'coinflip'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Coins className="w-4 h-4" />
          Coin Flip
        </button>
        <button
          onClick={() => setActiveGame('slots')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeGame === 'slots'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Dices className="w-4 h-4" />
          Slots
        </button>
        <button
          onClick={() => setActiveGame('highlow')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeGame === 'highlow'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          High-Low
        </button>
      </div>

      {/* Render Selected Casino Game */}
      <div className="transition-all duration-300">
        {activeGame === 'coinflip' && (
          <CoinFlipGame
            wallet={wallet}
            onUpdateWallet={onUpdateWallet}
            onOpenRedeem={onOpenRedeem}
          />
        )}
        {activeGame === 'slots' && (
          <SlotsGame
            wallet={wallet}
            onUpdateWallet={onUpdateWallet}
            onOpenRedeem={onOpenRedeem}
          />
        )}
        {activeGame === 'highlow' && (
          <HighLowGame
            wallet={wallet}
            onUpdateWallet={onUpdateWallet}
            onOpenRedeem={onOpenRedeem}
          />
        )}
      </div>
    </div>
  );
};
