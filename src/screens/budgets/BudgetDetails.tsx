import { Modal, Pressable, View } from "react-native";
import { BackupData, BudgetMeta } from "../../types";
import { MyText } from "../../components/MyText";
import { useAuth } from "../../context/AuthContext/useAuth";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Btn from "../../components/Buttons/Btn";
import Input from "../../components/Input";
import { useBudget } from "../../context/BudgetContext/useBudget";
import Toast from "react-native-toast-message";
import { useEffect, useState } from "react";
import {
  AsyncStorageBackup,
  editPayDate,
  editPayPeriodInterval,
  getAsyncStorageBackup,
  getSafeBackups,
  restoreFromSafeBackup,
} from "../../firebase/editData";
import Loading from "../../components/Loading";
import { auth } from "../../firebase/firebase";
import { inviteUserToBudget } from "../../firebase/invites";
import { useDatabase } from "../../context/DatabaseContext/useDatabase";
import { Picker } from "@react-native-picker/picker";
import UndoRestoreLastBackup from "./UndoRestoreLastBackupModal";
import LeaveBudgetModal from "./LeaveBudgetModal";
import { format } from "date-fns";
import MyIcon from "../../components/MyIcon";
import firestore from "@react-native-firebase/firestore";
import BudgetSettingsFields from "../../components/Forms/BudgetSettingsFields";
import Spacer from "../../components/Spacer";
import { getBudgetMeta } from "../../firebase/budgets";

const { Timestamp } = firestore;

interface IBudgetDetails {
  setShowDeleteBudgetConfirm: (b: boolean) => void;
}

