import { Modal, Pressable, View } from "react-native";
import { BackupData, BudgetMeta, Interval } from "../../types";
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
import BudgetSettingsFields from "../../components/Forms/BudgetSettingsFields";
import { DateData } from "react-native-calendars";
import MyIcon from "../../components/MyIcon";
import IntervalSelector from "../../components/Forms/IntervalSelector";
import { updateBudgetName } from "../../firebase/budgets";

interface IBudgetDetails {
  budget: BudgetMeta;
  handleCalendarChange: (d: DateData) => void;
  setShowDeleteBudgetConfirm: (b: boolean) => void;
}

export default function BudgetDetails({ budget, handleCalendarChange, setShowDeleteBudgetConfirm }: IBudgetDetails) {
  const { user } = useAuth();
  const { activeBudgetId, budgets, setActiveBudgetId } = useBudget();
  const { setPayments, setEnvelopes, setTotalSpendingBudget, payDate, payPeriodInterval, setPayDate, setPayPeriodInterval } =
    useDatabase();

  const isOwner = user && budget && budget.ownerId === user.uid;
  const isMember = user && budget && budget.memberIds.includes(user.uid) && !isOwner;

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
  // asyncStorageBackup for undo last restore
  const [asyncStorageBackup, setAsyncStorageBackup] = useState<AsyncStorageBackup | null>(null);
  const [safeBackups, setSafeBackups] = useState<Array<BackupData & { id: string }>>([]);

  // Show Budget Inputs
  const [showEditName, setShowEditName] = useState(false);
  const [showEditInterval, setShowEditInterval] = useState(false);
  const [showEditPayDate, setShowEditPaydate] = useState(false);

  // Budget State
  const [newBudgetName, setNewBudgetName] = useState(budget.name);
  const [newBudgetInterval, setNewBudgetInterval] = useState(payPeriodInterval);
  const [newBudgetPayDate, setNewBudgetPayDate] = useState(payDate);

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

  async function handleSaveOrCancel() {
    if (!activeBudgetId || !user) return;
    if (newBudgetName !== budget.name) await updateBudgetName(activeBudgetId, user?.uid, newBudgetName);
    if (newBudgetInterval !== payPeriodInterval) await editPayPeriodInterval(newBudgetInterval, activeBudgetId);
    if (newBudgetPayDate && newBudgetPayDate !== payDate) await editPayDate(newBudgetPayDate?.toDate(), activeBudgetId);
    setPayPeriodInterval(newBudgetInterval);
    setPayDate(newBudgetPayDate);
    setShowEditName(false);
    setShowEditInterval(false);
    setShowEditPaydate(false);
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

  const budgetHasChanged =
    newBudgetName !== budget.name || newBudgetInterval !== payPeriodInterval || newBudgetPayDate !== payDate;

  return (
    <View className="w-full items-center gap-2 mt-4 py-[1rem]">
      {budgetHasChanged ? (
        <Btn h="h-[2.5rem]" color="gold" text="Save" onPress={handleSaveOrCancel} />
      ) : (
        <MyText className="text-2xl text-center">Budget Settings</MyText>
      )}
      <View className="w-full gap-2 items-center">
        {!showEditName ? (
          <View className="flex-row items-center w-[20rem] justify-between">
            <View className="flex-row justify-between flex-1 mr-2">
              <MyText className="text-my-black-light" numberOfLines={1}>
                Name:{" "}
              </MyText>
              <MyText className="text-my-white-dark">{budget.name}</MyText>
            </View>
            <Pressable onPress={() => setShowEditName(true)}>
              <MyIcon type="EDIT" size={20} />
            </Pressable>
          </View>
        ) : (
          <Input placeholder={budget.name} value={newBudgetName} onChange={(v) => setNewBudgetName(v)} />
        )}
        {!showEditInterval ? (
          <View className="flex-row items-center w-[20rem] justify-between">
            <View className="flex-row justify-between flex-1 mr-2">
              <MyText className="text-my-black-light">Budget Period: </MyText>
              <MyText className="text-my-white-dark">{payPeriodInterval?.toLowerCase()}</MyText>
            </View>
            <Pressable onPress={() => setShowEditInterval(true)}>
              <MyIcon type="EDIT" size={20} />
            </Pressable>
          </View>
        ) : (
          <IntervalSelector value={newBudgetInterval} onChange={handleSaveOrCancel} />
        )}

        {!showEditPayDate && payDate ? (
          <View className="flex-row items-center w-[20rem] justify-between">
            <View className="flex-row justify-between flex-1 mr-2">
              <MyText className="text-my-black-light">Paydate based off: </MyText>
              <MyText className="text-my-white-dark">{format(payDate.toDate(), "E MM-dd-yy")}</MyText>
            </View>
            <Pressable onPress={() => setShowEditName(true)}>
              <MyIcon type="EDIT" size={20} />
            </Pressable>
          </View>
        ) : (
          <Input placeholder={budget.name} value={newBudgetName} onChange={(v) => setNewBudgetName(v)} />
        )}

        {isOwner && budget.memberIds.filter((id) => id !== budget.ownerId).length > 0 && (
          <View className="w-full max-w-[20rem] gap-1 bg-my-white-dark/30 rounded-md mb-2">
            <View className="bg-my-black-base rounded-t-md gap-2 py-2">
              <MyText className="text-xs text-center text-my-white-light">Members</MyText>
            </View>
            <View className="p-4">
              {budget.memberIds
                .filter((id) => id !== budget.ownerId)
                .map((mid) => (
                  <Pressable
                    key={mid}
                    className="flex flex-row items-center justify-center gap-2 py-1 text-my-white-dark text-sm"
                    onPress={() => {
                      console.log("WTH: ", mid);
                      setMemberToRemove(mid);
                    }}
                  >
                    <MyText className="text-my-black-dark w-fit">{budget.memberEmails?.[mid] ?? mid.slice(0, 8) + "…"}</MyText>
                    <FontAwesome name="trash" size={18} color="#ad0241" />
                  </Pressable>
                ))}
            </View>
          </View>
        )}
      </View>

      <View className="w-full gap-4">
        {activeBudgetId && (
          <>
            {isOwner && <Btn text="Share budget" color="green" onPress={() => setShowShareBudgetModal(true)} />}
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
                    <Btn color="red" text="Cancel" onPress={() => setShowShareBudgetModal(false)} />
                  </View>
                </View>
              </Modal>
            )}
            {isOwner && <Btn text="Delete this budget" color="red" onPress={() => setShowDeleteBudgetConfirm(true)} />}
            {isMember && <Btn text="Leave this budget" color="red" onPress={() => setShowLeaveBudgetConfirm(true)} />}
          </>
        )}
      </View>
      <BackupSelectionScreen />
      {selectedSafeBackup && <BackupSelectionConfirmScreen />}
      <UndoLastRestoreScreen />
    </View>
  );

  function UndoLastRestoreScreen() {
    if (!asyncStorageBackup) return null;
    return (
      <Pressable
        className="justify-around w-[80%] max-w-[20rem] h-fit items-center p-2 bg-my-blue-dark rounded-md border-2 border-my-white-dark text-my-white-light my-4 gap-2"
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
      <View className="justify-between items-center w-[80%] p-4 bg-my-black-base rounded-md border-2 border-my-white-dark my-4">
        <MyText className="text-sm font-bold text-my-white-light">Revert To A Backup</MyText>
        <MyText className="text-xs text-my-white-base">Restores payments and nvelopes</MyText>
        <View className="w-full">
          {isLoadingSafeBackups ? (
            <MyText className="text-xs py-2">Loading backups...</MyText>
          ) : safeBackups.length === 0 ? (
            <MyText className="text-xs py-2 text-gray-400 text-center">No backups yet</MyText>
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
      </View>
    );
  }

  function BackupSelectionConfirmScreen() {
    return (
      <Modal>
        <View className="bg-my-white-light h-full w-full justify-center items-center">
          <View className="w-full h-fit text-center justify-center items-center p-4 bg-my-black-dark">
            <MyText className="text-xl text-my-red-light">Are you sure??</MyText>
            <MyText className="text-my-red-light">You can undo this restore if needed.</MyText>
            <MyText className="text-my-red-light">Your budget will reset to {selectedSafeBackup?.totalSpendingBudget}</MyText>
            <MyText className="text-my-red-light">
              You will have {selectedSafeBackup?.payments?.length ?? 0} payments totaling $
              {(selectedSafeBackup?.payments ?? []).reduce((acc, p) => p.amount + acc, 0).toFixed(2)}
            </MyText>
            <MyText>
              You will have {selectedSafeBackup?.nvelopes?.length ?? 0} nvelopes totaling $
              {(selectedSafeBackup?.nvelopes ?? []).reduce((acc, p) => p.total + acc, 0).toFixed(2)}
            </MyText>
            <Btn color="gold" text="Save" onPress={handleRestoreBackup} />
            <Btn color="red" text="Go Back" onPress={handleCloseBackup} />
          </View>
        </View>
      </Modal>
    );
  }
}
