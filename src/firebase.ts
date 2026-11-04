import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize default Firebase App (with optional Auth for Google sign-in)
const app = getApps().find((a) => a.name === '[DEFAULT]') || initializeApp(firebaseConfig);

// Initialize Firebase Auth on the default app
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Clear any stale anonymous sessions so STS is not queried
if (typeof window !== 'undefined') {
  try {
    if (auth.currentUser?.isAnonymous) {
      auth.signOut().catch(() => {});
    }
  } catch {
    // ignore
  }
}

// Initialize Firestore targeting the specific provisioned named database on the default app (with Auth attached)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Structured error handling interface
export interface FirestoreErrorInfo {
  action: 'create' | 'read' | 'update' | 'delete' | 'list';
  collection: string;
  docId?: string;
  originalError: unknown;
}

/**
 * Standardized Firestore error logger conforming to Firestore integration specs
 */
export function handleFirestoreError(info: FirestoreErrorInfo): void {
  const errMsg = info.originalError instanceof Error ? info.originalError.message : String(info.originalError);
  console.error(`[Firestore Error] Failed to ${info.action} in collection "${info.collection}"${info.docId ? ` (doc: ${info.docId})` : ''}:`, errMsg);
}

/**
 * Recursively removes all `undefined` values from an object or array before writing to Firestore.
 * This completely prevents Firestore error: "Unsupported field value: undefined (found in field ...)"
 */
export function cleanForFirestore<T extends Record<string, any>>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) =>
        item !== null && typeof item === 'object' ? cleanForFirestore(item) : item
      ) as any;
  }
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object') {
        result[key] = cleanForFirestore(value);
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}
