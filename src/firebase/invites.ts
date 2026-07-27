import firestore from "@react-native-firebase/firestore";
import { Invite } from "../types";
import { FirebaseAuthTypes } from "@react-native-firebase/auth";
type User = FirebaseAuthTypes.User;

const SERVER_URL =
  process.env.EXPO_PUBLIC_SERVER_URL || "https://api.leedyer.com";

export async function getInviteToken(token: string): Promise<Invite | null> {
  const snap = await firestore().collection("invites").doc(token).get();

  if (!snap.exists) return null; // note: property, not a function, in namespaced API

  const d = snap.data()!;
  return {
    budgetId: d.budgetId,
    budgetName: d.budgetName,
    invitedByUid: d.invitedByUid,
    invitedByName: d.invitedByName,
    invitedEmail: d.invitedEmail,
    status: d.status,
    expiresAt: d.expiresAt,
    consumedByUid: d.consumedByUid,
    consumedAt: d.consumedAt,
    createdAt: d.createdAt,
  };
}

export async function acceptToken(
  token: string,
  user: User,
): Promise<{ success: boolean; error?: string; budgetId?: string }> {
  const freshToken = await user.getIdToken(true);

  try {
    const resp = await fetch(`${SERVER_URL}/invite/nvelopes/${token}/accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${freshToken}`,
      },
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.log("REQUEST FAILED:", resp.status, text);
      return { success: false, error: text };
    }
    const { budgetId } = await resp.json();

    return { success: resp.status === 200, budgetId };
  } catch (error) {
    console.error("Error reaching api.leedyer.com: ", error);
    return { success: false, error: error as string };
  }
}

interface IinviteUserToBudget {
  activeBudgetId: string;
  budgetName: string;
  toEmail: string;
  user: User;
}

export async function inviteUserToBudget({
  activeBudgetId,
  budgetName,
  toEmail,
  user,
}: IinviteUserToBudget): Promise<string | undefined> {
  if (!activeBudgetId || !toEmail || !user) return;
  const freshToken = await user.getIdToken(true);
  const response = await fetch(`${SERVER_URL}/invite/nvelopes/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${freshToken}`,
    },
    body: JSON.stringify({
      budgetId: activeBudgetId,
      budgetName,
      invitedByUid: user.uid,
      invitedEmail: user.email
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    console.log("REQUEST FAILED:", response.status, text);
    return;
  }

  const data = await response.json();
  return data.token;
}
