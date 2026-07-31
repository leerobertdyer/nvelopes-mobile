import { useEffect, useState } from "react";
import Header from "../components/Nav/Header";
import EditSpendingBudget from "../components/Forms/EditSpendingBudget";
import BudgetSettingsFields, {
  BudgetMeta,
} from "../components/Forms/BudgetSettingsFields";
import CreateLoginWithEmail from "../components/Forms/CreateLoginWithEmail";
import { format } from "date-fns";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import PageTour from "../components/PageTour";
import { useAuth } from "../context/AuthContext/useAuth";
import { useBudget } from "../context/BudgetContext/useBudget";
import { useDatabase } from "../context/DatabaseContext/useDatabase";
import { BackupData, Interval, ViewContent } from "../types";
import {
  AsyncStorageBackup,
  editIsNewUser,
  editPayDate,
  editPayPeriodInterval,
  getAsyncStorageBackup,
  getSafeBackups,
  restoreFromAsyncStorageBackup,
  restoreFromSafeBackup,
} from "../firebase/editData";
import {
  createBudget,
  deleteBudgetAsOwner,
  getBudgetMeta,
  leaveBudget,
  removeMemberFromBudget,
} from "../firebase/budgets";
import { DateData } from "react-native-calendars";
import { sendPasswordResetEmailToUser } from "../firebase/emailAndPassword";
import { deleteAccount } from "../firebase/deleteAccount";
import firestore from "@react-native-firebase/firestore";
import { Modal, Pressable, ScrollView, View } from "react-native";
import Btn from "../components/Buttons/Btn";
import Input from "../components/Input";
import { MyText } from "../components/MyText";
import { Picker } from "@react-native-picker/picker";
import { FirebaseAuthTypes } from "@react-native-firebase/auth";
import signout from "../firebase/signOut";
import Toast from "react-native-toast-message";
import { navigationRef, RootStackParamList } from "../../App";
import { useRoute, RouteProp } from "@react-navigation/native";
import { inviteUserToBudget } from "../firebase/invites";
import Loading from "../components/Loading";
import { auth } from "../firebase/firebase";
import ContentSelector from "../components/ContentSelector";

type SettingsRouteProp = RouteProp<RootStackParamList, "Settings">;

type User = FirebaseAuthTypes.User;
const { Timestamp } = firestore;

const SERVER_URL =
  process.env.EXPO_PUBLIC_SERVER_URL ?? "https://api.leedyer.com/";

