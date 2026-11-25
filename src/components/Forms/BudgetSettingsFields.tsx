import { DateData, Calendar } from "react-native-calendars";
import { BudgetMeta, Interval } from "../../types";
import IntervalSelector from "./IntervalSelector";
import { Modal, View } from "react-native";
import { MyText } from "../MyText";
import { format } from "date-fns";
import { useState } from "react";
import Btn from "../Buttons/Btn";
import Input from "../Input";
import { useBudget } from "../../context/BudgetContext/useBudget";
import { getBudgetMeta, updateBudgetName } from "../../firebase/budgets";
import { useAuth } from "../../context/AuthContext/useAuth";
import Toast from "react-native-toast-message";
import { useDatabase } from "../../context/DatabaseContext/useDatabase";

export interface BudgetSettingsFieldsProps {
  /** "create" = interval + pay date only; "edit" = Edit Remaining Balance card + interval + pay date */
  mode: "create" | "edit";
  intervalValue: Interval | null;
  onIntervalChange: (interval: Interval) => void;
  payDate: Date | null;
  onPayDateChange: (d: DateData) => void;
  /** Only used when mode === "edit" */
  onEditRemainingBalance?: () => void;
  /** Optional label for interval (e.g. "Pay period interval" in create) */
  intervalLabel?: string;
  budgetMeta: BudgetMeta | null;
  setBudgetMeta: (b: BudgetMeta) => void;
  onSave?: () => void;
}

/**
 * Shared budget settings UI: Edit Remaining Balance card (edit only),
 * IntervalSelector, and PayDateCalendar. Used in both Create New Budget and Edit Budget flows.
 */
export default function BudgetSettingsFields({
  mode,
  intervalValue,
  onIntervalChange,
  payDate,
  onPayDateChange,
  onEditRemainingBalance,
  intervalLabel,
  budgetMeta,
  setBudgetMeta,
  onSave,
}: BudgetSettingsFieldsProps) {
  const { activeBudgetId, refetchBudgets } = useBudget();
  const { user } = useAuth();
  const { payPeriodInterval } = useDatabase();

  const newPaymentDate = payDate ? format(payDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"); // Default to today's date string if it's a brand new payment

  const [showIntervalSelector, setShowIntervalSelector] = useState(false);
  const [showPayDateCalendar, setShowPayDateCalendar] = useState(false);
  const [budgetNameInput, setBudgetNameInput] = useState("");
  const [isSavingBudgetName, setIsSavingBudgetName] = useState(false);
  const [editingBudgetName, setEditingBudgetName] = useState(false);

  function handleIntervalChange(i: Interval) {
    setShowIntervalSelector(false);
    onIntervalChange(i);
    onSave?.();
  }

  async function handleSaveBudgetName() {
    if (!user || !activeBudgetId || !budgetNameInput.trim()) return;
    setIsSavingBudgetName(true);
    try {
      const ok = await updateBudgetName(activeBudgetId, user.uid, budgetNameInput.trim());
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
        await refetchBudgets();
        setEditingBudgetName(false);
        setBudgetNameInput("");
        Toast.show({ type: "success", text1: "Budget name updated" });
      } else {
        Toast.show({ type: "error", text1: "Failed to update budget name" });
      }
    } finally {
      setIsSavingBudgetName(false);
      onSave?.();
    }
  }
  return (
    <View className="items-center w-full h-fit gap-4 mb-4">
      {budgetMeta && mode === "edit" && (
        <View className="w-full items-center gap-[3px]">
          <MyText className="text-my-black-base">Budget name: {budgetMeta.name}</MyText>
          <Btn color="gold" text="Edit Name" onPress={() => setEditingBudgetName(true)} />
        </View>
      )}
      {editingBudgetName && (
        <Modal>
          <View className="justify-center gap-2 w-full flex-1 bg-my-black-base">
            <View className="items-center gap-2 w-full h-fit m-auto">
              <MyText className="text-my-white-dark">Update Name</MyText>
              <Input
                id="budget-name-edit"
                label=""
                placeholder="Budget name"
                value={budgetNameInput}
                onChange={(e) => setBudgetNameInput(e)}
              />
              <Btn
                text="Save"
                color="green"
                onPress={handleSaveBudgetName}
                disabled={isSavingBudgetName || !budgetNameInput.trim()}
              />
              <Btn
                text="Cancel"
                color="red"
                onPress={() => {
                  setEditingBudgetName(false);
                  setBudgetNameInput("");
                }}
              />
            </View>
          </View>
        </Modal>
      )}
      {mode === "edit" && onEditRemainingBalance && (
        <Btn color="gold" text="Edit Remaining Balance" onPress={onEditRemainingBalance} />
      )}
      {showIntervalSelector ? (
        <Modal>
          <View className="bg-my-black-base w-full h-full justify-center">
            <View className="h-fit w-full">
              <IntervalSelector
                value={intervalValue}
                onChange={(e) => handleIntervalChange(e)}
                label={intervalLabel ?? (mode === "create" ? "Pay period interval" : undefined)}
              />
              <Btn color="red" text="Go Back" onPress={() => setShowIntervalSelector(false)} />
            </View>
          </View>
        </Modal>
      ) : (
        <View className="w-full items-center gap-[3px]">
          <MyText className="text-my-black-base">Budget Interval: {payPeriodInterval?.toLowerCase()}</MyText>
          <Btn color="gold" text="Edit Interval" onPress={() => setShowIntervalSelector(true)} />
        </View>
      )}
      {showPayDateCalendar ? (
        <Modal>
          <View className="bg-my-black-base w-full h-full justify-center">
            <View className="w-full h-fit gap-4">
              <Calendar
                markedDates={{
                  [newPaymentDate]: {
                    selected: true,
                    selectedColor: "#fcca68",
                  },
                }}
                theme={{
                  calendarBackground: "#fff2d9",
                  textSectionTitleColor: "#b6c1cd",
                  selectedDayTextColor: "#fff2d9",
                  todayTextColor: "#00adf5",
                  dayTextColor: "#2d4150",
                  textDisabledColor: "#d9e1e8",
                  arrowColor: "orange",
                  monthTextColor: "#038894",
                  indicatorColor: "#038894",
                  textDayFontFamily: "monospace",
                  textMonthFontFamily: "monospace",
                  textDayHeaderFontFamily: "monospace",
                  textDayFontSize: 16,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 16,
                }}
                onDayPress={(d) => {
                  setShowPayDateCalendar(false);
                  onPayDateChange(d);
                  onSave?.();
                }}
                date={newPaymentDate}
              />
              <Btn color="red" text="Go Back" onPress={() => setShowPayDateCalendar(false)} />
            </View>
          </View>
        </Modal>
      ) : (
        <View className="w-full items-center gap-[3px]">
          <MyText className="text-my-black-base">Paydate: {payDate?.toDateString()}</MyText>
          <Btn text="Change Pay Date" color="gold" onPress={() => setShowPayDateCalendar(true)} />
        </View>
      )}
    </View>
  );
}
