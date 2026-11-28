import { Modal, View } from "react-native";
import { BudgetMeta } from "../../types";
import { MyText } from "../../components/MyText";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext/useAuth";
import { useBudget } from "../../context/BudgetContext/useBudget";
import { deleteBudgetAsOwner } from "../../firebase/budgets";
import Toast from "react-native-toast-message";
import Btn from "../../components/Buttons/Btn";

export default function DeleteBudgetModal({ setShowDeleteBudgetConfirm }: { setShowDeleteBudgetConfirm: (b: boolean) => void }) {
  const { user } = useAuth();
  const { activeBudgetId, setActiveBudgetId, refetchBudgets, budgets } = useBudget();

  const [isDeletingBudget, setIsDeletingBudget] = useState(false);

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
  return (
    <Modal>
      <View className="bg-my-black-dark w-full h-screen">
        <View className="items-center gap-4 w-full h-fit m-auto">
          <View className="items-center w-full">
            <MyText className="text-xl text-my-red-light mb-2">Delete this budget?</MyText>
            <MyText className="text-my-white-light w-[80%] text-center">
              All data (nvelopes, payments) will be permanently deleted. All members will lose access.
              <MyText className="text-my-red-light underline"> This cannot be undone.</MyText>
            </MyText>
            {isDeletingBudget && <MyText className="text-my-white-dark text-sm mt-4">Deleting…</MyText>}
          </View>
          <View className="gap-2 items-center justify-center w-full">
            <Btn color="gold" text="Delete Budget" disabled={isDeletingBudget} onPress={handleDeleteBudgetConfirm} />
            <Btn color="red" text="Go Back" onPress={() => setShowDeleteBudgetConfirm(false)} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
