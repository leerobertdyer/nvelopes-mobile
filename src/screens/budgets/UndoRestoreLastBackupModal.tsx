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
  const restored = await restoreFromAsyncStorageBackup(user, activeBudgetId);
  if (restored) {
    setPayments(restored.payments);
    setEnvelopes(restored.envelopes);
    setTotalSpendingBudget(restored.totalSpendingBudget);
    setAsyncStorageBackup(null);
    setShowUndoConfirm(false);
    Toast.show({ type: "success", text1: "Restore undone successfully" });
  } else {
    Toast.show({ type: "error", text1: "Failed to undo restore" });
  }
}

  if (!asyncStorageBackup) return;

  return (
    <View className="bg-my-white-dark">
      <View className="w-full text-center">
        <MyText className="text-xl text-my-black-light text-center">Undo Last Restore?</MyText>
        <View className="w-[80%] m-auto">
          <MyText className="mb-4">This will restore your data to the state before the last restore.</MyText>
          <MyText>Your budget will reset to {asyncStorageBackup.data.totalSpendingBudget}</MyText>
          <MyText>You will have {asyncStorageBackup.data.payments?.length ?? 0} payments</MyText>
          <MyText>You will have {asyncStorageBackup.data.envelopes?.length ?? 0} nvelopes</MyText>
        </View>
      </View>
      <View className="gap-2 items-center justify-center w-full my-4">
        <Btn color="green" text="Confirm" onPress={handleUndoRestore} />
        <Btn color="red" text="Cancel" onPress={() => setShowUndoConfirm(false)} />
      </View>
    </View>
  );
}
