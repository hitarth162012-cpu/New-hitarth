import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  where,
  getDocs,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, cleanForFirestore } from '../firebase';
import {
  UserAccount,
  WalletState,
  CloudBattleRecord,
  MultiplayerRoom,
  FriendUser,
  PrivateServer,
  ServerChatMessage,
  DevStudioProject,
  DevProjectExecutionStatus,
  DevProjectSettings,
  CustomGameCode,
} from '../types';

export interface FirestoreUserProfile {
  id: string; // Auth UID
  email: string;
  inGameName: string;
  playerId: string; // "OWO-XXXX"
  avatar: string;
  balanceINR: number;
  teamPetIds: string[];
  unlockedPetIds: string[];
  bossWins: number;
  pvpWins: number;
  pvpLosses: number;
  pets?: any[];
  xp?: number;
  updatedAt: string;
  createdAt: string;
}

export interface FirestoreLeaderboardEntry {
  userId: string;
  inGameName: string;
  playerId: string;
  avatar: string;
  balanceINR: number;
  bossWins: number;
  pvpWins: number;
  updatedAt: string;
}

/**
 * Check if a Google/email auth session exists
 */
export async function ensureOnlineAuth(): Promise<FirebaseUser | null> {
  return auth.currentUser;
}

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

/**
 * Convert username or email into a valid Firebase Auth email
 */
export function toAuthEmail(identifier: string): string {
  const clean = identifier.trim().toLowerCase();
  if (clean.includes('@')) return clean;
  const safeUser = clean.replace(/[^a-z0-9_.-]/g, '');
  return `${safeUser || 'player'}@owo.arcade`;
}

/**
 * Sign in with Email & Password or Username
 */
export async function registerWithEmail(email: string, pass: string): Promise<FirebaseUser> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    return cred.user;
  } catch (error) {
    console.error('Firebase Email Register Error:', error);
    throw error;
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<FirebaseUser> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return cred.user;
  } catch (error) {
    console.error('Firebase Email Login Error:', error);
    throw error;
  }
}

export async function loginWithEmailOrUsername(identifier: string, pass: string): Promise<FirebaseUser> {
  const email = toAuthEmail(identifier);
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return cred.user;
  } catch (error: any) {
    console.error('Firebase Login Error:', error);
    if (
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/invalid-email'
    ) {
      throw new Error('Invalid in-game name/email or incorrect password.');
    }
    throw error;
  }
}

export async function registerWithEmailOrUsername(
  identifier: string,
  pass: string,
  inGameName?: string,
  avatar?: string
): Promise<FirebaseUser> {
  const email = toAuthEmail(identifier);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    return cred.user;
  } catch (error: any) {
    console.error('Firebase Register Error:', error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This in-game name or email is already registered. Please sign in instead.');
    }
    if (error.code === 'auth/weak-password') {
      throw new Error('Password should be at least 6 characters.');
    }
    throw error;
  }
}

/**
 * Guest sign-in without contacting disabled STS token service
 */
export async function loginAsGuest(): Promise<FirebaseUser | null> {
  return auth.currentUser;
}

/**
 * Sign Out
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Firebase Sign-Out Error:', error);
    throw error;
  }
}

/**
 * Fetch or Initialize User Profile in Firestore
 * CRITICAL SECURITY GUARANTEE: Never leaks balance from previous sessions!
 * Existing accounts preserve their exact Firestore balance. New accounts start at starter amount.
 */
