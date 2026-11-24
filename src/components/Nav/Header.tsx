import { useEffect, useState } from "react";
import {
  calculateCurrentIntervalStart,
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
  showBudgetSettings,
}: {
  handleAddCash: () => void;
  showBudgetSettings: () => void;
}) {
  const { totalSpendingBudget, payPeriodInterval, payDate } = useDatabase();
  const [daysTillReset, setDaysTillReset] = useState(0);
  const [showEditSpendingBudget, setShowEditSpendingBudget] = useState(false);
  const { activeBudgetId, budgets } = useBudget();
  const activeBudgetName =
    budgets.find((b) => b.id === activeBudgetId)?.name ?? "Budget";

  useEffect(() => {
    // Handle Display for payPeriod and remaining Budget
    if (!payDate || !payPeriodInterval) {
      setDaysTillReset(0);
      return;
    }
    const today = startOfDay(new Date());

    const currentPayPeriodStart = calculateCurrentIntervalStart(
      payDate.toDate(),
      payPeriodInterval,
    );
    // If today IS the period start, show the full period length
    if (startOfDay(currentPayPeriodStart).getTime() === today.getTime()) {
      const periodLength = getNumberOfDaysFromInterval(payPeriodInterval);
      setDaysTillReset(periodLength);
      return;
    }

    let { end } = getIntervalDateRange(
      payPeriodInterval,
      currentPayPeriodStart,
    );

    const beginningOfPayday = startOfDay(payDate.toDate());
    if (beginningOfPayday > today) {
      // If setting payday to future, set end to the day BEFORE payday (last day of current period)
      // This matches getIntervalDateRange which also subtracts 1 day to get the last day
      end = startOfDay(payDate.toDate());
      const diffDays = differenceInCalendarDays(end, today);
      // Don't add 1 here since end is the reset day, not the last day of period
      setDaysTillReset(diffDays > 0 ? diffDays : 1);
      return;
    }

    // Use differenceInCalendarDays for accurate day counting (adds 1 to include today)
    const diffDays = differenceInCalendarDays(end, today);

    setDaysTillReset(diffDays >= 0 ? diffDays + 1 : 0);
  }, [payPeriodInterval, payDate, totalSpendingBudget]);

  if (showEditSpendingBudget)
    return (
      <EditSpendingBudget handleBack={() => setShowEditSpendingBudget(false)} />
    );

  return (
    <View className="w-full">
      <Pressable
        onPress={showBudgetSettings}
        className="w-full flex-row justify-center items-start gap-2 mb-4"
      >
        <MyIcon type="BACK" size={20} />
        <MyText className="text-md font-semibold text-my-blue-dark mb-2 w-fit">
          {activeBudgetName}
        </MyText>
      </Pressable>
      <View className="flex-row justify-around items-center gap-8 w-screen px-6">
        <View
          className={`w-1/3 h-14 items-center justify-center border-2 border-my-white-light rounded-md ${daysTillReset > 3 ? "bg-my-red-dark" : "bg-my-green-dark"}`}
        >
          <MyText
            className={`text-xl text-my-white-light py-[.3rem] px-3 font-bold  text-center
              `}
          >
            {daysTillReset}{" "}
            {daysTillReset > 1 ? "days" : daysTillReset === 1 ? "day" : "days"}
          </MyText>
        </View>
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
        <Pressable
          onPress={handleAddCash}
          className="bg-my-green-dark border-2 border-my-black-dark rounded-lg p-[1px] h-[3rem] w-[3rem] justify-center items-center"
        >
          <MyIcon type={"CASH"} size={30} />
        </Pressable>
      </View>
    </View>
  );
}