export default function Settings() {
  const { user } = useAuth();
  const { activeBudgetId, budgets, setActiveBudgetId, refetchBudgets } =
    useBudget();
  const {
    payPeriodInterval,
    setTotalSpendingBudget,
    totalSpendingBudget,
    payDate,
    setPayDate,
    setPayments,
    setEnvelopes,
    isNewUser,
    setIsNewUser,
  } = useDatabase();

  useState<string>("");
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [providerType, setProviderType] = useState("");
  const [hasPassword, setHasPassword] = useState(false);
  const [showShareBudgetModal, setShowShareBudgetModal] = useState(false);
  const [content, setContent] = useState<ViewContent>("ACCOUNT");

  // Safe backups (stored in separate collection - survives user doc corruption)
  const [safeBackups, setSafeBackups] = useState<
    Array<BackupData & { id: string }>
  >([]);
  const [selectedSafeBackup, setSelectedSafeBackup] = useState<
    (BackupData & { id: string }) | null
  >(null);
  const [isLoadingSafeBackups, setIsLoadingSafeBackups] = useState(false);
  const [sharing, setSharing] = useState(false);

  // LocalStorage backup (for undo last restore)
  const [asyncStorageBackup, setAsyncStorageBackup] =
    useState<AsyncStorageBackup | null>(null);
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);

  // Delete account
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] =
    useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletePasswordStep, setDeletePasswordStep] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  const [newBudgetName, setNewBudgetName] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [isLoadingBudgetMeta, setIsLoadingBudgetMeta] = useState(false);
  const [showDeleteBudgetConfirm, setShowDeleteBudgetConfirm] = useState(false);
  const [showLeaveBudgetConfirm, setShowLeaveBudgetConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [isCreatingBudget, setIsCreatingBudget] = useState(false);
  const [isDeletingBudget, setIsDeletingBudget] = useState(false);
  const [isLeavingBudget, setIsLeavingBudget] = useState(false);
  const [newBudgetPayDate, setNewBudgetPayDate] = useState<Date | null>(null);
  const [newBudgetInterval, setNewBudgetInterval] = useState<Interval | null>(
    null,
  );
  const [showCreateBudgetModal, setShowCreateBudgetModal] = useState(false);
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);
  const [showBudgetSelector, setShowBudgetSelector] = useState(false);
  const [budgetMeta, setBudgetMeta] = useState<BudgetMeta | null>(null);

  const currentProviderTypes = ["google.com"];
  const isOwner = user && budgetMeta && budgetMeta.ownerId === user.uid;
  const isMember =
    user && budgetMeta && budgetMeta.memberIds.includes(user.uid) && !isOwner;

  // For missing payDate - auto open edit menu
  const route = useRoute<SettingsRouteProp>();

  useEffect(() => {
    if (route.params?.showEditMenu) {
      setShowEditBudgetModal(true);
    }
  }, [route.params]);

  // Load safe backups for active budget and check for localStorage backup
  useEffect(() => {
    if (!user || !activeBudgetId) return;
    const budgetId = activeBudgetId;
    async function loadBackups() {
      setIsLoadingSafeBackups(true);
      const backups = await getSafeBackups(user!, budgetId);
      setSafeBackups(backups as Array<BackupData & { id: string }>);
      setIsLoadingSafeBackups(false);
      const lsBackup = await getAsyncStorageBackup();
      setAsyncStorageBackup(lsBackup);
    }
    loadBackups();
  }, [user, activeBudgetId]);

  // Fresh fetch of available budgets when Settings is shown so "Select A Budget" dropdown is current (e.g. after being removed from a shared budget)
  useEffect(() => {
    refetchBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load budget meta for active budget (for share/delete/members)
  useEffect(() => {
    if (!activeBudgetId) {
      setBudgetMeta(null);
      return;
    }
    let cancelled = false;
    setIsLoadingBudgetMeta(true);
    getBudgetMeta(activeBudgetId).then((meta) => {
      if (!cancelled && meta)
        setBudgetMeta({
          name: meta.name,
          ownerId: meta.ownerId,
          memberIds: meta.memberIds,
          memberEmails: meta.memberEmails,
        });
      else if (!cancelled) setBudgetMeta(null);
      setIsLoadingBudgetMeta(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeBudgetId]);

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

  function resetState() {
    setIsEditingCash(false);
  }

  async function handleIntervalChange(interval: Interval) {
    await editPayPeriodInterval(interval, activeBudgetId!);
    setInterval(totalSpendingBudget.toString());
  }

  async function handlePayDateChange(d: DateData) {
    const dateString = d.dateString;
    const [year, month, day] = dateString.split("-").map(Number);
    const localDate = new Date(year, month - 1, day);

    try {
      setPayDate(Timestamp.fromDate(localDate));
      if (!activeBudgetId) return;
      await editPayDate(localDate, activeBudgetId);
      Toast.show({ type: "success", text1: "Pay date updated" });
    } catch (e) {
      console.error("Error updating pay date", e);
      Toast.show({ type: "error", text1: "Failed to update pay date" });
    }
  }

  function handleAddPassword() {
    setHasPassword(true);
  }

  function handleSelectBackup(backupId: string) {
    const backup = safeBackups.find((b) => b.id === backupId);
    if (backup) {
      setSelectedSafeBackup(backup);
    }
  }

  function handleCloseBackup() {
    setSelectedSafeBackup(null);
  }

  async function handleRestoreBackup() {
    if (!user || !selectedSafeBackup) return;
    if (!activeBudgetId) return;
    const result = await restoreFromSafeBackup(
      selectedSafeBackup.id,
      user,
      activeBudgetId,
    );
    if (result) {
      setPayments(result.payments ?? []);
      setEnvelopes(result.nvelopes ?? []);
      setTotalSpendingBudget(Number(result.totalSpendingBudget));
      handleCloseBackup();
      // After restore, update localStorage backup state (now available for undo)
      const lsBackup = await getAsyncStorageBackup();
      setAsyncStorageBackup(lsBackup);
      Toast.show({ type: "success", text1: "Backup restored successfully" });
    } else {
      Toast.show({ type: "error", text1: "Failed to restore backup" });
    }
  }

  async function handleUndoRestore() {
    if (!user || !asyncStorageBackup || !activeBudgetId) return;
    const success = await restoreFromAsyncStorageBackup(user, activeBudgetId);
    if (success) {
      // Update local state with restored values
      const { data } = asyncStorageBackup;
      setPayments(data.payments ?? []);
      setEnvelopes(data.envelopes ?? []);
      setTotalSpendingBudget(Number(data.totalSpendingBudget));
      // Clear the localStorage backup state
      setAsyncStorageBackup(null);
      setShowUndoConfirm(false);
      Toast.show({ type: "success", text1: "Restore undone successfully" });
    } else {
      Toast.show({ type: "error", text1: "Failed to undo restore" });
    }
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
        window.location.href = "/";
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

  function handleCalendarChange(d: DateData) {
    const newDate = new Date(d.year, d.month - 1, d.day);
    setNewBudgetPayDate(newDate);
  }

  async function handleCreateBudget(): Promise<boolean> {
    if (!user || !newBudgetPayDate || !newBudgetInterval) return false;
    const name = newBudgetName.trim() || `${user.email}'s Budget`;
    setIsCreatingBudget(true);
    try {
      const budgetId = await createBudget(
        user,
        name,
        newBudgetPayDate,
        newBudgetInterval,
      );
      if (budgetId) {
        setNewBudgetName("");
        setNewBudgetPayDate(null);
        setNewBudgetInterval(null);
        await refetchBudgets();
        setActiveBudgetId(budgetId);
        Toast.show({ type: "success", text1: `Budget "${name}" created` });
        return true;
      } else {
        Toast.show({ type: "error", text1: "Failed to create budget" });
        return false;
      }
    } finally {
      setIsCreatingBudget(false);
    }
  }

  async function handleInvite() {
    if (!user || !activeBudgetId || !shareEmail.trim()) {
      Toast.show({
        type: "error",
        text1: "Please enter a valid email address",
      });
      return;
    }
    setSharing(true);
    const toEmail = shareEmail.trim();
    const budgetName =
      budgets.find((b) => b.id === activeBudgetId)?.name ?? "Budget";
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        Toast.show({
          type: "error",
          text1: "Failed to send invite: No Current User",
        });
        return;
      }

      if (!currentUser.email) {
        Toast.show({
          type: "error",
          text1: `No email for ${user.uid}`,
        });
        return;
      }

      const ok = await inviteUserToBudget({
        activeBudgetId,
        budgetName,
        toEmail,
        user: currentUser,
      });
      if (ok) {
        setShareEmail("");
        Toast.show({
          type: "success",
          text1: `Invite sent to ${toEmail}. They'll receive an email with a link to open or sign up for Nvelopes.`,
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Failed to send invite: Api Error",
        });
      }
    } catch (e) {
      console.error("Error sending invite: ", e);
    } finally {
      setShowShareBudgetModal(false);
      setSharing(false);
    }
  }

  async function handleDeleteBudgetConfirm() {
    if (!user || !activeBudgetId) return;
    setIsDeletingBudget(true);
    try {
      const ok = await deleteBudgetAsOwner(user.uid, activeBudgetId);
      setShowDeleteBudgetConfirm(false);
      if (ok) {
        await refetchBudgets();
        const next = budgets.find((b) => b.id !== activeBudgetId)?.id ?? null;
        setActiveBudgetId(next);
        Toast.show({ type: "success", text1: "Budget deleted" });
      } else {
        Toast.show({ type: "error", text1: "Failed to delete budget" });
      }
    } finally {
      setIsDeletingBudget(false);
    }
  }

  async function handleLeaveBudgetConfirm() {
    if (!user || !activeBudgetId) return;
    setIsLeavingBudget(true);
    try {
      const ok = await leaveBudget(user.uid, activeBudgetId);
      setShowLeaveBudgetConfirm(false);
      if (ok) {
        await refetchBudgets();
        const next = budgets.find((b) => b.id !== activeBudgetId)?.id ?? null;
        setActiveBudgetId(next);
        Toast.show({ type: "success", text1: "You left the budget" });
      } else {
        Toast.show({ type: "error", text1: "Failed to leave budget" });
      }
    } finally {
      setIsLeavingBudget(false);
    }
  }

  async function handleRemoveMemberConfirm() {
    if (!user || !activeBudgetId || !memberToRemove) return;
    try {
      const ok = await removeMemberFromBudget(
        user.uid,
        activeBudgetId,
        memberToRemove,
      );
      setMemberToRemove(null);
      if (ok) {
        const meta = await getBudgetMeta(activeBudgetId);
        if (meta)
          setBudgetMeta({
            name: meta.name,
            ownerId: meta.ownerId,
            memberIds: meta.memberIds,
            memberEmails: meta.memberEmails,
          });
        Toast.show({ type: "success", text1: "Member removed" });
      } else {
        Toast.show({ type: "error", text1: "Failed to remove member" });
      }
    } catch {
      Toast.show({ type: "error", text1: "Failed to remove member" });
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

  function BackupSelectionScreen() {
    return (
      <View className="justify-between items-center w-[80%] p-4 bg-my-black-base rounded-md border-2 border-my-white-dark my-4">
        <MyText className="text-sm font-bold text-my-white-light">
          ⚠️ Revert To A Backup
        </MyText>
        <MyText className="text-xs text-my-white-base">
          Restores payments and envelopes
        </MyText>
        <View className="w-full">
          {isLoadingSafeBackups ? (
            <MyText className="text-xs py-2">Loading backups...</MyText>
          ) : safeBackups.length === 0 ? (
            <MyText className="text-xs py-2 text-gray-400 text-center">
              No backups yet
            </MyText>
          ) : (
            <Picker
              style={{
                width: "100%",
                backgroundColor: "#fff2d9",
                borderRadius: 9,
              }}
              onValueChange={(e) => handleSelectBackup(e as string)}
            >
              <Picker.Item
                value=""
                enabled={false}
                label="--Select A Backup--"
              />
              {safeBackups.map((b) => (
                <Picker.Item
                  key={b.id}
                  value={b.id}
                  label={format(
                    b.backupTimeStamp.toDate(),
                    "MMMM dd, yyyy hh:mm",
                  )}
                />
              ))}
            </Picker>
          )}
        </View>
      </View>
    );
  }

  function BackupSelectionConfirmScreen() {
    if (!selectedSafeBackup) return null;
    return (
      <Modal>
        <View className="bg-my-black-dark">
          <View className="w-full text-center">
            <MyText className="text-xl text-my-red-light">Are you sure?</MyText>
            <MyText>You can undo this restore if needed.</MyText>
            <MyText>
              Your budget will reset to {selectedSafeBackup.totalSpendingBudget}
            </MyText>
            <MyText>
              You will have {selectedSafeBackup.payments?.length ?? 0} payments
              totaling $
              {(selectedSafeBackup.payments ?? [])
                .reduce((acc, p) => p.amount + acc, 0)
                .toFixed(2)}
            </MyText>
            <MyText>
              You will have {selectedSafeBackup.nvelopes?.length ?? 0} envelopes
              totaling $
              {(selectedSafeBackup.nvelopes ?? [])
                .reduce((acc, p) => p.total + acc, 0)
                .toFixed(2)}
            </MyText>
          </View>
          <Btn color="gold" text="Save" onPress={handleRestoreBackup} />
          <Btn color="red" text="Back" onPress={handleCloseBackup} />
        </View>
      </Modal>
    );
  }

  function UndoLastRestoreScreen() {
    if (!asyncStorageBackup) return null;
    return (
      <Pressable
        className="justify-around w-[80%] max-w-[20rem] h-fit items-center p-2 bg-my-blue-dark rounded-md border-2 border-my-white-dark text-my-white-light my-4 gap-2"
        onPress={() => setShowUndoConfirm(true)}
      >
        <MyText className="text-sm font-bold">Undo Last Restore</MyText>
        <MyText className="text-xs">
          Saved: {new Date(asyncStorageBackup.timestamp).toLocaleString()}
        </MyText>
        <MyText className="text-xs">
          {asyncStorageBackup.data.envelopes?.length ?? 0} envelopes,{" "}
          {asyncStorageBackup.data.payments?.length ?? 0} payments
        </MyText>
        <Btn color="red" text="Undo" onPress={() => setShowUndoConfirm(true)} />
      </Pressable>
    );
  }

  if (sharing) return <Loading text="Sharing..." />;

  if (isEditingCash) {
    return <EditSpendingBudget handleBack={resetState} />;
  }

  if (showCreateBudgetModal)
    return (
      <ScrollView className="py-[2rem] gap-2">
        <View className="items-center gap-4 w-full text-center">
          <Input
            id="new-budget-name"
            label="New budget name"
            placeholder="e.g. Household"
            value={newBudgetName}
            onChange={(e) => setNewBudgetName(e)}
          />
          <BudgetSettingsFields
            budgetMeta={budgetMeta}
            setBudgetMeta={setBudgetMeta}
            mode="create"
            intervalValue={newBudgetInterval}
            onIntervalChange={(d) => setNewBudgetInterval(d)}
            payDate={newBudgetPayDate}
            onPayDateChange={handleCalendarChange}
            intervalLabel="Pay period interval"
          />
        </View>
        <View className="gap-2 py-4">
          <Btn
            text="Save"
            color="gold"
            onPress={async () => {
              const ok = await handleCreateBudget();
              if (ok) setShowCreateBudgetModal(false);
            }}
            disabled={
              isCreatingBudget || !newBudgetPayDate || !newBudgetInterval
            }
          />
          <Btn
            text="Back"
            color="red"
            onPress={() => setShowCreateBudgetModal(false)}
          />
        </View>
      </ScrollView>
    );

  if (showEditBudgetModal)
    return (
      <Modal>
        <View className="justify-center gap-4 w-full h-full bg-my-black-base">
          <View className="w-full h-fit m-auto bg-my-blue-dark p-4">
            <BudgetSettingsFields
              budgetMeta={budgetMeta}
              setBudgetMeta={setBudgetMeta}
              mode="edit"
              intervalValue={payPeriodInterval}
              onIntervalChange={handleIntervalChange}
              payDate={payDate?.toDate() ?? null}
              onPayDateChange={handlePayDateChange}
              onEditRemainingBalance={() => {
                setShowEditBudgetModal(false);
                setIsEditingCash(true);
              }}
            />
            <View className="gap-2">
              <Btn
                text="Back"
                color="red"
                onPress={() => setShowEditBudgetModal(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    );

  if (showDeleteAccountConfirm)
    return (
      <View className="bg-my-black-dark h-full p-8 ">
        <View className="w-full text-center mt-4">
          {!deletePasswordStep ? (
            <View className="items-center justify-center w-full">
              <MyText className="text-xl text-my-red-light font-bold mb-4">
                Are you sure?
              </MyText>
              <MyText className="text-my-white-light mb-2 text-center">
                This will permanently delete your account and all your data
                (envelopes, payments, backups).
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
      <PageTour
        visible={isNewUser}
        onDismiss={async () => {
          if (activeBudgetId) {
            await editIsNewUser(false, activeBudgetId);
            setIsNewUser(false);
          }
        }}
      >
        <MyText className="text-my-white-light">
          Set pay date and budget interval here when you want to adjust. You can
          also manage budgets, backups, and account options.
        </MyText>
      </PageTour>
      <Header links={["Home", "Debt"]} />

      <MyText className="text-3xl font-bold mb-4 text-center pt-8">
        Settings
      </MyText>
      <ContentSelector content={content} setContent={setContent} />
      {content === "BUDGET" && (
        <View className="w-full items-center gap-2 mt-4 py-[1rem]">
          {activeBudgetId && !isLoadingBudgetMeta && budgetMeta && (
            <>
              <View className="w-full gap-2 items-center">
                <MyText className="text-my-black-light text-xs text-center">
                  Budget name
                </MyText>
                <MyText className="text-my-black-dark font-medium">
                  {budgetMeta.name}
                </MyText>
                {isOwner &&
                  budgetMeta.memberIds.filter((id) => id !== budgetMeta.ownerId)
                    .length > 0 && (
                    <View className="w-full max-w-[20rem] gap-1 bg-my-white-dark/30 rounded-md mb-2">
                      <View className="bg-my-black-base rounded-t-md gap-2 py-2">
                        <MyText className="text-xs text-center text-my-white-light">
                          Members
                        </MyText>
                      </View>
                      <View className="p-4">
                        {budgetMeta.memberIds
                          .filter((id) => id !== budgetMeta.ownerId)
                          .map((mid) => (
                            <Pressable
                              key={mid}
                              className="flex flex-row items-center justify-center gap-2 py-1 text-my-white-dark text-sm"
                              onPress={() => {
                                console.log("WTH: ", mid);
                                setMemberToRemove(mid);
                              }}
                            >
                              <MyText className="text-my-black-dark w-fit">
                                {budgetMeta.memberEmails?.[mid] ??
                                  mid.slice(0, 8) + "…"}
                              </MyText>
                              <FontAwesome
                                name="trash"
                                size={18}
                                color="#ad0241"
                              />
                            </Pressable>
                          ))}
                      </View>
                    </View>
                  )}

                {isOwner ? (
                  <Btn
                    text="Edit Budget"
                    color="red"
                    onPress={() => {
                      setShowEditBudgetModal(true);
                    }}
                  />
                ) : (
                  <MyText className="text-my-black-dark font-medium">
                    {budgetMeta.name}
                  </MyText>
                )}
              </View>
            </>
          )}

          <View className="w-full gap-4">
            {budgets.length > 1 && showBudgetSelector ? (
              <Modal>
                <View className="w-full h-full bg-my-black-base">
                  <View className="w-full m-auto gap-8">
                    <MyText className="text-xs text-center text-my-black-dark">
                      Select A Budget
                    </MyText>
                    <Picker
                      style={{
                        width: "100%",
                        backgroundColor: "#fff2d9",
                        borderRadius: 9,
                      }}
                      id="budget-switcher"
                      selectedValue={activeBudgetId ?? ""}
                      onValueChange={(e) => {
                        setActiveBudgetId(e || null);
                        setShowBudgetSelector(false);
                      }}
                    >
                      {budgets.map((b) => (
                        <Picker.Item key={b.id} value={b.id} label={b.name} />
                      ))}
                    </Picker>
                    <Btn
                      color="red"
                      text="Back"
                      onPress={() => setShowBudgetSelector(false)}
                    />
                  </View>
                </View>
              </Modal>
            ) : (
              budgets.length > 1 && (
                <Btn
                  color="gold"
                  text="Show Other Budgets"
                  onPress={() => setShowBudgetSelector(true)}
                />
              )
            )}
            <View className="mt-2">
              <Btn
                text="Create new budget"
                color="green"
                onPress={() => setShowCreateBudgetModal(true)}
              />
            </View>
            {activeBudgetId && !isLoadingBudgetMeta && budgetMeta && (
              <>
                {isOwner && (
                  <Btn
                    text="Share budget"
                    color="green"
                    onPress={() => setShowShareBudgetModal(true)}
                  />
                )}
                {isOwner && showShareBudgetModal && (
                  <Modal>
                    <View className="h-full w-full justify-center bg-my-black-base">
                      <View className="bg-my-white-base h-fit w-full p-8 gap-4">
                        <View className="w-full gap-2 items-center justify-center">
                          <Input
                            id="Email to share with"
                            label="Share budget by email"
                            placeholder="email@example.com"
                            value={shareEmail}
                            onChange={(e) => setShareEmail(e)}
                          />
                        </View>
                        <Btn color="gold" text="Share" onPress={handleInvite} />
                        <Btn
                          color="red"
                          text="Cancel"
                          onPress={() => setShowShareBudgetModal(false)}
                        />
                      </View>
                    </View>
                  </Modal>
                )}
                {isOwner && (
                  <Btn
                    text="Delete this budget"
                    color="red"
                    onPress={() => setShowDeleteBudgetConfirm(true)}
                  />
                )}
                {isMember && (
                  <Btn
                    text="Leave this budget"
                    color="red"
                    onPress={() => setShowLeaveBudgetConfirm(true)}
                  />
                )}
              </>
            )}
          </View>
        </View>
      )}
      <View className="items-center justify-start py-4  bg-my-white-base mt-[3rem] ">
        {content === "ACCOUNT" && <LogoutButton user={user!} onPress={handleLogOut} />}

        {content === "BUDGET" && (
          <>
            <BackupSelectionScreen />
            <BackupSelectionConfirmScreen />
            <UndoLastRestoreScreen />

            {showUndoConfirm && asyncStorageBackup && (
              <View className="bg-my-black-dark">
                <View className="w-full text-center">
                  <MyText className="text-xl text-my-blue-light">
                    Undo Last Restore?
                  </MyText>
                  <MyText className="mb-4">
                    This will restore your data to the state before the last
                    restore.
                  </MyText>
                  <MyText>
                    Your budget will reset to{" "}
                    {asyncStorageBackup.data.totalSpendingBudget}
                  </MyText>
                  <MyText>
                    You will have{" "}
                    {asyncStorageBackup.data.payments?.length ?? 0} payments
                  </MyText>
                  <MyText>
                    You will have{" "}
                    {asyncStorageBackup.data.envelopes?.length ?? 0} envelopes
                  </MyText>
                </View>
                <Btn color="gold" text="Confirm" onPress={handleUndoRestore} />
                <Btn
                  color="red"
                  text="Cancel"
                  onPress={() => setShowUndoConfirm(false)}
                />
              </View>
            )}

            {showDeleteBudgetConfirm && (
              <Modal>
                <View className="bg-my-black-dark w-full h-screen">
                  <View className="items-center gap-4 w-full h-fit m-auto">
                    <View className="items-center w-full">
                      <MyText className="text-xl text-my-red-light mb-2">
                        Delete this budget?
                      </MyText>
                      <MyText className="text-my-white-light w-[80%] text-center">
                        All data (envelopes, payments) will be permanently
                        deleted. All members will lose access.
                        <MyText className="text-my-red-light underline">
                          {" "}
                          This cannot be undone.
                        </MyText>
                      </MyText>
                      {isDeletingBudget && (
                        <MyText className="text-my-white-dark text-sm mt-4">
                          Deleting…
                        </MyText>
                      )}
                    </View>
                    <Btn
                      color="red"
                      text="Delete Budget"
                      disabled={isDeletingBudget}
                      onPress={handleDeleteBudgetConfirm}
                    />
                    <Btn
                      color="gold"
                      text="Cancel"
                      onPress={() => setShowDeleteBudgetConfirm(false)}
                    />
                  </View>
                </View>
              </Modal>
            )}

            {showLeaveBudgetConfirm && (
              <View className="bg-my-black-dark">
                <View className="text-center">
                  <MyText className="text-xl text-my-red-light mb-2">
                    Leave this budget?
                  </MyText>
                  <MyText className="text-my-white-light">
                    You will no longer see or edit this budget. Your data
                    elsewhere is unaffected.
                  </MyText>
                  {isLeavingBudget && (
                    <MyText className="text-my-white-dark text-sm mt-4">
                      Leaving…
                    </MyText>
                  )}
                </View>
                <Btn
                  color="red"
                  text="Leave Budget"
                  disabled={isLeavingBudget}
                  onPress={handleLeaveBudgetConfirm}
                />
                <Btn
                  color="red"
                  text="Cancel"
                  onPress={() => setShowLeaveBudgetConfirm(false)}
                />
              </View>
            )}

            {memberToRemove && (
              <Modal>
                <View className="bg-my-black-dark h-full justify-center items-center">
                  <View className="bg-my-blue-dark h-fit w-full justify-center items-center py-8 gap-4">
                    <View className="text-center w-full">
                      <MyText className="text-xl text-my-white-dark mb-2 bg-my-red-dark w-full text-center">
                        Remove this member?
                      </MyText>
                      <MyText className="text-my-white-light text-center">
                        They will lose access to this budget.
                      </MyText>
                    </View>
                    <Btn
                      color="gold"
                      text="Remove member"
                      disabled={isLeavingBudget}
                      onPress={handleRemoveMemberConfirm}
                    />
                    <Btn
                      color="red"
                      text="Cancel"
                      onPress={() => setMemberToRemove(null)}
                    />
                  </View>
                </View>
              </Modal>
            )}
          </>
        )}

        {user && content === "ACCOUNT" && (
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
          </View>
        )}
      </View>
    </ScrollView>
  );
}