export async function syncUserProfile(
  user: FirebaseUser,
  fallbackAccount: UserAccount,
  walletOrStarter?: WalletState | number
): Promise<FirestoreUserProfile | null> {
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data() as FirestoreUserProfile;
      return data;
    }

    // Determine starter balance: never use dirty wallet from previous user!
    const isHitarth =
      user.uid === 'ixOonIJqExgepuw9BfGMCtQapOE2' || user.email === 'hitarth16.2012@gmail.com';
    const starterAmount = isHitarth ? 1000000 : 500;

    // Initialize document ONLY for brand new user
    const newProfile: FirestoreUserProfile = {
      id: user.uid,
      email: user.email || `${user.uid}@owo.arcade`,
      inGameName: isHitarth ? 'Hitarth' : (fallbackAccount.inGameName || user.displayName || 'ArcadeHero'),
      playerId: isHitarth ? 'OWO-9850' : (fallbackAccount.id || `OWO-${Math.floor(1000 + Math.random() * 9000)}`),
      avatar: fallbackAccount.avatar || '⚡',
      balanceINR: starterAmount,
      teamPetIds: ['starter_cub'],
      unlockedPetIds: ['starter_cub'],
      bossWins: 0,
      pvpWins: 0,
      pvpLosses: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(userRef, cleanForFirestore(newProfile));

    // Also update leaderboard record
    await updateCloudLeaderboard(user.uid, {
      userId: user.uid,
      inGameName: newProfile.inGameName,
      playerId: newProfile.playerId,
      avatar: newProfile.avatar,
      balanceINR: newProfile.balanceINR,
      bossWins: newProfile.bossWins,
      pvpWins: newProfile.pvpWins,
      updatedAt: new Date().toISOString(),
    });

    return newProfile;
  } catch (error) {
    handleFirestoreError({
      action: 'create',
      collection: 'users',
      docId: user.uid,
      originalError: error,
    });
    return null;
  }
}

/**
 * Save user wallet & stats updates to Firestore
 */
export async function saveWalletToFirestore(
  userId: string,
  wallet: WalletState,
  account: UserAccount
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const payload = {
      balanceINR: wallet.balanceINR,
      teamPetIds: wallet.teamPetIds || [],
      unlockedPetIds: wallet.pets.map((p) => p.id),
      bossWins: wallet.stats.battlesWon || 0,
      pvpWins: wallet.stats.multiplayerDuelsWon || 0,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(userRef, cleanForFirestore(payload));

    // Sync to public leaderboard
    await updateCloudLeaderboard(userId, {
      userId,
      inGameName: account.inGameName,
      playerId: account.id,
      avatar: account.avatar,
      balanceINR: wallet.balanceINR,
      bossWins: wallet.stats.battlesWon || 0,
      pvpWins: wallet.stats.multiplayerDuelsWon || 0,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError({
      action: 'update',
      collection: 'users',
      docId: userId,
      originalError: error,
    });
  }
}

/**
 * Update document in `/leaderboard/{userId}`
 */
export async function updateCloudLeaderboard(
  userId: string,
  entry: FirestoreLeaderboardEntry
): Promise<void> {
  try {
    const lbRef = doc(db, 'leaderboard', userId);
    await setDoc(lbRef, cleanForFirestore(entry), { merge: true });
  } catch (error) {
    handleFirestoreError({
      action: 'update',
      collection: 'leaderboard',
      docId: userId,
      originalError: error,
    });
  }
}

/**
 * Real-time listener for the Top Global Players from Firestore
 */
export function subscribeGlobalLeaderboard(
  onUpdate: (entries: FirestoreLeaderboardEntry[]) => void,
  limitCount: number = 10
): Unsubscribe {
  try {
    const lbCollection = collection(db, 'leaderboard');
    const q = query(lbCollection, orderBy('balanceINR', 'desc'), limit(limitCount));

    return onSnapshot(
      q,
      (snapshot) => {
        const entries: FirestoreLeaderboardEntry[] = [];
        snapshot.forEach((docSnap) => {
          entries.push(docSnap.data() as FirestoreLeaderboardEntry);
        });
        onUpdate(entries);
      },
      (error) => {
        handleFirestoreError({
          action: 'list',
          collection: 'leaderboard',
          originalError: error,
        });
      }
    );
  } catch (error) {
    handleFirestoreError({
      action: 'list',
      collection: 'leaderboard',
      originalError: error,
    });
    return () => {};
  }
}

/**
 * Record a Boss or PvP battle directly to `/battles` collection
 */
export async function recordBattleToFirestore(
  userId: string,
  battleData: {
    type: 'boss' | 'pvp';
    playerName: string;
    opponentName: string;
    result: 'win' | 'loss' | 'draw';
    rewardINR: number;
    petsUsed: string[];
  }
): Promise<string | null> {
  try {
    await ensureOnlineAuth();
    const battlesCol = collection(db, 'battles');
    const docRef = await addDoc(battlesCol, cleanForFirestore({
      ...battleData,
      userId,
      timestamp: new Date().toISOString(),
    }));
    return docRef.id;
  } catch (error) {
    handleFirestoreError({
      action: 'create',
      collection: 'battles',
      originalError: error,
    });
    return null;
  }
}

/**
 * Real-time subscription to recent battles
 */
export function subscribeUserBattles(
  userId: string,
  onUpdate: (battles: CloudBattleRecord[]) => void,
  limitCount: number = 8
): Unsubscribe {
  try {
    const battlesCol = collection(db, 'battles');
    const q = query(
      battlesCol,
      where('userId', '==', userId),
      limit(limitCount)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const records: CloudBattleRecord[] = [];
        snapshot.forEach((docSnap) => {
          records.push({
            id: docSnap.id,
            ...(docSnap.data() as Omit<CloudBattleRecord, 'id'>),
          });
        });
        records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        onUpdate(records);
      },
      (error) => {
        handleFirestoreError({
          action: 'list',
          collection: 'battles',
          originalError: error,
        });
      }
    );
  } catch (error) {
    handleFirestoreError({
      action: 'list',
      collection: 'battles',
      originalError: error,
    });
    return () => {};
  }
}

// =========================================================================
// REAL-TIME ONLINE MULTIPLAYER ROOMS (1v1 PvP Flip, Battle, High-Low)
// =========================================================================

/**
 * Save / Create / Update a Multiplayer Room in Firestore
 */
export async function saveOnlineRoom(room: MultiplayerRoom): Promise<void> {
  try {
    await ensureOnlineAuth();
    const roomRef = doc(db, 'rooms', room.code.toUpperCase());
    await setDoc(roomRef, cleanForFirestore({
      ...room,
      code: room.code.toUpperCase(),
      lastUpdated: Date.now(),
    }));
  } catch (error) {
    handleFirestoreError({
      action: 'create',
      collection: 'rooms',
      docId: room.code,
      originalError: error,
    });
  }
}

/**
 * Fetch a Multiplayer Room from Firestore by code
 */
export async function getOnlineRoom(code: string): Promise<MultiplayerRoom | null> {
  try {
    const roomRef = doc(db, 'rooms', code.trim().toUpperCase());
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      return snap.data() as MultiplayerRoom;
    }
    return null;
  } catch (error) {
    handleFirestoreError({
      action: 'read',
      collection: 'rooms',
      docId: code,
      originalError: error,
    });
    return null;
  }
}

