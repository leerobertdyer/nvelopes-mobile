import { Modal, Pressable, ScrollView, View } from "react-native";
import { useBudget } from "../../context/BudgetContext/useBudget";
import { MyText } from "../../components/MyText";
import { useEffect, useState } from "react";
import { createBudget, getAllBudgetData } from "../../firebase/budgets";
import { BudgetMeta, Interval } from "../../types";
import Btn from "../../components/Buttons/Btn";
import Loading from "../../components/Loading";
import MyIcon from "../../components/MyIcon";
import BudgetSettingsFields from "../../components/Forms/BudgetSettingsFields";
import { useAuth } from "../../context/AuthContext/useAuth";
import EditSpendingBudget from "../../components/Forms/EditSpendingBudget";
import Input from "../../components/Input";
import Toast from "react-native-toast-message";
import { useDatabase } from "../../context/DatabaseContext/useDatabase";
import { DateData } from "react-native-calendars";
import { editPayPeriodInterval } from "../../firebase/editData";

export default function BudgetSettings({ handleClose }: { handleClose: () => void }) {
  const { budgets, activeBudgetId, setActiveBudgetId, refetchBudgets } = useBudget();
  const { payDate } = useDatabase();

  const { user } = useAuth();

  const [bugetsWithMeta, setBudgetsWithMeta] = useState<BudgetMeta[]>([]);
  const [budgetMeta, setBudgetMeta] = useState<BudgetMeta | null>(null);

  const [loading, setLoading] = useState(true);
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(true);

  const [isCreatingBudget, setIsCreatingBudget] = useState(false);
  const [showCreateBudgetModal, setShowCreateBudgetModal] = useState(false);
  const [isEditingCash, setIsEditingCash] = useState(false);

  // Create New Budget
  const [newBudgetInterval, setNewBudgetInterval] = useState<Interval | null>();
  const [newBudgetName, setNewBudgetName] = useState("");
  const [newBudgetPayDate, setNewBudgetPayDate] = useState<Date | null>();

  const [showDeleteBudgetConfirm, setShowDeleteBudgetConfirm] = useState(false);


  // Get budgets
  useEffect(() => {
    if (!user || !activeBudgetId) return;
    async function populateMeta() {
      const bucket = [];
      for (const b of budgets) {
        const budget = await getAllBudgetData(b.id);
        if (budget) {
          bucket.push(budget);
        }
      }
      setBudgetsWithMeta(bucket);
      setLoading(false);
    }
    populateMeta();
  }, []);

  async function selectBudget(id: string) {
    if (activeBudgetId === id) return;
    setActiveBudgetId(id);
    handleClose();
  }

  async function handleEditBudget() {
    setShowEditBudgetModal(true);
  }
  async function handleNewBudget() {
    setShowCreateBudgetModal(true);
  }

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

  if (showDeleteBudgetConfirm) return <DeleteBudgetModal b={budget} setShowDeleteBudgetConfirm={setShowDeleteBudgetConfirm} />;

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
            budgetMeta={budgetMeta}
            setBudgetMeta={setBudgetMeta}
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

  if (showEditBudgetModal)
    return (
      <Modal>
        <View className="justify-center gap-4 w-full h-full bg-my-black-base">
          <View className="w-full h-fit m-auto bg-my-blue-dark p-4">
            <BudgetSettingsFields
              mode="edit"
              intervalValue={newBudgetInterval}
              onIntervalChange={(i) => editPayPeriodInterval(i, activeBudgetId!)}
              budgetMeta={budgetMeta}
              setBudgetMeta={setBudgetMeta}
              payDate={payDate?.toDate() ?? null}
              onPayDateChange={handleCalendarChange}
              onSave={() => setShowEditBudgetModal}
            />
            <View className="gap-2">
              <Btn text="Go Back" color="red" onPress={() => handleClose()} />
            </View>
          </View>
        </View>
      </Modal>
    );
  return (
    <ScrollView contentContainerClassName="justify-center items-center">
      <View className="p-2 gap-2">
        <MyText className="text-xl text-center font-bold">Switch Budget</MyText>
        {bugetsWithMeta.map((b) => (
          <View
            key={b.id}
            className={`
            w-[24rem] h-fit 
            rounded-md  border-my-black-dark
            p-2 bg-white
            ${b.id === activeBudgetId ? "border-4 border-my-blue-dark" : "border-2"}`}
          >
            <View className="flex-row items-center justify-center gap-2 w-full">
              <MyText numberOfLines={1} className="text-lg text-center text-my-black-light">
                {b.name}
              </MyText>
            </View>
            <MyText className="text-center text-lg">${b.availableBudget?.toFixed(2)}</MyText>

            <View className="flex-row items-center justify-center gap-2 ml-4">
              <View className="flex-row items-center justify-center gap-2 mt-2">
                <View className="items-center">
                  <View className="w-[2.25rem] h-[2.25rem] p-2 rounded-md bg-my-black-dark justify-center items-center">
                    <MyIcon type="NVELOPE" size={22} />
                  </View>
                  <MyText className="text-lg">{b.envelopeCount}</MyText>
                </View>
                <View className="items-center">
                  <View className="w-[2.25rem] h-[2.25rem] p-2 rounded-md bg-my-red-dark justify-center items-center">
                    <MyIcon type="CASH" size={22} />
                  </View>
                  <MyText className="text-lg">{b.billCount}</MyText>
                </View>
              </View>
              {activeBudgetId === b.id ? (
                <View className="flex-1 mx-4 gap-2">
                  <Btn color="gold" text="Edit" h="h-[2rem]" onPress={() => handleEditBudget()} />
                  <Btn color="red" text="Delete" h="h-[2rem]" onPress={() => {}} />
                </View>
              ) : (
                <View className="flex-1 mx-4 gap-2">
                  <Btn color="green" text="Switch" h="h-[2rem]" onPress={() => selectBudget(b.id)} />
                  <Btn color="red" text="Delete" h="h-[2rem]" onPress={() => {}} />
                </View>
              )}
            </View>
          </View>
        ))}
        <Pressable
          onPress={handleNewBudget}
          className="w-[24rem] bg-white h-[10rem] rounded-md border-2 justify-center items-center"
        >
          <MyIcon type="ADD" />
          <MyText>Add New Budget</MyText>
        </Pressable>
      </View>
      <Btn color="red" onPress={() => handleClose()} text="Back" w="w-full" />
    </ScrollView>
  );
}
