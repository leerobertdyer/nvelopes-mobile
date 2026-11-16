import { Modal } from "react-native";
import { View } from "react-native-reanimated/lib/typescript/Animated";
import { MyText } from "../../components/MyText";
import Btn from "../../components/Buttons/Btn";
import Toast from "react-native-toast-message";
import { useAuth } from "../../context/AuthContext/useAuth";
import { useBudget } from "../../context/BudgetContext/useBudget";
import { getBudgetMeta, removeMemberFromBudget } from "../../firebase/budgets";
import { BudgetMeta } from "../../types";

interface IMemberToRemove {
  isLeavingBudget: boolean;
  memberToRemove: string;
  setMemberToRemove: (s: string | null) => void;
  setBudgetMeta: (b: BudgetMeta) => void;
}
export default function MemberToRemove({
  isLeavingBudget,
  memberToRemove,
  setMemberToRemove,
  setBudgetMeta,
}: IMemberToRemove) {
  const { user } = useAuth();
  const { activeBudgetId } = useBudget();

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
            id: activeBudgetId,
            name: meta.name,
            ownerId: meta.ownerId,
            memberIds: meta.memberIds,
            memberEmails: meta.memberEmails,
            createdAt: meta.createdAt,
          });
        Toast.show({ type: "success", text1: "Member removed" });
      } else {
        Toast.show({ type: "error", text1: "Failed to remove member" });
      }
    } catch {
      Toast.show({ type: "error", text1: "Failed to remove member" });
    }
  }
  return (
    <Modal>
      <View className="bg-my-black-dark h-full justify-center items-center">
        <View className="bg-my-blue-dark h-fit w-full justify-center items-center py-8 gap-4">
          <View className="text-center w-full">
            <MyText className="text-xl text-my-white-dark mb-2 bg-my-red-dark w-full text-center">
              Remove {memberToRemove}?
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
  );
}
