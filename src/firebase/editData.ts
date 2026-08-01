import type { Payment, Nvelope, Interval, NvelopesTransaction } from "../types";
import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { budgetDataRef } from "./budgets";
import { cleanPaymentsForFirebase } from "../util/util";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Timestamp = FirebaseFirestoreTypes.Timestamp;
type User = FirebaseAuthTypes.User;

export async function addTransaction(t: NvelopesTransaction, budgetId: string) {
  try {
    await firestore()
      .collection(`budgets/${budgetId}/transactions`)
      .doc(t.id)
      .set(t);
  } catch (error) {
    console.error("Error adding transaction: ", error);
  }
}

export async function editDatabaseWithTransaction<T>({
  t,
  budgetId,
  func,
}: {
  t: NvelopesTransaction;
  budgetId: string;
  func: () => Promise<T>;
}): Promise<T> {
  await addTransaction(t, budgetId);
  return await func();
}

export async function createUserProfile(user: {
  uid: string;
  email: string | null;
}) {
  try {
    const userRef = firestore().collection("users").doc(user.uid);

    // Use set with merge: true so it won't overwrite existing fields if they run this twice
    await userRef.set(
      {
        email: user.email?.toLowerCase() ?? "",
        updatedAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return true;
  } catch (e) {
    console.error("Failed to create user profile document:", e);
    return false;
  }
}

export async function updateBudgetStateAndDBB(
  amount: number,
  budgetId: string,
  totalSpendingBudget: number,
  setTotalSpendingBudget: (totalSpendingBudget: number) => void,
) {
  const newBudget = totalSpendingBudget + amount;
  await editTotalSpendingBudget(newBudget, budgetId);
  setTotalSpendingBudget(newBudget);
}

export async function resetAllNvelopes(
  nvelopes: Nvelope[],
  setEnvelopes: (e: Nvelope[]) => void,
  budgetId: string,
) {
  const updatedNvelopes = [...nvelopes].map((n) => {
    return { ...n, spent: 0, total: 0, paid: false };
  });
  await editEnvelopes(updatedNvelopes, budgetId);
  setEnvelopes(updatedNvelopes);
}

export async function editEnvelopes(envelopes: Nvelope[], budgetId: string) {
  const toFixedEnvelopes = envelopes.map((e: Nvelope) => ({
    ...e,
    total: Number(e.total.toFixed(2)),
  }));
  try {
    await budgetDataRef(budgetId).update({ envelopes: toFixedEnvelopes });
  } catch (error) {
    console.error("Firebase, editEnvelopes Failed", error);
  }
}

export async function editPayments(p: Payment[], budgetId: string) {
  const sortedPayments = [...p].sort(
    (a, b) => a.dueDate!.seconds! - b.dueDate!.seconds!,
  );
  const cleanedPayments = cleanPaymentsForFirebase(sortedPayments);
  try {
    await budgetDataRef(budgetId).update({ payments: cleanedPayments });
  } catch (error) {
    console.error("Firebase, editPayments Failed", error);
  }
}

export async function editPayPeriodInterval(i: Interval, budgetId: string) {
  try {
    await budgetDataRef(budgetId).update({ payPeriodInterval: i });
  } catch (error) {
    console.error("Firebase, editInterval Failed", error);
  }
}

export async function editIsNewUser(isNewUser: boolean, budgetId: string) {
  try {
    await budgetDataRef(budgetId).update({ isNewUser });
  } catch (error) {
    console.error("Firebase, editIsNewUser Failed", error);
  }
}

export async function editPayDate(payDate: Date, budgetId: string) {
  const date = firestore.Timestamp.fromDate(payDate);
  try {
    await budgetDataRef(budgetId).update({ payDate: date });
  } catch (error) {
    console.error("Firebase, editPayDate Failed", error);
  }
}

export async function editTotalSpendingBudget(
  newTotal: number,
  budgetId: string,
) {
  try {
    await budgetDataRef(budgetId).update({ totalSpendingBudget: newTotal });
  } catch (error) {
    console.error("Firebase, editTotalSpendingBudget Failed", error);
  }
}

/**
 * FUTURE FEATURE: Analytics & Period Tracking
 *
 * TODO: Consider using the newly added transactions for this
 *
 * The previous snapshot-based approach (previousIntervalDetails, resetBudget,
 * isResetToday, storePreviousIntervalDetails) was removed as it had limited value.
 *
 * For meaningful analytics ("last month you spent X on groceries"), consider:
 *
 * 1. Event-based tracking: Log each spend/income event with timestamp,
 *    category, amount, envelope
 * 2. Aggregation queries: Sum events by time period and category
 * 3. Separate analytics collection: /userAnalytics/{userId}/events/{eventId}
 *
 * This would enable pie charts, spending trends, and period comparisons.
 */

export async function editSnowballTargetPaymentId(
  budgetId: string,
  paymentId: string | null,
) {
  await budgetDataRef(budgetId).update({ snowballTargetPaymentId: paymentId });
}

const TEN_MINUTES_MS = 10 * 60 * 1000; // 10 minutes in milliseconds
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
const MAX_BACKUPS = 30;

/**
 * SAFE BACKUP SYSTEM - Stores backups in a SEPARATE collection from user data
 * This prevents backups from being lost if the user document gets corrupted/overwritten
 *
 * Structure: /userBackups/{userId}/backups/{backupId}
 *
 * Backup strategy:
 * - If < 30 backups exist: backup frequently (every 10 min) to quickly build up safety net
 * - If >= 30 backups exist: only backup if > 4 hours since last backup
 *   This ensures we maintain at least 5 days of backup history (30 × 4 hours = 120 hours)
 */
/** Backups for a budget: filter by budgetId or missing (migrated). */
function backupsForBudget(
  docs: { id: string; data: () => Record<string, unknown> }[],
  budgetId: string,
) {
  return docs.filter((d) => {
    const data = d.data();
    const bid = data.budgetId;
    return bid === budgetId || bid === undefined;
  });
}

export async function shouldBackupUserDataSafe(user: User, budgetId: string) {
  if (!user) return false;
  try {
    const now = firestore.Timestamp.fromDate(new Date());
    const backupsCollectionRef = firestore().collection(
      `userBackups/${user.uid}/backups`,
    );
    const snapshot = await backupsCollectionRef
      .orderBy("backupTimeStamp", "desc")
      .get();
    const forBudget = backupsForBudget(snapshot.docs, budgetId);
    const backupCount = forBudget.length;
    if (backupCount === 0) return true;
    const mostRecent = forBudget[0].data();
    const backupTimeStamp = mostRecent.backupTimeStamp as Timestamp;
    const timeSinceLastBackup = now.toMillis() - backupTimeStamp.toMillis();
    if (backupCount < MAX_BACKUPS) return timeSinceLastBackup > TEN_MINUTES_MS;
    return timeSinceLastBackup > FOUR_HOURS_MS;
  } catch (error) {
    console.error("Error in shouldBackupUserDataSafe:", error);
    return false;
  }
}

/**
 * Creates a backup in userBackups/{userId}/backups with budgetId. Reads from budget data doc.
 */
export async function backupUserDataSafe(user: User, budgetId: string) {
  if (!user) return;
  try {
    const dataRef = budgetDataRef(budgetId);
    const docSnap = await dataRef.get();
    if (!docSnap.exists) return;
    const data = docSnap.data();
    if (!data) return;
    const hasEnvelopes =
      Array.isArray(data.envelopes) && data.envelopes.length > 0;
    const hasPayments =
      Array.isArray(data.payments) && data.payments.length > 0;
    if (!hasEnvelopes && !hasPayments) return;
    const newTime = firestore.Timestamp.fromDate(new Date());
    const backupData = {
      backupTimeStamp: newTime,
      budgetId,
      nvelopes: data.envelopes ?? [],
      payments: data.payments ?? [],
      cash: data.oneTimeCash ?? [],
      payDate: data.payDate ?? null,
      payPeriodInterval: data.payPeriodInterval ?? "MONTHLY",
      shouldReset: data.shouldReset ?? false,
      snowball: data.snowball ?? 0,
      snowballTargetPaymentId: data.snowballTargetPaymentId ?? null,
      totalSpendingBudget: data.totalSpendingBudget ?? 0,
    };
    const backupsCollectionRef = firestore().collection(
      `userBackups/${user.uid}/backups`,
    );
    await backupsCollectionRef.add(backupData);
    await pruneOldBackups(user.uid, 30);
  } catch (error) {
    console.error("Error in backupUserDataSafe:", error);
  }
}

/** Get safe backups for the given budget (includes migrated backups with no budgetId). */
export async function getSafeBackups(user: User, budgetId: string) {
  if (!user) return [];
  try {
    const backupsCollectionRef = firestore().collection(
      `userBackups/${user.uid}/backups`,
    );
    const snapshot = await backupsCollectionRef
      .orderBy("backupTimeStamp", "desc")
      .get();
    const forBudget = backupsForBudget(snapshot.docs, budgetId);
    return forBudget.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error getting safe backups:", error);
    return [];
  }
}

export async function restoreFromSafeBackup(
  backupId: string,
  user: User,
  budgetId: string,
) {
  if (!user || !backupId) return null;
  try {
    const dataRef = budgetDataRef(budgetId);
    const currentDataSnap = await dataRef.get();
    const currentData = currentDataSnap.data();
    if (!currentData) return;
    saveToAsyncStorageBackup({
      envelopes: currentData.envelopes ?? [],
      payments: currentData.payments ?? [],
      totalSpendingBudget: currentData.totalSpendingBudget ?? 0,
      payDate: currentData.payDate ?? null,
      payPeriodInterval: currentData.payPeriodInterval ?? "MONTHLY",
    });
    const backupDocRef = firestore().doc(
      `userBackups/${user.uid}/backups/${backupId}`,
    );
    const backupSnap = await backupDocRef.get();
    if (!backupSnap.exists) return null;
    const b = backupSnap.data();
    if (!b) return;
    await editTotalSpendingBudget(Number(b.totalSpendingBudget), budgetId);
    await editEnvelopes(b.nvelopes ?? [], budgetId);
    await editPayments(b.payments ?? [], budgetId);
    return b;
  } catch (error) {
    console.error("Error restoring from safe backup:", error);
    return null;
  }
}

/**
 * Prune old backups, keeping only the most recent N
 */
async function pruneOldBackups(userId: string, keepCount: number) {
  try {
    const backupsCollectionRef = firestore().collection(
      `userBackups/${userId}/backups`,
    );

    const snapshot = await backupsCollectionRef
      .orderBy("backupTimeStamp", "desc")
      .get();

    if (snapshot.size <= keepCount) return;

    // Delete backups beyond keepCount
    const docsToDelete = snapshot.docs.slice(keepCount);
    for (const docToDelete of docsToDelete) {
      await firestore()
        .doc(`userBackups/${userId}/backups/${docToDelete.id}`)
        .delete();
    }
  } catch (error) {
    console.error("Error pruning old backups:", error);
  }
}

/**
 * Async STORAGE BACKUP SYSTEM
 *
 * Saves the current user data to localStorage before a restore operation.
 * This provides an "undo last restore" feature without consuming Firestore backups.
 * Only the most recent pre-restore state is kept (auto-overwrites).
 */
const ASYNCSTORAGE_BACKUP_KEY = "nvelope_pre_restore_backup";

export interface AsyncStorageBackup {
  data: {
    envelopes: Nvelope[];
    payments: Payment[];
    totalSpendingBudget: number;
    payDate: unknown;
    payPeriodInterval: string;
  };
  timestamp: string;
  reason: string;
}

/**
 * Save current user data to localStorage before restore
 */
export async function saveToAsyncStorageBackup(userData: {
  envelopes: Nvelope[];
  payments: Payment[];
  totalSpendingBudget: number;
  payDate: unknown;
  payPeriodInterval: string;
}): Promise<void> {
  try {
    const backup: AsyncStorageBackup = {
      data: userData,
      timestamp: new Date().toISOString(),
      reason: "pre-restore-backup",
    };
    // Overwrite any existing backup (only keep most recent)
    await AsyncStorage.setItem(ASYNCSTORAGE_BACKUP_KEY, JSON.stringify(backup));
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
}

/**
 * Get the async storage backup if it exists
 */
export async function getAsyncStorageBackup(): Promise<AsyncStorageBackup | null> {
  try {
    const stored = await AsyncStorage.getItem(ASYNCSTORAGE_BACKUP_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as AsyncStorageBackup;
  } catch (error) {
    console.error("Error reading localStorage backup:", error);
    return null;
  }
}

/**
 * Clear the localStorage backup after successful undo
 */
export async function clearAsyncStorageBackup(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ASYNCSTORAGE_BACKUP_KEY);
    console.log("🗑️ Cleared localStorage backup");
  } catch (error) {
    console.error("Error clearing localStorage backup:", error);
  }
}

/**
 * Convert a plain object with seconds/nanoseconds to a Firestore Timestamp.
 * This is needed because JSON serialization loses the Timestamp class.
 */
function toTimestamp(obj: unknown): Timestamp | null {
  if (!obj) return null;
  if (obj instanceof firestore.Timestamp) return obj;
  if (typeof obj === "object" && obj !== null && "seconds" in obj) {
    const tsObj = obj as { seconds: number; nanoseconds?: number };
    return new firestore.Timestamp(tsObj.seconds, tsObj.nanoseconds ?? 0);
  }
  return null;
}

/**
 * Restore from backup (undo last restore) into the given budget.
 */
export async function restoreFromAsyncStorageBackup(
  user: User,
  budgetId: string,
): Promise<boolean> {
  if (!user) return false;
  const backup = await getAsyncStorageBackup();
  if (!backup) return false;
  try {
    const { data } = backup;
    const restoredPayments = (data.payments ?? []).map(
      (p: Payment & { dueDate?: unknown; paidDates?: unknown[] }) => ({
        ...p,
        dueDate: toTimestamp(p.dueDate) ?? firestore.Timestamp.now(),
        paidDates:
          (p.paidDates ?? [])
            .map((pd) => toTimestamp(pd))
            .filter((t): t is Timestamp => t !== null) ?? [],
      }),
    );
    await editTotalSpendingBudget(Number(data.totalSpendingBudget), budgetId);
    await editEnvelopes(data.envelopes ?? [], budgetId);
    await editPayments(restoredPayments, budgetId);
    clearAsyncStorageBackup();
    return true;
  } catch (error) {
    console.error("Error restoring from localStorage backup:", error);
    return false;
  }
}
