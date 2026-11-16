import { View } from "react-native";
import { MyText } from "../../components/MyText";
import Btn from "../../components/Buttons/Btn";
import { useAuth } from "../../context/AuthContext/useAuth";
import { AsyncStorageBackup, restoreFromAsyncStorageBackup } from "../../firebase/editData";
import { useBudget } from "../../context/BudgetContext/useBudget";
import { useDatabase } from "../../context/DatabaseContext/useDatabase";
import { useState } from "react";
import Toast from "react-native-toast-message";

export default function UndoRestoreLastBackup({
  setShowUndoConfirm,
  asyncStorageBackup,
  setAsyncStorageBackup,
}: {
  setShowUndoConfirm: (b: boolean) => void;
  asyncStorageBackup: AsyncStorageBackup;
  setAsyncStorageBackup: (a: AsyncStorageBackup | null) => void;
}) {
  const { user } = useAuth();
  const { activeBudgetId } = useBudget();
  const { setPayments, setEnvelopes, setTotalSpendingBudget } = useDatabase();

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

  if (!asyncStorageBackup) return;

  return (
    <View className="bg-my-black-dark">
      <View className="w-full text-center">
        <MyText className="text-xl text-my-blue-light">Undo Last Restore?</MyText>
        <MyText className="mb-4">This will restore your data to the state before the last restore.</MyText>
        <MyText>Your budget will reset to {asyncStorageBackup.data.totalSpendingBudget}</MyText>
        <MyText>You will have {asyncStorageBackup.data.payments?.length ?? 0} payments</MyText>
        <MyText>You will have {asyncStorageBackup.data.envelopes?.length ?? 0} nvelopes</MyText>
      </View>
      <View className="gap-2 items-center justify-center w-full">
        <Btn color="gold" text="Confirm" onPress={handleUndoRestore} />
        <Btn color="red" text="Cancel" onPress={() => setShowUndoConfirm(false)} />
      </View>
    </View>
  );
}
