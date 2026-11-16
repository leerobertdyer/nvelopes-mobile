import {editPayPeriodInterval } from "../../firebase/editData";
import { Interval } from "../../types";

export async function handleIntervalChange(interval: Interval, activeBudgetId: string, totalSpendingBudget: number) {
    await editPayPeriodInterval(interval, activeBudgetId);
    setInterval(totalSpendingBudget.toString());
  }