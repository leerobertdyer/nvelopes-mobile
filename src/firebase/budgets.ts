import firestore from "@react-native-firebase/firestore";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { MONTHLY, BUDGET_DATA_DOC_ID } from "../constants";
import type { Interval, NvelopesTransaction } from "../types";

type User = FirebaseAuthTypes.User;

function budgetRef(budgetId: string) {
  return firestore().doc(`budgets/${budgetId}`);
}

export function budgetDataRef(budgetId: string) {
  return firestore().doc(`budgets/${budgetId}/data/${BUDGET_DATA_DOC_ID}`);
}

const BUDGET_INVITES_COLLECTION = "budgetInvites";

const defaultBudgetName = (user: User) =>
  user?.email ? `${user.email}'s Budget` : "My Budget";

/**
 * Creates the first budget for a user (first-time setup). Writes budget meta, data doc, and users/{uid}/budgets/{budgetId}.
 * Returns the new budgetId or null on failure.
 */
export async function createFirstBudget(
  user: User,
  name?: string,
): Promise<string | null> {
  if (!user) {
    console.error("createFirstBudget: No user provided");
    return null;
  }
  const budgetName = name ?? defaultBudgetName(user);
  try {
    const newBudgetRef = firestore().collection("budgets").doc();
    const budgetId = newBudgetRef.id;
    const dataRef = budgetDataRef(budgetId);
    const userBudgetRef = firestore().doc(
      `users/${user.uid}/budgets/${budgetId}`,
    );

    const budgetMeta = {
      name: budgetName,
      ownerId: user.uid,
      memberIds: [user.uid],
      memberEmails: { [user.uid]: (user.email ?? "").trim().toLowerCase() },
      createdAt: firestore.Timestamp.now(),
    };
    const initialData = {
      envelopes: [],
      payDate: null,
      payPeriodInterval: "MONTHLY",
      payments: [],
      totalSpendingBudget: 0,
      oneTimeCash: null,
      snowball: 0,
      snowballTargetPaymentId: null,
      isNewUser: true,
      backups: null,
    };
    const userBudgetDoc = { name: budgetName, budgetId };

    await newBudgetRef.set(budgetMeta);
    await dataRef.set(initialData);
    await userBudgetRef.set(userBudgetDoc);
    return budgetId;
  } catch (error) {
    console.error("createFirstBudget failed:", error);
    return null;
  }
}

/**
 * Create a new budget (from Settings). Requires payDate and payPeriodInterval so the budget is ready to use.
 * Same as createFirstBudget but isNewUser: false and accepts initial pay date/interval.
 */
export async function createBudget(
  user: User,
  name: string | undefined,
  payDate: Date,
  payPeriodInterval: Interval,
): Promise<string | null> {
  if (!user) return null;
  const budgetName = name?.trim() || defaultBudgetName(user);
  try {
    const newBudgetRef = firestore().collection("budgets").doc();
    const budgetId = newBudgetRef.id;
    const dataRef = budgetDataRef(budgetId);
    const userBudgetRef = firestore().doc(
      `users/${user.uid}/budgets/${budgetId}`,
    );
    const budgetMeta = {
      name: budgetName,
      ownerId: user.uid,
      memberIds: [user.uid],
      memberEmails: { [user.uid]: (user.email ?? "").trim().toLowerCase() },
      createdAt: firestore.Timestamp.now(),
    };
    const initialData = {
      envelopes: [],
      payDate: firestore.Timestamp.fromDate(payDate),
      payPeriodInterval: payPeriodInterval ?? MONTHLY,
      payments: [],
      totalSpendingBudget: 0,
      oneTimeCash: null,
      snowball: 0,
      snowballTargetPaymentId: null,
      isNewUser: false,
      backups: null,
    };
    const userBudgetDoc = { name: budgetName, budgetId };
    await newBudgetRef.set(budgetMeta);
    await dataRef.set(initialData);
    await userBudgetRef.set(userBudgetDoc);
    return budgetId;
  } catch (error) {
    console.error("createBudget failed:", error);
    return null;
  }
}

/** Get budget metadata (ownerId, memberIds, name, memberEmails). */
export async function getBudgetMeta(budgetId: string) {
  const snap = await budgetRef(budgetId).get();
  if (!snap.exists()) return null;
  const d = snap.data();
  if (!d) return;
  return {
    name: d.name ?? "Budget",
    ownerId: d.ownerId as string,
    memberIds: (d.memberIds as string[]) ?? [],
    memberEmails: (d.memberEmails as Record<string, string>) ?? undefined,
    createdAt: d.createdAt,
  };
}

