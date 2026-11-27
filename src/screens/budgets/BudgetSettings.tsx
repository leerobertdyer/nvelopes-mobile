import { ScrollView, View } from "react-native";
import { useBudget } from "../../context/BudgetContext/useBudget";
import { useEffect, useState } from "react";
import { createBudget, getAllBudgetData } from "../../firebase/budgets";
import { BudgetMeta, Interval } from "../../types";
import Btn from "../../components/Buttons/Btn";
import Loading from "../../components/Loading";
import BudgetSettingsFields from "../../components/Forms/BudgetSettingsFields";
import { useAuth } from "../../context/AuthContext/useAuth";
import EditSpendingBudget from "../../components/Forms/EditSpendingBudget";
import Input from "../../components/Input";
import Toast from "react-native-toast-message";
import { DateData } from "react-native-calendars";
import DeleteBudgetModal from "./DeleteBudgetModal";
import BudgetDetails from "./BudgetDetails";
import BudgetSelector from "./BudgetSelector";

export default function BudgetSettings({ handleClose }: { handleClose: () => void }) {
  const { activeBudgetId, setActiveBudgetId, refetchBudgets } = useBudget();

  const { user } = useAuth();

  const [budget, setBudget] = useState<BudgetMeta | null>(null);

  const [loading, setLoading] = useState(true);
  const [showBudgetSelector, setShowBudgetSelector] = useState(false);

  const [isCreatingBudget, setIsCreatingBudget] = useState(false);
  const [showCreateBudgetModal, setShowCreateBudgetModal] = useState(false);
  const [isEditingCash, setIsEditingCash] = useState(false);

  // Create New Budget
  const [newBudgetInterval, setNewBudgetInterval] = useState<Interval | null>();
  const [newBudgetName, setNewBudgetName] = useState("");
  const [newBudgetPayDate, setNewBudgetPayDate] = useState<Date | null>();

  const [showDeleteBudgetConfirm, setShowDeleteBudgetConfirm] = useState(false);

  useEffect(() => {
    if (!user || !activeBudgetId) {
      setLoading(false);
      return;
    }

    async function populateBudget(activeBudgetId: string) {
      const b = await getAllBudgetData(activeBudgetId);
      setBudget(b);
    }
    populateBudget(activeBudgetId);

    setLoading(false);
  }, []);

  async function handleCreateBudget(): Promise<boolean> {
    if (!user || !newBudgetPayDate || !newBudgetInterval) return false;
    const name = newBudgetName.trim() || `${user.email}'s Budget`;
    setIsCreatingBudget(true);
    try {
      const budgetId = await createBudget(user, name, newBudgetPayDate, newBudgetInterval);
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

  function handleCalendarChange(d: DateData) {
    const newDate = new Date(d.year, d.month - 1, d.day);
    setNewBudgetPayDate(newDate);
  }

  if (loading) return <Loading text="Loading budgets..." />;

  if (showDeleteBudgetConfirm && budget)
    return <DeleteBudgetModal b={budget} setShowDeleteBudgetConfirm={setShowDeleteBudgetConfirm} />;

  if (isEditingCash) {
    return <EditSpendingBudget handleBack={() => setIsEditingCash(false)} />;
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
            budgetMeta={budget}
            setBudgetMeta={setBudget}
            mode="create"
            intervalValue={newBudgetInterval}
            onIntervalChange={(i) => setNewBudgetInterval(i)}
            payDate={newBudgetPayDate ?? null}
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
            disabled={isCreatingBudget || !newBudgetPayDate || !newBudgetInterval}
          />
          <Btn text="Go Back" color="red" onPress={() => setShowCreateBudgetModal(false)} />
        </View>
      </ScrollView>
    );

  if (showBudgetSelector) return <BudgetSelector setShowBudgetSelector={setShowBudgetSelector} />;
  return (
    <View className="justify-between h-full">
      <ScrollView contentContainerClassName="justify-center items-center">
        <View className="w-[90%] h-fit mb-2 border-2 rounded-md">
          {budget && <BudgetDetails setShowDeleteBudgetConfirm={setShowDeleteBudgetConfirm} />}
        </View>
      </ScrollView>
      <View className="gap-2 mb-4">
        <Btn text="New Budget" h="h-[3rem]" color="green" onPress={() => setShowCreateBudgetModal(true)} />
        <Btn text="Switch Budgets" h="h-[3rem]" color="gold" onPress={() => setShowBudgetSelector(true)} />
        <Btn text="Back" h="h-[3rem]" color="red" onPress={() => handleClose()} />
      </View>
    </View>
  );
}
