import { createContext } from "react";
import { BudgetMeta } from "../../types";


export interface BudgetContextValue {
  budgets: BudgetMeta[];
  activeBudgetId: string | null;
  setActiveBudgetId: (id: string | null) => void;
  isLoadingBudgets: boolean;
  hasBudgets: boolean;
  refetchBudgets: () => Promise<void>;
  /** Call when current budget is no longer accessible (e.g. removed by owner). Refetches and switches to another budget or creates one. */
  handleRemovedFromBudget: () => Promise<void>;
}

export const BudgetContext = createContext<BudgetContextValue | null>(null);
