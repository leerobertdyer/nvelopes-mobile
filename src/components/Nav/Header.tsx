import { useEffect, useState } from "react";
import NavMenu from "./NavMenu";
import {
  calculateCurrentIntervalStart,
  getIntervalDateRange,
  getNumberOfDaysFromInterval,
} from "../../util/util";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import { useDatabase } from "../../context/DatabaseContext/useDatabase";
import { View } from "react-native";
import { MyText } from "../MyText";
import EditSpendingBudget from "../Forms/EditSpendingBudget";

export default function Header({ links }: { links: string[] }) {
  const { totalSpendingBudget, payPeriodInterval, payDate } = useDatabase();
  const [daysTillReset, setDaysTillReset] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showEditSpendingBudget, setShowEditSpendingBudget] = useState(false);

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
    <>
      <View className="flex-row items-center justify-evenly gap-8 w-screen">
        <MyText
          className={`text-xl rounded-md text-my-white-light py-[.3rem] px-3 font-bold border-2 border-my-white-light
              ${daysTillReset > 3 ? "bg-my-red-dark" : "bg-my-green-dark"}`}
        >
          {daysTillReset} days
        </MyText>
        <MyText
          onPress={() => setShowEditSpendingBudget(true)}
          className={`text-xl rounded-md text-my-white-light py-[.3rem] px-3 font-bold border-2 border-my-white-light
            ${totalSpendingBudget < 0 ? "bg-my-red-dark" : totalSpendingBudget === 0 ? "bg-my-black-dark" : "bg-my-green-dark"}`}
        >
          ${totalSpendingBudget.toFixed(2)}
        </MyText>
        <NavMenu showMenu={showMenu} setShowMenu={setShowMenu} links={links} />
      </View>
    </>
  );
}
