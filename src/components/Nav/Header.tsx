import { useEffect, useState } from "react";
import {
  calculateCurrentIntervalStart,
  getDaysToNextPayDate,
  getIntervalDateRange,
  getNumberOfDaysFromInterval,
} from "../../util/util";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import { useDatabase } from "../../context/DatabaseContext/useDatabase";
import { Pressable, View } from "react-native";
import { MyText } from "../MyText";
import EditSpendingBudget from "../Forms/EditSpendingBudget";
import MyIcon from "../MyIcon";
import { useBudget } from "../../context/BudgetContext/useBudget";

export default function Header({
  handleAddCash,
  handleSpendCash,
  showBudgetSettings,
}: {
  handleSpendCash: () => void;
  handleAddCash: () => void;
  showBudgetSettings: () => void;
}) {
  const { totalSpendingBudget, payPeriodInterval, payDate } = useDatabase();
  const [daysTillReset, setDaysTillReset] = useState(0);
  const [showEditSpendingBudget, setShowEditSpendingBudget] = useState(false);
  const { activeBudgetId, budgets } = useBudget();
  const activeBudgetName = budgets.find((b) => b.id === activeBudgetId)?.name ?? "Budget";

  // Handle Display for payPeriod and remaining Budget
  useEffect(() => {
    if (!payDate || !payPeriodInterval) {
      setDaysTillReset(0);
      return;
    }
    const daysToNextPayDate = getDaysToNextPayDate(payPeriodInterval, payDate);
    setDaysTillReset(daysToNextPayDate);
  }, [payPeriodInterval, payDate, totalSpendingBudget]);

  if (showEditSpendingBudget) return <EditSpendingBudget handleBack={() => setShowEditSpendingBudget(false)} />;

  function BackButton() {
    return (
      <Pressable onPress={showBudgetSettings} className="w-full flex-row justify-center items-start gap-2 mb-4">
        <MyIcon type="BACK" size={20} />
        <MyText className="text-md font-semibold text-my-blue-dark mb-2 w-fit">{activeBudgetName}</MyText>
      </Pressable>
    );
  }

  function DayCounter() {
    return (
      <View
        className={`mr-4 w-1/3 h-14 items-center justify-center border-2 border-my-white-light rounded-md ${daysTillReset > 3 ? "bg-my-red-dark" : "bg-my-green-dark"}`}
      >
        <MyText
          className={`text-xl text-my-white-light py-[.3rem] px-3 font-bold  text-center
              `}
        >
          {daysTillReset} {daysTillReset > 1 ? "days" : daysTillReset === 1 ? "day" : "days"}
        </MyText>
      </View>
    );
  }

  function BudgetDisplay() {
    return (
      <View
        className={`rounded-md border-2 border-my-white-light  h-14 justify-center 
            ${totalSpendingBudget < 0 ? "bg-my-red-dark" : totalSpendingBudget === 0 ? "bg-my-black-light" : "bg-my-green-dark"}`}
      >
        <MyText
          onPress={() => setShowEditSpendingBudget(true)}
          className={`text-xl text-my-white-light py-[.3rem] px-3 font-bold text-center
              `}
        >
          ${totalSpendingBudget.toFixed(2)}
        </MyText>
      </View>
    );
  }

  function AddCash() {
    return (
      <Pressable
        onPress={handleAddCash}
        className="bg-my-green-light border-2 border-my-black-dark rounded-lg p-[1px] h-[3.25rem] w-[3.25rem] justify-center items-center"
      >
        <MyIcon type={"CASH"} size={30} strokeWidth={6} />
      </Pressable>
    );
  }

  function RemoveCash() {
    return (
      <Pressable
        onPress={handleSpendCash}
        className="bg-my-red-light border-2 border-my-black-dark rounded-lg p-[1px] h-[3.25rem] w-[3.25rem] justify-center items-center"
      >
        <MyIcon type={"CASH"} size={30} strokeWidth={6} />
      </Pressable>
    );
  }

  return (
    <View className="w-full">
      <BackButton />
      <View className="flex-row justify-between items-center gap-2 w-screen px-6">
        <DayCounter />
        <View className="flex-row justify-start items-center gap-[2px]">
          <RemoveCash />
          <BudgetDisplay />
          <AddCash />
        </View>
      </View>
    </View>
  );
}