/**
 * Real-time listener for a Multiplayer Room (instant synchronization across devices)
 */
export function subscribeOnlineRoom(
  code: string,
  onUpdate: (room: MultiplayerRoom) => void
): Unsubscribe {
  try {
    const cleanCode = code.trim().toUpperCase();
    const roomRef = doc(db, 'rooms', cleanCode);

    return onSnapshot(
      roomRef,
      (docSnap) => {
        if (docSnap.exists()) {
          onUpdate(docSnap.data() as MultiplayerRoom);
        }
      },
      (error) => {
        handleFirestoreError({
          action: 'read',
          collection: 'rooms',
          docId: cleanCode,
          originalError: error,
        });
      }
    );
  } catch (error) {
    handleFirestoreError({
      action: 'read',
      collection: 'rooms',
      docId: code,
      originalError: error,
    });
    return () => {};
  }
}

/**
 * List all waiting/joinable online rooms in real-time
 */
export function subscribeOnlineOpenRooms(
  onUpdate: (rooms: MultiplayerRoom[]) => void
): Unsubscribe {
  try {
    const col = collection(db, 'rooms');
    const q = query(col, where('status', '==', 'waiting'), limit(12));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: MultiplayerRoom[] = [];
        snapshot.forEach((snap) => {
          list.push(snap.data() as MultiplayerRoom);
        });
        onUpdate(list);
      },
      (error) => {
        handleFirestoreError({
          action: 'list',
          collection: 'rooms',
          originalError: error,
        });
      }
    );
  } catch (error) {
    handleFirestoreError({
      action: 'list',
      collection: 'rooms',
      originalError: error,
    });
    return () => {};
  }
}

// =========================================================================
// REAL-TIME ONLINE SOCIAL: FRIENDS, REQUESTS & RUPEE DONATIONS
// =========================================================================

/**
 * Search user online across all registered players by OwO ID or name
 */
