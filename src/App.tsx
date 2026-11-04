import React, { useState, useEffect } from 'react';
import { UserAccount, WalletState, FriendUser, FriendRequest, ArcadeSubTab } from './types';
import { INITIAL_WALLET } from './utils/economy';
import {
  getStoredAccount,
  saveStoredAccount,
  getStoredFriends,
  saveStoredFriends,
  getStoredFriendRequests,
  saveStoredFriendRequests,
} from './utils/social';
import { sound } from './utils/audioSynth';
import { Header } from './components/Header';
import { ArcadeHub } from './components/OwoArcade/ArcadeHub';
import { ProfileModal } from './components/ProfileModal';
import { RedeemCodeModal } from './components/RedeemCodeModal';
import { DeveloperCodeModal } from './components/DeveloperCodeModal';
import { WalletModal } from './components/WalletModal';
import { AuthModal } from './components/AuthModal';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  syncUserProfile,
  saveWalletToFirestore,
  searchUserOnline,
  sendOnlineFriendRequest,
  subscribeIncomingFriendRequests,
  logoutUser,
} from './services/firebaseService';

export function getWalletStorageKey(uid?: string | null): string {
  return uid ? `cinenova_owo_wallet_${uid}` : 'cinenova_owo_wallet_guest';
}

export default function App() {
  const [account, setAccount] = useState<UserAccount | null>(() => {
    const saved = getStoredAccount();
    if (saved && (saved.uid || saved.inGameName)) {
      return saved;
    }
    return null;
  });

  const [activeSubTab, setActiveSubTab] = useState<ArcadeSubTab>('flip');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState<boolean>(false);
  const [isDevCodeModalOpen, setIsDevCodeModalOpen] = useState<boolean>(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Friends & Incoming Requests
  const [friends, setFriends] = useState<FriendUser[]>(() => getStoredFriends());
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>(() =>
    getStoredFriendRequests()
  );

  // Initialize wallet strictly scoped to the active account, preserving balances per user
  const [wallet, setWallet] = useState<WalletState>(() => {
    try {
      const initialAcc = getStoredAccount();
      const storageKey = getWalletStorageKey(initialAcc?.uid);
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.teamPetIds || parsed.teamPetIds.length === 0) {
          parsed.teamPetIds = ['starter_cub'];
        }
        if (!parsed.inventory) {
          parsed.inventory = INITIAL_WALLET.inventory;
        }
        if (parsed.level === undefined) {
          parsed.level = 1;
          parsed.xp = 0;
        }
        return {
          ...INITIAL_WALLET,
          ...parsed,
        };
      }
    } catch {
      // ignore
    }
    return { ...INITIAL_WALLET, balanceINR: 0 };
  });

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const currentAcc: UserAccount = account || {
          id: `OWO-${Math.floor(1000 + Math.random() * 9000)}`,
          inGameName: firebaseUser.displayName?.split(' ')[0] || 'Player',
          avatar: '⚡',
          createdAt: Date.now(),
        };

        const cloudProfile = await syncUserProfile(firebaseUser, currentAcc);

        if (cloudProfile) {
          const isDev =
            firebaseUser.uid === 'ixOonIJqExgepuw9BfGMCtQapOE2' ||
            firebaseUser.email === 'hitarth16.2012@gmail.com' ||
            (cloudProfile.inGameName?.toLowerCase() === 'hitarth' && cloudProfile.playerId === 'OWO-9850');

          const updatedAcc: UserAccount = {
            id: isDev ? 'OWO-9850' : cloudProfile.playerId || currentAcc.id,
            inGameName: cloudProfile.inGameName || currentAcc.inGameName,
            avatar: cloudProfile.avatar || currentAcc.avatar,
            createdAt: currentAcc.createdAt,
            uid: firebaseUser.uid,
            email: firebaseUser.email || undefined,
            isCloudSynced: true,
            isDeveloper: isDev,
            role: isDev ? 'developer' : 'member',
          };

          setAccount(updatedAcc);
          saveStoredAccount(updatedAcc);

          // Strictly load the authenticated user's balance from Firestore
          const storageKey = getWalletStorageKey(firebaseUser.uid);
          let localSaved: Partial<WalletState> = {};
          try {
            const raw = localStorage.getItem(storageKey);
            if (raw) localSaved = JSON.parse(raw);
          } catch {}

          setWallet({
            ...INITIAL_WALLET,
            ...localSaved,
            balanceINR: cloudProfile.balanceINR,
            pets:
              cloudProfile.pets && cloudProfile.pets.length > 0
                ? cloudProfile.pets
                : localSaved.pets || INITIAL_WALLET.pets,
            teamPetIds:
              cloudProfile.teamPetIds && cloudProfile.teamPetIds.length > 0
                ? cloudProfile.teamPetIds
                : localSaved.teamPetIds || ['starter_cub'],
          });
        }
      } else {
        // Unauthenticated session
        const stored = getStoredAccount();
        if (!stored?.uid) {
          setWallet((prev) => ({ ...prev, balanceINR: 0 }));
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to incoming friend requests in Firestore
  useEffect(() => {
    if (!account?.id) return;
    const unsub = subscribeIncomingFriendRequests(account.id, (reqs) => {
      if (reqs.length > 0) {
        setIncomingRequests(reqs);
        saveStoredFriendRequests(reqs);
      }
    });
    return () => unsub();
  }, [account?.id]);

  // Audio mute sync
  useEffect(() => {
    sound.setMuted(isMuted);
  }, [isMuted]);

  // Online Loop: 1-minute loan interest accrual & 1-hour 10% income tax deduction
  useEffect(() => {
    // Initialize tax timer if not set
    setWallet((prev) => {
      if (!prev.lastTaxCollectedAt) {
        return { ...prev, lastTaxCollectedAt: Date.now() };
      }
      return prev;
    });

    const interval = setInterval(() => {
      setWallet((prev) => {
        let updated = { ...prev };
        let changed = false;
        const now = Date.now();

        // 1. Accrue Bank Loan interest per minute while online
        if (updated.loan && updated.loan.remainingAmount > 0) {
          const loan = updated.loan;
          const minuteInterest = Math.max(
            1,
            Math.round((loan.principal * (loan.interestRatePercent / 100)) / (24 * 60))
          );

          updated = {
            ...updated,
            loan: {
              ...loan,
              accumulatedInterest: (loan.accumulatedInterest || 0) + minuteInterest,
              accruedInterest: ((loan.accruedInterest || loan.accumulatedInterest) || 0) + minuteInterest,
              remainingAmount: loan.remainingAmount + minuteInterest,
              lastInterestAccruedAt: now,
              lastInterestAccrualAt: now,
            },
          };
          changed = true;
        }

        // 2. Check 10% Income Tax every 1 hour online (3,600,000 ms)
        const lastTax = updated.lastTaxCollectedAt || now;
        if (now - lastTax >= 3600000) {
          if (updated.balanceINR > 100) {
            const taxAmount = Math.max(1, Math.floor(updated.balanceINR * 0.1));
            updated = {
              ...updated,
              balanceINR: updated.balanceINR - taxAmount,
              lastTaxCollectedAt: now,
              transactions: [
                {
                  id: `tx-tax-${now}`,
                  type: 'tax_deduction',
                  game: 'Income Tax',
                  amount: taxAmount,
                  note: `🏛️ Hourly Online Income Tax (10% deducted: ₹${taxAmount.toLocaleString()})`,
                  description: `🏛️ Hourly Online Income Tax (10% deducted: ₹${taxAmount.toLocaleString()})`,
                  timestamp: now,
                },
                ...updated.transactions.slice(0, 49),
              ],
            };
          } else {
            updated = {
              ...updated,
              lastTaxCollectedAt: now,
            };
          }
          changed = true;
        }

        if (changed) {
          try {
            localStorage.setItem(getWalletStorageKey(account?.uid), JSON.stringify(updated));
          } catch {
            // ignore
          }
          if (account?.uid) {
            saveWalletToFirestore(account.uid, updated, account);
          }
          return updated;
        }

        return prev;
      });
    }, 60000); // Runs every 60 seconds

    return () => clearInterval(interval);
  }, [account?.uid]);

  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleUpdateWallet = (newWallet: WalletState) => {
    setWallet(newWallet);
    const storageKey = getWalletStorageKey(account?.uid);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newWallet));
    } catch {
      // fallback
    }

    // Background cloud sync
    if (account?.uid) {
      saveWalletToFirestore(account.uid, newWallet, account);
    }
  };

  const handleUpdateAccount = (newAcc: UserAccount) => {
    // Maintain developer role ONLY if Hitarth AND OWO-9850 with valid developer credential
    const isDev =
      newAcc.id === 'OWO-9850' &&
      (newAcc.inGameName?.toLowerCase() === 'hitarth' ||
       newAcc.uid === 'ixOonIJqExgepuw9BfGMCtQapOE2' ||
       newAcc.email === 'hitarth16.2012@gmail.com');

    newAcc.isDeveloper = isDev;
    newAcc.role = isDev ? 'developer' : 'member';

    setAccount(newAcc);
    saveStoredAccount(newAcc);
    if (newAcc.uid) {
      saveWalletToFirestore(newAcc.uid, wallet, newAcc);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn('Logout error:', err);
    }
    // Strictly clear session and reset to unauthenticated state with 0 Joules
    saveStoredAccount(null);
    setAccount(null);
    const guestWallet: WalletState = {
      ...INITIAL_WALLET,
      balanceINR: 0,
      transactions: [],
      pets: INITIAL_WALLET.pets,
      teamPetIds: ['starter_cub'],
    };
    setWallet(guestWallet);
    try {
      localStorage.setItem(getWalletStorageKey(null), JSON.stringify(guestWallet));
    } catch {}
    setIsProfileModalOpen(false);
    setIsAuthModalOpen(true);
    sound.playCoin();
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* 1. ORIGINAL HITARTH HEADER */}
      <Header
        balanceINR={wallet.balanceINR}
        account={account}
        onOpenWallet={() => setIsWalletModalOpen(true)}
        onOpenRedeem={() => setIsRedeemModalOpen(true)}
        onOpenLeaderboard={() => setActiveSubTab('leaderboard')}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenDevCodeModal={() => setIsDevCodeModalOpen(true)}
        onOpenDevStudio={() => setActiveSubTab('dev_studio')}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* 2. MAIN ORIGINAL HITARTH NAVIGATION & CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 w-full flex-1">
        <ArcadeHub
          wallet={wallet}
          account={account}
          onUpdateWallet={handleUpdateWallet}
          onUpdateAccount={handleUpdateAccount}
          activeSubTab={activeSubTab}
          onSubTabChange={setActiveSubTab}
          onOpenAuth={() => setIsProfileModalOpen(true)}
          onOpenDeveloperCodeModal={() => setIsDevCodeModalOpen(true)}
        />
      </main>

      {/* 3. ORIGINAL HITARTH FOOTER */}
      <footer className="mt-12 py-8 border-t border-slate-900 text-center text-xs text-slate-500 space-y-2.5 bg-slate-950/80">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-slate-400 font-medium px-4">
          <span>🪙 HITARTH OwO Indian Rupee (₹) Arcade</span>
          <span>•</span>
          <span>💬 Real-Time Live Game Bot & Chat</span>
          <span>•</span>
          <span>👥 In-Game Friends & Rupee Donations</span>
          <span>•</span>
          <span>🔒 Private Server Access</span>
          <span>•</span>
          <span>🛡️ 3-Pet Battle Squads</span>
          <span>•</span>
          <span>☁️ Firebase Firestore Powered</span>
        </div>
        <p className="text-slate-600 px-4">
          © 2026 HITARTH. Indian Rupee & Joules minigames with live multiplayer, player IDs, and secret promo codes.
        </p>
      </footer>

      {/* 4. MODALS */}
      {/* Comprehensive Profile Modal (opens when clicking our icon) */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        account={account}
        wallet={wallet}
        onUpdateAccount={handleUpdateAccount}
        onOpenRedeemModal={() => setIsRedeemModalOpen(true)}
        onOpenDevCodeModal={() => setIsDevCodeModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Public Secret Code Redemption Modal */}
      <RedeemCodeModal
        isOpen={isRedeemModalOpen}
        onClose={() => setIsRedeemModalOpen(false)}
        wallet={wallet}
        onUpdateWallet={handleUpdateWallet}
        account={account}
        onOpenDeveloperCodeModal={() => setIsDevCodeModalOpen(true)}
      />

      {/* Developer Secret Code Vault & Generator Modal (ONLY Hitarth OWO-9850) */}
      <DeveloperCodeModal
        isOpen={isDevCodeModalOpen}
        onClose={() => setIsDevCodeModalOpen(false)}
        account={account}
      />

      {/* Virtual Wallet Ledger Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        wallet={wallet}
        onUpdateWallet={handleUpdateWallet}
        initialCode=""
      />

      {/* Account Settings & Firebase Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentAccount={account}
        onAccountSaved={(acc) => {
          handleUpdateAccount(acc);
        }}
        onSignOut={handleLogout}
      />

    </div>
  );
}
