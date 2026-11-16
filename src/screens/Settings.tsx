import { useEffect, useState } from "react";

import CreateLoginWithEmail from "../components/Forms/CreateLoginWithEmail";
import { useAuth } from "../context/AuthContext/useAuth";
import { ViewContent } from "../types";
import { sendPasswordResetEmailToUser } from "../firebase/emailAndPassword";
import { deleteAccount } from "../firebase/deleteAccount";
import { Pressable, ScrollView, View, Linking } from "react-native";
import Btn from "../components/Buttons/Btn";
import Input from "../components/Input";
import { MyText } from "../components/MyText";
import { FirebaseAuthTypes } from "@react-native-firebase/auth";
import signout from "../firebase/signOut";
import Toast from "react-native-toast-message";
import { navigationRef } from "../../App";

type User = FirebaseAuthTypes.User;

export default function Settings() {
  const { user } = useAuth();
  const [providerType, setProviderType] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [content, setContent] = useState<ViewContent>("ACCOUNT");

  // Delete account
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] =
    useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletePasswordStep, setDeletePasswordStep] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const currentProviderTypes = ["google.com"];

  // User login type check
  useEffect(() => {
    if (user) {
      // Check what providers are linked to this user
      user.providerData.forEach((profile) => {
        setProviderType(profile.providerId);
      });
      // Check if password exists already
      user.providerData.some((provider) => {
        setHasPassword(provider.providerId === "password");
      });
    }
  }, [user]);

  function handleAddPassword() {
    setHasPassword(true);
  }

  async function handleDeleteAccount(password?: string) {
    if (isDeletingAccount) return;
    setIsDeletingAccount(true);
    try {
      const result = await deleteAccount(password ? { password } : undefined);
      if (result.success) {
        setShowDeleteAccountConfirm(false);
        setDeletePasswordStep(false);
        setDeletePassword("");
        if (navigationRef.isReady()) {
          navigationRef.reset({ index: 0, routes: [{ name: "Home" }] });
        }
        return;
      }
      if ("needPassword" in result && result.needPassword) {
        setDeletePasswordStep(true);
        return;
      }
      Toast.show({ type: "error", text1: result.error });

      // If they were on the password step (wrong password, etc.), keep modal open so they can try again or cancel.
      if (!password) {
        setShowDeleteAccountConfirm(false);
        setDeletePasswordStep(false);
        setDeletePassword("");
      }
    } finally {
      setIsDeletingAccount(false);
    }
  }

  async function resetPasswordForEmail(email: string) {
    if (!email?.trim()) {
      Toast.show({ type: "error", text1: "No email address" });
      return;
    }
    try {
      await sendPasswordResetEmailToUser(email.trim());
      Toast.show({
        type: "success",
        text1: "Password reset email sent. Check your inbox.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to send reset email";
      Toast.show({ type: "error", text1: message });
    }
  }

  function handleLogOut() {
    signout();
    navigationRef.navigate("Home" as never);
  }

  function LogoutButton({
    user,
    onPress,
  }: {
    user: User;
    onPress: () => void;
  }) {
    return (
      <View className="w-full items-center justify-center gap-2">
        <MyText>You are logged in as </MyText>
        <MyText className="text-my-blue-dark">{user?.email}</MyText>
        <Btn text="Log Out" color="red" onPress={onPress} />
      </View>
    );
  }

  function DeleteAccountButton() {
    {
      /* Delete Account — only path to account deletion: this block opens the confirm modal; confirmation is the only trigger for handleDeleteAccount. */
    }
    return (
      <Pressable
        className="justify-center h-fit w-[80%] m-auto items-center p-4 bg-my-black-dark rounded-xl border-2 border-my-red-dark my-8"
        onPress={() => {
          setShowDeleteAccountConfirm(true);
          setDeletePasswordStep(false);
          setDeletePassword("");
        }}
      >
        <MyText className="text-sm font-bold text-my-white-dark">
          Delete Account
        </MyText>
        <MyText className="text-xs text-my-white-light mt-1">
          Permanently delete your account and all data
        </MyText>
      </Pressable>
    );
  }

  if (showDeleteAccountConfirm)
    return (
      <View className="bg-my-black-dark h-full p-8 ">
        <View className="w-full justify-center items-center mt-4">
          {!deletePasswordStep ? (
            <View className="items-center justify-center w-full">
              <MyText className="text-xl text-my-red-light font-bold mb-4">
                Are you sure?
              </MyText>
              <MyText className="text-my-white-light mb-2 text-center">
                This will permanently delete your account and all your data
                (nvelopes, payments, backups).
              </MyText>
              <MyText className="text-my-red-light text-xl">
                This cannot be undone.
              </MyText>
              <MyText className="text-my-white-light text-sm mt-4 text-center">
                To confirm, you may see a Google sign-in window or be asked for
                your password, depending on how you signed up.
              </MyText>
            </View>
          ) : (
            <View className="items-center justify-center w-full">
              <MyText className="text-xl text-my-red-light font-bold mb-4">
                Enter your password
              </MyText>
              <MyText className="text-my-white-light mb-2">
                Confirm your identity to delete your account.
              </MyText>
              <Input
                id="deletePassword"
                label="Password"
                placeholder="Enter your password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e)}
              />
            </View>
          )}
          {isDeletingAccount && (
            <MyText className="text-my-white-dark text-sm mt-4">
              Deleting…
            </MyText>
          )}
        </View>
        <View className="mt-[2rem] gap-4">
          <Btn
            color="red"
            text="Delete account"
            disabled={
              isDeletingAccount ||
              (deletePasswordStep && !deletePassword.trim())
            }
            onPress={() =>
              handleDeleteAccount(
                deletePasswordStep ? deletePassword : undefined,
              )
            }
          />
          <Btn
            color="green"
            text="Cancel"
            onPress={() => {
              if (!isDeletingAccount) {
                setShowDeleteAccountConfirm(false);
                setDeletePasswordStep(false);
                setDeletePassword("");
              }
            }}
          />
        </View>
      </View>
    );

  return (
    <ScrollView className="w-full">
      <View className="items-center justify-start py-4  bg-my-white-base mt-[3rem] ">
        <LogoutButton user={user!} onPress={handleLogOut} />
        {user && (
          <View className="w-full mt-4 h-fit">
            {/* If the user doesn't yet have a password and has signed in with one of current provider */}
            {currentProviderTypes.includes(providerType) && !hasPassword && (
              <CreateLoginWithEmail onDone={() => handleAddPassword()} />
            )}

            {/* Once account is created simply display email has password */}
            {hasPassword && (
              <Btn
                color="red"
                text="Reset Password"
                onPress={() => resetPasswordForEmail(user?.email ?? "")}
              />
            )}
            <DeleteAccountButton />
            <Pressable
              className="mt-6 items-center py-2"
              onPress={() =>
                Linking.openURL("https://www.nvelopes.app/privacy")
              }
            >
              <MyText className="text-my-blue-dark underline text-sm">
                Privacy Policy
              </MyText>
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