export async function searchUserOnline(searchStr: string): Promise<FriendUser | null> {
  try {
    const clean = searchStr.trim();
    if (!clean) return null;

    const usersCol = collection(db, 'users');
    // Search by playerId (e.g. OWO-XXXX)
    const qPlayerId = query(usersCol, where('playerId', '==', clean.toUpperCase()));
    const snap = await getDocs(qPlayerId);

    if (!snap.empty) {
      const data = snap.docs[0].data() as FirestoreUserProfile;
      return {
        id: data.playerId,
        name: data.inGameName,
        avatar: data.avatar,
        accumulatedINR: data.balanceINR,
        status: 'online',
        addedAt: Date.now(),
      };
    }

    // Fallback: search by inGameName
    const qName = query(usersCol, where('inGameName', '==', clean));
    const snapName = await getDocs(qName);
    if (!snapName.empty) {
      const data = snapName.docs[0].data() as FirestoreUserProfile;
      return {
        id: data.playerId,
        name: data.inGameName,
        avatar: data.avatar,
        accumulatedINR: data.balanceINR,
        status: 'online',
        addedAt: Date.now(),
      };
    }

    return null;
  } catch (error) {
    handleFirestoreError({
      action: 'list',
      collection: 'users',
      originalError: error,
    });
    return null;
  }
}

/**
 * Send real-time online friend request
 */
export async function sendOnlineFriendRequest(
  sender: UserAccount,
  targetPlayerId: string
): Promise<boolean> {
  try {
    await ensureOnlineAuth();
    const reqsCol = collection(db, 'friend_requests');
    await addDoc(reqsCol, cleanForFirestore({
      fromId: sender.id,
      fromName: sender.inGameName,
      fromAvatar: sender.avatar,
      toId: targetPlayerId.trim().toUpperCase(),
      status: 'pending',
      timestamp: Date.now(),
    }));
    return true;
  } catch (error) {
    handleFirestoreError({
      action: 'create',
      collection: 'friend_requests',
      originalError: error,
    });
    return false;
  }
}

/**
 * Listen for incoming friend requests addressed to my playerId
 */
export function subscribeIncomingFriendRequests(
  myPlayerId: string,
  onUpdate: (requests: any[]) => void
): Unsubscribe {
  try {
    const reqsCol = collection(db, 'friend_requests');
    const q = query(
      reqsCol,
      where('toId', '==', myPlayerId.trim().toUpperCase()),
      where('status', '==', 'pending')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const reqs: any[] = [];
        snapshot.forEach((d) => reqs.push({ id: d.id, ...d.data() }));
        onUpdate(reqs);
      },
      (error) => {
        handleFirestoreError({
          action: 'list',
          collection: 'friend_requests',
          originalError: error,
        });
      }
    );
  } catch (error) {
    handleFirestoreError({
      action: 'list',
      collection: 'friend_requests',
      originalError: error,
    });
    return () => {};
  }
}

/**
 * Send virtual INR donation to another player
 */
export async function sendFirestoreDonation(
  fromUserId: string,
  fromName: string,
  toPlayerId: string,
  amount: number,
  message?: string
): Promise<boolean> {
  try {
    await ensureOnlineAuth();
    const col = collection(db, 'donations');
    await addDoc(col, cleanForFirestore({
      fromUserId,
      fromName,
      toPlayerId: toPlayerId.trim().toUpperCase(),
      amount,
      message: message || '',
      timestamp: new Date().toISOString(),
    }));
    return true;
  } catch (error) {
    handleFirestoreError({
      action: 'create',
      collection: 'donations',
      originalError: error,
    });
    return false;
  }
}

/**
 * Real-time listener for incoming donations to this player's OwO ID
 */
export function subscribeIncomingDonations(
  myPlayerId: string,
  onDonationReceived: (donation: { id: string; fromName: string; amount: number; message?: string }) => void
): Unsubscribe {
  try {
    const col = collection(db, 'donations');
    const q = query(col, where('toPlayerId', '==', myPlayerId.trim().toUpperCase()), limit(5));

    let initialLoad = true;
    return onSnapshot(
      q,
      (snapshot) => {
        if (initialLoad) {
          initialLoad = false;
          return;
        }
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            onDonationReceived({
              id: change.doc.id,
              fromName: data.fromName || 'Generous Friend',
              amount: data.amount || 0,
              message: data.message,
            });
          }
        });
      },
      (error) => {
        handleFirestoreError({
          action: 'list',
          collection: 'donations',
          originalError: error,
        });
      }
    );
  } catch (error) {
    handleFirestoreError({
      action: 'list',
      collection: 'donations',
      originalError: error,
    });
    return () => {};
  }
}