export default function BudgetDetails({ setShowDeleteBudgetConfirm }: IBudgetDetails) {
  const { user } = useAuth();
  const { activeBudgetId, budgets, refetchBudgets } = useBudget();
  const { setPayments, setEnvelopes, setTotalSpendingBudget, payDate, payPeriodInterval, setPayDate, setPayPeriodInterval } =
    useDatabase();

  // Budget Sharing
  const [sharing, setSharing] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [showShareBudgetModal, setShowShareBudgetModal] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState("");
  const [showLeaveBudgetConfirm, setShowLeaveBudgetConfirm] = useState(false);
  const [isLeavingBudget, setIsLeavingBudget] = useState(false);
  const [selectedSafeBackup, setSelectedSafeBackup] = useState<(BackupData & { id: string }) | null>(null);

  // Backups
  const [showUndoConfirm, setShowUndoConfirm] = useState(false);
  const [isLoadingSafeBackups, setIsLoadingSafeBackups] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);

  // asyncStorageBackup for undo last restore
  const [asyncStorageBackup, setAsyncStorageBackup] = useState<AsyncStorageBackup | null>(null);
  const [safeBackups, setSafeBackups] = useState<Array<BackupData & { id: string }>>([]);

  // Show Budget Inputs
  const [showEditBudget, setShowEditBudget] = useState(false);

  // Budget State
  const [newBudgetName, setNewBudgetName] = useState();
  const [newBudgetInterval, setNewBudgetInterval] = useState(payPeriodInterval);
  const [newBudgetPayDate, setNewBudgetPayDate] = useState(payDate);
  const [budget, setBudget] = useState<BudgetMeta>();

  async function refreshBudget() {
    if (!activeBudgetId) return;
    const newBudget = await getBudgetMeta(activeBudgetId);
    if (newBudget) {
      setBudget(newBudget);
      setNewBudgetName(newBudget!.name);
    }
  }

  useEffect(() => {
    refreshBudget();
  }, [activeBudgetId]);

  // Load safe backups for active budget and check for localStorage backup
  useEffect(() => {
    if (!user || !activeBudgetId) return;
    async function loadBackups() {
      setIsLoadingSafeBackups(true);
      const backups = await getSafeBackups(user!, activeBudgetId!);
      setSafeBackups(backups as Array<BackupData & { id: string }>);
      setIsLoadingSafeBackups(false);
      const lsBackup = await getAsyncStorageBackup();
      setAsyncStorageBackup(lsBackup);
    }
    loadBackups();
  }, [user, activeBudgetId]);

  const isOwner = user && budget && budget!.ownerId === user.uid;
  const isMember = user && budget && budget!.memberIds.includes(user.uid) && !isOwner;

  if (!budget) return;

  function handleSelectBackup(backupId: string) {
    console.log("Start:", backupId);
    const backup = safeBackups.find((b) => b.id === backupId);
    console.log("backeup found? ", backup);
    if (backup) {
      setSelectedSafeBackup(backup);
    } else Toast.show({ type: "error", text1: "No Backup Found" });
  }

  function handleCloseBackup() {
    setSelectedSafeBackup(null);
  }

  async function handleRestoreBackup() {
    if (!user || !selectedSafeBackup) return;
    if (!activeBudgetId) return;
    const result = await restoreFromSafeBackup(selectedSafeBackup.id, user, activeBudgetId);
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

  async function handleInvite() {
    if (!user || !activeBudgetId || !shareEmail.trim()) return;
    setSharing(true);
    const toEmail = shareEmail.trim();
    const budgetName = budgets.find((b) => b.id === activeBudgetId)?.name ?? "Budget";
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

  function reset() {
    setPayPeriodInterval(payPeriodInterval);
    setPayDate(payDate);
    setNewBudgetName(newBudgetName);
    setShowEditBudget(false);
  }

  async function handleSave() {
    if (!activeBudgetId || !user) return;
    if (newBudgetInterval !== payPeriodInterval) await editPayPeriodInterval(newBudgetInterval, activeBudgetId);
    if (newBudgetPayDate && newBudgetPayDate !== payDate) await editPayDate(newBudgetPayDate?.toDate(), activeBudgetId);
    await refetchBudgets();
    await refreshBudget();
    reset();
  }

  if (sharing) return <Loading text="Sharing..." />;

  if (showLeaveBudgetConfirm)
    return (
      <LeaveBudgetModal
        isLeavingBudget={isLeavingBudget}
        setIsLeavingBudget={setIsLeavingBudget}
        setShowLeaveBudgetConfirm={setShowDeleteBudgetConfirm}
      />
    );

  if (showUndoConfirm && asyncStorageBackup)
    return (
      <UndoRestoreLastBackup
        setShowUndoConfirm={setShowUndoConfirm}
        asyncStorageBackup={asyncStorageBackup}
        setAsyncStorageBackup={setAsyncStorageBackup}
      />
    );

  function BudgetSettingsHeader() {
    return (
      <Pressable
        className={`w-full flex-row justify-center items-center gap-2 ${showEditBudget && "mb-4"}`}
        onPress={showEditBudget ? () => setShowEditBudget(false) : () => setShowEditBudget(true)}
      >
        <MyText className="text-2xl text-center">{showEditBudget ? `Edit ${budget!.name}` : "Budget Settings"}</MyText>
        <MyIcon type={showEditBudget ? "X" : "EDIT"} size={20} strokeWidth={showEditBudget ? 8 : 2} />
      </Pressable>
    );
  }

  function BudgetCurrentState() {
    return (
      <View className="items-center w-[20rem] justify-between">
        <View className="flex-row justify-between w-[20rem] border-b-[2px]">
          <MyText className="text-my-black-light">Name:</MyText>
          <MyText className="text-my-black-dark" numberOfLines={1}>
            {budget!.name}
          </MyText>
        </View>
        <View className="flex-row justify-between w-[20rem] border-b-[2px]">
          <MyText className="text-my-black-light">Budget Period: </MyText>
          <MyText className="text-my-black-dark">{payPeriodInterval?.toLowerCase()}</MyText>
        </View>
        <View className="flex-row justify-between w-[20rem] border-b-[2px]">
          <MyText className="text-my-black-light">Paydate: </MyText>
          <MyText className="text-my-black-dark">{format(payDate!.toDate(), "E MM-dd-yy")}</MyText>
        </View>
      </View>
    );
  }

  function BudgetMemberDisplay() {
    return (
      <View className="w-full max-w-[20rem] gap-1 bg-my-white-dark/30 rounded-md mb-2">
        <View className="bg-my-black-base rounded-t-md gap-2 py-2">
          <MyText className="text-xs text-center text-my-white-light">Members</MyText>
        </View>
        <View className="p-4">
          {budget!.memberIds
            .filter((id) => id !== budget!.ownerId)
            .map((mid) => (
              <Pressable
                key={mid}
                className="flex flex-row items-center justify-center gap-2 py-1 text-my-white-dark text-sm"
                onPress={() => {
                  console.log("WTH: ", mid);
                  setMemberToRemove(mid);
                }}
              >
                <MyText className="text-my-black-dark w-fit">{budget!.memberEmails?.[mid] ?? mid.slice(0, 8) + "…"}</MyText>
                <FontAwesome name="trash" size={18} color="#ad0241" />
              </Pressable>
            ))}
        </View>
      </View>
    );
  }

  function ShareBudgetModal() {
    return (
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
            <Btn color="red" text="Cancel" onPress={() => setShowShareBudgetModal(false)} />
          </View>
        </View>
      </Modal>
    );
  }

  function UndoLastRestoreScreen() {
    if (!asyncStorageBackup) return null;
    return (
      <Pressable
        className="justify-around w-[80%] max-w-[20rem] h-fit items-center p-2  rounded-md border-2 border-my-white-dark text-my-white-light my-4 gap-2"
        onPress={() => setShowUndoConfirm(true)}
      >
        <MyText className="text-sm font-bold">Undo Last Restore</MyText>
        <MyText className="text-xs">Saved: {new Date(asyncStorageBackup.timestamp).toLocaleString()}</MyText>
        <MyText className="text-xs">
          {asyncStorageBackup.data.envelopes?.length ?? 0} nvelopes, {asyncStorageBackup.data.payments?.length ?? 0} payments
        </MyText>
        <Btn color="red" text="Undo" onPress={() => setShowUndoConfirm(true)} />
      </Pressable>
    );
  }

  function BackupSelectionScreen() {
    return (
      <View className="justify-between items-center w-full p-4 bg-my-black-base  gap-4">
        <MyText className="text-sm font-bold text-my-white-light">Revert To A Backup</MyText>
        <MyText className="text-xs text-my-white-base">Restores payments and nvelopes</MyText>
        <View className="w-full">
          {isLoadingSafeBackups ? (
            <MyText className="text-xs py-2">Loading backups...</MyText>
          ) : (
            <Picker
              style={{
                width: "100%",
                backgroundColor: "#fff2d9",
                borderRadius: 9,
              }}
              onValueChange={(e) => handleSelectBackup(e as string)}
            >
              <Picker.Item value="" enabled={false} label="--Select A Backup--" />
              {safeBackups.map((b) => (
                <Picker.Item key={b.id} value={b.id} label={format(b.backupTimeStamp.toDate(), "MMMM dd, yyyy hh:mm")} />
              ))}
            </Picker>
          )}
        </View>
        <Btn onPress={() => setShowBackupModal(false)} color="red" text="Close" />
      </View>
    );
  }

  function BackupSelectionConfirmScreen() {
    return (
      <View className="bg-my-white-light h-full w-full justify-center items-center">
        <View className="w-full h-fit text-center justify-center items-center p-4 bg-my-black-dark">
          <MyText className="text-xl text-my-red-light">Are you sure??</MyText>
          <MyText className="text-my-white-light">You can undo this restore if needed.</MyText>
          <MyText className="text-my-white-light">Your budget will reset to {selectedSafeBackup?.totalSpendingBudget}</MyText>
          <MyText className="text-my-white-light">
            You will have {selectedSafeBackup?.payments?.length ?? 0} payments totaling $
            {(selectedSafeBackup?.payments ?? []).reduce((acc, p) => p.amount + acc, 0).toFixed(2)}
          </MyText>
          <MyText>
            You will have {selectedSafeBackup?.nvelopes?.length ?? 0} nvelopes totaling $
            {(selectedSafeBackup?.nvelopes ?? []).reduce((acc, p) => p.total + acc, 0).toFixed(2)}
          </MyText>
          <View className="gap-2 w-full">
            <Btn color="gold" text="Save" onPress={handleRestoreBackup} />
            <Btn
              color="red"
              text="Cancel"
              onPress={() => {
                setSelectedSafeBackup(null);
                setShowBackupModal(false);
              }}
            />
          </View>
        </View>
      </View>
    );
  }
  if (showBackupModal && !selectedSafeBackup) return <BackupSelectionScreen />;
  if (selectedSafeBackup) return <BackupSelectionConfirmScreen />;

  return (
    <View className="w-full items-center gap-2 mt-4 py-[1rem]">
      <BudgetSettingsHeader />
      <View className="w-full gap-2 items-center">
        {!showEditBudget && payDate ? (
          <>
            <BudgetCurrentState />
            <Spacer h={2} />
          </>
        ) : (
          payDate && (
            <BudgetSettingsFields
              budgetMeta={budget}
              setBudgetMeta={handleSave}
              mode="edit"
              intervalValue={newBudgetInterval}
              onIntervalChange={(i) => setNewBudgetInterval(i)}
              payDate={newBudgetPayDate?.toDate() ?? payDate.toDate()}
              onPayDateChange={(d) => setNewBudgetPayDate(Timestamp.fromDate(new Date(d.year, d.month, d.day)))}
              intervalLabel="Pay period interval"
              onSave={handleSave}
            />
          )
        )}
        {isOwner && budget!.memberIds.filter((id) => id !== budget!.ownerId).length > 0 && <BudgetMemberDisplay />}
      </View>

      <View className="w-full gap-4">
        {activeBudgetId && !showEditBudget && (
          <>
            {showShareBudgetModal && isOwner && <ShareBudgetModal />}
            {isOwner && (
              <View className="gap-2">
                <Btn text="Share budget" h="h-[2.5rem]" color="green" onPress={() => setShowShareBudgetModal(true)} />
                {safeBackups.length > 0 && !showEditBudget && (
                  <Btn color="gold" text="Revert To Backup" h="h-[2.5rem]" onPress={() => setShowBackupModal(true)} />
                )}
                <Btn text="Delete this budget" h="h-[2.5rem]" color="red" onPress={() => setShowDeleteBudgetConfirm(true)} />
                {isMember && (
                  <Btn text="Leave this budget" h="h-[2.5rem]" color="red" onPress={() => setShowLeaveBudgetConfirm(true)} />
                )}
              </View>
            )}
          </>
        )}
      </View>
      <UndoLastRestoreScreen />
    </View>
  );
}
