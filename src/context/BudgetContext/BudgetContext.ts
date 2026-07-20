import { createContext } from "react";

export interface BudgetListItem {
  id: string;
  name: string;
}

export interface BudgetContextValue {
  budgets: BudgetListItem[];
  activeBudgetId: string | null;
  setActiveBudgetId: (id: string | null) => void;
  isLoadingBudgets: boolean;
  hasBudgets: boolean;
  refetchBudgets: () => Promise<void>;
  /** Call when current budget is no longer accessible (e.g. removed by owner). Refetches and switches to another budget or creates one. */
  handleRemovedFromBudget: () => Promise<void>;
}

export const BudgetContext = createContext<BudgetContextValue | null>(null);