// =========================================================================
// REAL-TIME ONLINE PRIVATE SERVERS
// =========================================================================

/**
 * Save an online private server in Firestore
 */
export async function saveOnlinePrivateServer(server: PrivateServer): Promise<void> {
  try {
    await ensureOnlineAuth();
    const serverRef = doc(db, 'private_servers', server.code.trim().toUpperCase());
    await setDoc(serverRef, cleanForFirestore({
      ...server,
      code: server.code.trim().toUpperCase(),
    }));
  } catch (error) {
    handleFirestoreError({
      action: 'create',
      collection: 'private_servers',
      docId: server.code,
      originalError: error,
    });
  }
}

/**
 * Fetch an online private server by secret passcode from Firestore
 */
export async function getOnlinePrivateServer(code: string): Promise<PrivateServer | null> {
  try {
    const clean = code.trim().toUpperCase();
    const serverRef = doc(db, 'private_servers', clean);
    const snap = await getDoc(serverRef);
    if (snap.exists()) {
      return snap.data() as PrivateServer;
    }
    return null;
  } catch (error) {
    handleFirestoreError({
      action: 'read',
      collection: 'private_servers',
      docId: code,
      originalError: error,
    });
    return null;
  }
}

/**
 * Subscribe to all online private servers in real time
 */
export function subscribeOnlinePrivateServers(
  onUpdate: (servers: PrivateServer[]) => void
): Unsubscribe {
  try {
    const col = collection(db, 'private_servers');
    return onSnapshot(
      col,
      (snapshot) => {
        const list: PrivateServer[] = [];
        snapshot.forEach((snap) => {
          list.push(snap.data() as PrivateServer);
        });
        onUpdate(list);
      },
      (error) => {
        handleFirestoreError({
          action: 'list',
          collection: 'private_servers',
          originalError: error,
        });
      }
    );
  } catch (error) {
    handleFirestoreError({
      action: 'list',
      collection: 'private_servers',
      originalError: error,
    });
    return () => {};
  }
}

/**
 * Send a real-time message inside a private server
 */
export async function sendServerChatMessage(
  serverCode: string,
  msg: Omit<ServerChatMessage, 'id' | 'timestamp'>
): Promise<boolean> {
  try {
    await ensureOnlineAuth();
    const clean = serverCode.trim().toUpperCase();
    const col = collection(db, 'private_servers', clean, 'messages');
    await addDoc(col, cleanForFirestore({
      ...msg,
      timestamp: Date.now(),
    }));
    return true;
  } catch (error) {
    handleFirestoreError({
      action: 'create',
      collection: `private_servers/${serverCode}/messages`,
      originalError: error,
    });
    return false;
  }
}

/**
 * Subscribe in real-time to messages inside a private server
 */
export function subscribeServerChatMessages(
  serverCode: string,
  onUpdate: (messages: ServerChatMessage[]) => void
): Unsubscribe {
  try {
    const clean = serverCode.trim().toUpperCase();
    const col = collection(db, 'private_servers', clean, 'messages');
    const q = query(col, orderBy('timestamp', 'asc'), limit(50));

    return onSnapshot(
      q,
      (snapshot) => {
        const list: ServerChatMessage[] = [];
        snapshot.forEach((snap) => {
          list.push({ id: snap.id, ...snap.data() } as ServerChatMessage);
        });
        onUpdate(list);
      },
      (error) => {
        handleFirestoreError({
          action: 'list',
          collection: `private_servers/${serverCode}/messages`,
          originalError: error,
        });
      }
    );
  } catch (error) {
    handleFirestoreError({
      action: 'list',
      collection: `private_servers/${serverCode}/messages`,
      originalError: error,
    });
    return () => {};
  }
}

// ==========================================
// --- DEV STUDIO SHARED PROJECT SYNC ---
// ==========================================

export const DEFAULT_DEV_PROJECT_ID = 'hitarth_main_project';

/**
 * Fetch or Initialize shared Dev Studio project from Firestore
 */
