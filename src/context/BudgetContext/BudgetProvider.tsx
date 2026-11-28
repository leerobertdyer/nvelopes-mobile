import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../AuthContext/useAuth";
import { BudgetContext } from "./BudgetContext";
import { createFirstBudget } from "../../firebase/budgets";
import { editIsNewUser } from "../../firebase/editData";
import firestore from "@react-native-firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BudgetMeta } from "../../types";

const ACTIVE_BUDGET_KEY = "nvelope_activeBudgetId";

export default function BudgetProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<BudgetMeta[]>([]);
  const [activeBudgetId, setActiveBudgetIdState] = useState<string | null>(null);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(true);

  const loadBudgets = useCallback(async (): Promise<BudgetMeta[]> => {
    if (!user) {
      setBudgets([]);
      setActiveBudgetIdState(null);
      setIsLoadingBudgets(false);
      return [];
    }
    setIsLoadingBudgets(true);
    try {
      const budgetSnap = await firestore().collection("budgets").where("memberIds", "array-contains", user.uid).get();

      const budgets: BudgetMeta[] = budgetSnap.docs.map((d) => ({
        id: d.id,
        name: d.data().name ?? "Budget",
        payDate: d.data().payDate,
        payPeriodInterval: d.data().payPeriodInterval,
        createdAt: d.data().createdAt,
        ownerId: d.data().ownerId,
        memberIds: d.data().memberIds,
        memberEmails: d.data().memberEmails,
        envelopeCount: d.data().envelopes?.length,
        billCount: d.data().payments?.length,
        availableBudget: d.data().availableBudget,
      }));
      setBudgets(budgets);

      const stored = await AsyncStorage.getItem(ACTIVE_BUDGET_KEY);
      const validStored = budgets.some((b) => b.id === stored);
      if (budgets.length > 0) {
        const nextActive = validStored && stored ? stored : budgets[0].id;
        setActiveBudgetIdState(nextActive);
        if (nextActive !== stored) {
          await AsyncStorage.setItem(ACTIVE_BUDGET_KEY, nextActive);
        }
      } else {
        setActiveBudgetIdState(null);
        await AsyncStorage.removeItem(ACTIVE_BUDGET_KEY);
      }
      return budgets;
    } catch (e) {
      console.error("BudgetProvider: failed to load budgets", e);
      setBudgets([]);
      setActiveBudgetIdState(null);
      return [];
    } finally {
      setIsLoadingBudgets(false);
    }
  }, [user]);

  /** Call when user was removed from the current budget: refetch list and switch to another budget, or create one if none left. */
  const handleRemovedFromBudget = useCallback(async () => {
    if (!user) return;
    const list = await loadBudgets();
    if (list.length === 0) {
      const newId = await createFirstBudget(user);
      if (newId) {
        await editIsNewUser(false, newId);
        setActiveBudgetIdState(newId);
        await AsyncStorage.setItem(ACTIVE_BUDGET_KEY, newId);
        await loadBudgets();
      }
    }
  }, [user, loadBudgets]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const setActiveBudgetId = useCallback(async (id: string | null) => {
    setActiveBudgetIdState(id);
    if (id) await AsyncStorage.setItem(ACTIVE_BUDGET_KEY, id);
    else await AsyncStorage.removeItem(ACTIVE_BUDGET_KEY);
  }, []);

  const value = {
    budgets,
    activeBudgetId,
    setActiveBudgetId,
    isLoadingBudgets,
    hasBudgets: budgets.length > 0,
    refetchBudgets: () => loadBudgets().then(() => {}),
    handleRemovedFromBudget,
  };

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
}