/** Owner: delete budget, its data doc, and all users' budget refs. Member: leave (remove self from memberIds, delete own ref). */
export async function deleteBudgetAsOwner(
  ownerId: string,
  budgetId: string,
): Promise<boolean> {
  try {
    const meta = await getBudgetMeta(budgetId);
    console.log("[nvelope invite] meta:", meta, "ownerId:", ownerId);
    if (!meta || meta.ownerId !== ownerId) return false;
    const dataRef = budgetDataRef(budgetId);
    for (const uid of meta.memberIds) {
      const userBudgetRef = firestore().doc(`users/${uid}/budgets/${budgetId}`);
      await userBudgetRef.delete();
    }
    await dataRef.delete();
    await budgetRef(budgetId).delete();
    return true;
  } catch (error) {
    console.error("deleteBudgetAsOwner failed:", error);
    return false;
  }
}

/** Member leaves budget: remove self from memberIds, delete own users/{uid}/budgets/{budgetId}. */
export async function leaveBudget(
  userId: string,
  budgetId: string,
): Promise<boolean> {
  try {
    const meta = await getBudgetMeta(budgetId);
    if (!meta || meta.ownerId === userId) return false;
    await budgetRef(budgetId).update({
      memberIds: firestore.FieldValue.arrayRemove(userId),
    });
    const userBudgetRef = firestore().doc(
      `users/${userId}/budgets/${budgetId}`,
    );
    await userBudgetRef.delete();
    return true;
  } catch (error) {
    console.error("leaveBudget failed:", error);
    return false;
  }
}

/** Owner removes a member from the budget. */
export async function removeMemberFromBudget(
  ownerId: string,
  budgetId: string,
  memberId: string,
): Promise<boolean> {
  try {
    const meta = await getBudgetMeta(budgetId);
    if (!meta || meta.ownerId !== ownerId || memberId === ownerId) return false;
    await budgetRef(budgetId).update({
      memberIds: firestore.FieldValue.arrayRemove(memberId),
    });
    const userBudgetRef = firestore().doc(
      `users/${memberId}/budgets/${budgetId}`,
    );
    await userBudgetRef.delete();
    return true;
  } catch (error) {
    console.error("removeMemberFromBudget failed:", error);
    return false;
  }
}

/** Update budget name and sync to all members' user budget refs. Caller must be owner or member. */
export async function updateBudgetName(
  budgetId: string,
  _userId: string,
  newName: string,
): Promise<boolean> {
  const trimmed = newName.trim();
  if (!trimmed) return false;
  try {
    const meta = await getBudgetMeta(budgetId);
    if (!meta) return false;
    await budgetRef(budgetId).update({ name: trimmed });
    for (const uid of meta.memberIds) {
      const userBudgetRef = firestore().doc(`users/${uid}/budgets/${budgetId}`);
      await userBudgetRef.update({ name: trimmed });
    }
    return true;
  } catch (error) {
    console.error("updateBudgetName failed:", error);
    return false;
  }
}

/**
 * Create first budget with defaults so MainView can render (e.g. when user skips first-time setup).
 */
export async function completeDemoWithDefaults(user: User): Promise<boolean> {
  if (!user) return false;
  try {
    const now = new Date();
    const defaultPayDate = firestore.Timestamp.fromDate(
      new Date(now.getFullYear(), now.getMonth(), 1),
    );
    const budgetId = await createFirstBudget(user);
    if (!budgetId) return false;
    const dataRef = budgetDataRef(budgetId);
    await dataRef.update({ isNewUser: false, payDate: defaultPayDate });
    return true;
  } catch (error) {
    console.error("completeDemoWithDefaults failed:", error);
    return false;
  }
}

export async function getTransactions(
  budgetId: string,
): Promise<NvelopesTransaction[]> {
  try {
    const snapshot = await firestore()
      .collection(`budgets/${budgetId}/transactions`)
      .orderBy("createdAt", "desc")
      .get();
    return snapshot.docs.map((doc) => doc.data() as NvelopesTransaction);
  } catch (error) {
    console.error("getTransaction error: ", error);
  }
  return [];
}