export async function fetchDevProject(
  projectId: string = DEFAULT_DEV_PROJECT_ID
): Promise<DevStudioProject | null> {
  try {
    const ref = doc(db, 'dev_projects', projectId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as DevStudioProject;
    }
    return null;
  } catch (error) {
    handleFirestoreError({
      action: 'read',
      collection: 'dev_projects',
      docId: projectId,
      originalError: error,
    });
    return null;
  }
}

/**
 * Save or Update Dev Studio project in Firestore
 * Atomically increments version and updates timestamp
 */
export async function saveDevProject(
  project: DevStudioProject,
  userUid: string
): Promise<void> {
  try {
    const ref = doc(db, 'dev_projects', project.id);
    const payload = {
      ...project,
      version: (project.version || 0) + 1,
      updatedAt: Date.now(),
    };
    await setDoc(ref, cleanForFirestore(payload), { merge: true });
  } catch (error) {
    handleFirestoreError({
      action: 'update',
      collection: 'dev_projects',
      docId: project.id,
      originalError: error,
    });
    throw error;
  }
}

/**
 * Real-time subscription to Dev Studio project
 */
export function subscribeDevProject(
  projectId: string = DEFAULT_DEV_PROJECT_ID,
  onUpdate: (project: DevStudioProject | null) => void
): Unsubscribe {
  try {
    const ref = doc(db, 'dev_projects', projectId);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          onUpdate(snap.data() as DevStudioProject);
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        handleFirestoreError({
          action: 'read',
          collection: 'dev_projects',
          docId: projectId,
          originalError: error,
        });
      }
    );
  } catch (error) {
    handleFirestoreError({
      action: 'read',
      collection: 'dev_projects',
      docId: projectId,
      originalError: error,
    });
    return () => {};
  }
}

/**
 * Update project execution status (e.g. pause / resume / stop)
 * Automatically halts execution across all connected devices in real time
 */
export async function updateDevProjectStatus(
  projectId: string,
  status: DevProjectExecutionStatus,
  userUid?: string
): Promise<void> {
  try {
    const ref = doc(db, 'dev_projects', projectId);
    await updateDoc(ref, cleanForFirestore({
      executionStatus: status,
      updatedAt: Date.now(),
    }));
  } catch (error) {
    handleFirestoreError({
      action: 'update',
      collection: 'dev_projects',
      docId: projectId,
      originalError: error,
    });
    throw error;
  }
}

/**
 * Update project settings (limit, level, etc.)
 */
export async function updateDevProjectSettings(
  projectId: string,
  settings: DevProjectSettings,
  userUid?: string
): Promise<void> {
  try {
    const ref = doc(db, 'dev_projects', projectId);
    await updateDoc(ref, cleanForFirestore({
      settings,
      updatedAt: Date.now(),
    }));
  } catch (error) {
    handleFirestoreError({
      action: 'update',
      collection: 'dev_projects',
      docId: projectId,
      originalError: error,
    });
    throw error;
  }
}

// ==========================================
// --- CUSTOM GAME CODES REAL-TIME SYNC ---
// ==========================================

/**
 * Real-time subscription to all custom codes in Firestore
 */
export function subscribeCustomCodes(
  onUpdate: (codes: CustomGameCode[]) => void
): Unsubscribe {
  try {
    const col = collection(db, 'custom_codes');
    return onSnapshot(
      col,
      (snapshot) => {
        const list: CustomGameCode[] = [];
        snapshot.forEach((snap) => {
          list.push({ id: snap.id, ...snap.data() } as CustomGameCode);
        });
        onUpdate(list);
      },
      (error) => {
        handleFirestoreError({
          action: 'list',
          collection: 'custom_codes',
          originalError: error,
        });
      }
    );
  } catch (error) {
    handleFirestoreError({
      action: 'list',
      collection: 'custom_codes',
      originalError: error,
    });
    return () => {};
  }
}

/**
 * Fetch a single custom code from Firestore by text
 */
export async function fetchCustomCodeFromFirestore(
  cleanCodeText: string
): Promise<CustomGameCode | null> {
  try {
    const col = collection(db, 'custom_codes');
    const q = query(col, where('code', '==', cleanCodeText.toUpperCase()), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { id: docSnap.id, ...docSnap.data() } as CustomGameCode;
    }
    return null;
  } catch (error) {
    handleFirestoreError({
      action: 'read',
      collection: 'custom_codes',
      originalError: error,
    });
    return null;
  }
}

