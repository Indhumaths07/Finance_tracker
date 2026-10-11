import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  collection, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Customer } from './types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Must use firestoreDatabaseId from firebaseConfig
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection as required
export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or internet connection.");
    }
  }
}
testConnection();

/**
 * 1-Click Google Sign In (Works smoothly on both Mobile and Laptop)
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    console.error('Google Sign-In Error:', err);
    throw err;
  }
}

/**
 * Sign out
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Real-time listener for customers under /users/{userId}/customers
 * Automatically synchronizes changes across Laptop, Phone, and all tabs!
 */
export function subscribeToCustomers(
  userId: string,
  onUpdate: (customers: Customer[]) => void,
  onError?: (err: any) => void
): () => void {
  const colPath = `users/${userId}/customers`;
  const colRef = collection(db, 'users', userId, 'customers');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const customersList: Customer[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        customersList.push({
          id: data.id || docSnap.id,
          name: data.name || '',
          phone: data.phone || '',
          village: data.village || '',
          address: data.address || '',
          principalAmount: Number(data.principalAmount) || 0,
          totalPayableAmount: data.totalPayableAmount ? Number(data.totalPayableAmount) : undefined,
          initialBalance: data.initialBalance ? Number(data.initialBalance) : undefined,
          weeklyDueAmount: data.weeklyDueAmount ? Number(data.weeklyDueAmount) : undefined,
          tenureWeeks: data.tenureWeeks ? Number(data.tenureWeeks) : undefined,
          startDate: data.startDate || '',
          loanType: data.loanType || 'weekly',
          interestRate: Number(data.interestRate) || 0,
          interestUnit: data.interestUnit || 'percent_per_month',
          transactions: Array.isArray(data.transactions) ? data.transactions : [],
          status: data.status || 'active',
          notes: data.notes || '',
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });

      // Sort by creation or start date descending
      customersList.sort((a, b) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime());
      onUpdate(customersList);
    },
    (error) => {
      console.error('Firestore onSnapshot error:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, colPath);
    }
  );
}

/**
 * Save / Update a customer in Cloud Firestore under /users/{userId}/customers/{customerId}
 * Ensures data is permanently preserved in Cloud and visible on both PC and mobile!
 */
export async function saveCustomerToCloud(userId: string, customer: Customer): Promise<void> {
  const docPath = `users/${userId}/customers/${customer.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'customers', customer.id);
    const payload = {
      ...customer,
      ownerId: userId,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

/**
 * Delete a customer from Cloud Firestore
 */
export async function deleteCustomerFromCloud(userId: string, customerId: string): Promise<void> {
  const docPath = `users/${userId}/customers/${customerId}`;
  try {
    const docRef = doc(db, 'users', userId, 'customers', customerId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Sync local customers to Cloud Firestore (e.g. on first login or restore)
 * Automatically uploads any existing offline / local data into Cloud!
 */
export async function syncAllCustomersToCloud(userId: string, customers: Customer[]): Promise<void> {
  if (!customers || customers.length === 0) return;
  const batch = writeBatch(db);
  const colPath = `users/${userId}/customers`;

  try {
    for (const customer of customers) {
      const docRef = doc(db, 'users', userId, 'customers', customer.id);
      batch.set(docRef, {
        ...customer,
        ownerId: userId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, colPath);
  }
}
