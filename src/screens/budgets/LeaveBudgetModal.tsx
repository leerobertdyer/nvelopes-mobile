import { Modal, View } from "react-native";
import { MyText } from "../../components/MyText";
import Btn from "../../components/Buttons/Btn";
import { useAuth } from "../../context/AuthContext/useAuth";
import { useBudget } from "../../context/BudgetContext/useBudget";
import { leaveBudget } from "../../firebase/budgets";
import Toast from "react-native-toast-message";

export default function LeaveBudgetModal({
  isLeavingBudget,
  setIsLeavingBudget,
  setShowLeaveBudgetConfirm,
}: {
  isLeavingBudget: boolean;
  setIsLeavingBudget: (b: boolean) => void;
  setShowLeaveBudgetConfirm: (b: boolean) => void;
}) {
  const { user } = useAuth();
  const { activeBudgetId, setActiveBudgetId, refetchBudgets, budgets } =
    useBudget();

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

  return (
    <Modal>
      <View className="bg-my-black-dark w-full h-screen justify-center items-center">
        <View className="bg-my-black-dark w-full h-fit gap-4 items-center">
          <View className="w-full items-center justify-center">
            <MyText className="text-xl text-my-red-light mb-2 w-full text-center">
              Leave this budget?
            </MyText>
            <MyText className="text-my-white-light text-center w-full">
              You will no longer see or edit this budget. Your data elsewhere is
              unaffected.
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
      </View>
    </Modal>
  );
}
