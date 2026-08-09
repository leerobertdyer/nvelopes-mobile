import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";

export type DeleteAccountResult =
  | { success: true }
  | { success: false; error: string }
  | { success: false; error: string; needPassword: true };

type ReauthResult =
  | { success: true }
  | { success: false; error: string }
  | { success: false; needPassword: true; error: string };

async function reauthenticateUser(password?: string): Promise<ReauthResult> {
  const user = auth().currentUser;
  if (!user) return { success: false, error: "Not signed in" };

  const hasGoogle = user.providerData.some((p) => p.providerId === "google.com");
  const hasApple = user.providerData.some((p) => p.providerId === "apple.com");
  const hasPassword = user.providerData.some((p) => p.providerId === "password");

  if (hasGoogle) {
    try {
      await GoogleSignin.hasPlayServices();
      const { data } = await GoogleSignin.signIn();
      const idToken = data?.idToken;
      if (!idToken) return { success: false, error: "Google sign-in failed" };
      const credential = auth.GoogleAuthProvider.credential(idToken);
      await user.reauthenticateWithCredential(credential);
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Sign-in was cancelled or failed";
      return { success: false, error: message };
    }
  }

  if (hasApple) {
    if (Platform.OS !== "ios") {
      return {
        success: false,
        error: "Re-authenticate with Apple on your iOS device to delete this account",
      };
    }
    try {
      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!appleCredential.identityToken) {
        return { success: false, error: "Apple sign-in failed" };
      }
      const credential = auth.AppleAuthProvider.credential(
        appleCredential.identityToken,
      );
      await user.reauthenticateWithCredential(credential);
      return { success: true };
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === "ERR_REQUEST_CANCELED") {
        return { success: false, error: "Sign-in was cancelled" };
      }
      const message = e instanceof Error ? e.message : "Sign-in was cancelled or failed";
      return { success: false, error: message };
    }
  }

  if (hasPassword) {
    if (!password?.trim()) {
      return { success: false, needPassword: true, error: "Password required" };
    }
    if (!user.email) {
      return { success: false, error: "No email on account" };
    }
    try {
      const credential = auth.EmailAuthProvider.credential(user.email, password.trim());
      await user.reauthenticateWithCredential(credential);
      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Wrong password or sign-in failed";
      return { success: false, error: message };
    }
  }

  return { success: false, error: "Unsupported sign-in method" };
}

export async function deleteAccount(options?: { password?: string }): Promise<DeleteAccountResult> {
  const user = auth().currentUser;
  if (!user) return { success: false, error: "Not signed in" };
  const uid = user.uid;

  const reauth = await reauthenticateUser(options?.password);
  if (!reauth.success) {
    if ("needPassword" in reauth && reauth.needPassword) {
      return { success: false, error: reauth.error, needPassword: true };
    }
    return { success: false, error: reauth.error };
  }

  try {
    const backupsRef = firestore().collection(`userBackups/${uid}/backups`);
    const snapshot = await backupsRef.get();
    for (const d of snapshot.docs) {
      await d.ref.delete();
    }
    await firestore().doc(`users/${uid}`).delete();
    await user.delete();
    return { success: true };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to delete account";
    return { success: false, error: String(message) };
  }
}