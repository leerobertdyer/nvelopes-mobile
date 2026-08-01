import { Calendar, DateData } from "react-native-calendars";
import { BIWEEKLY, MONTHLY, SPLIT, WEEKLY, YEARLY } from "../../constants";
import type { Interval, Payment } from "../../types";
import { useState } from "react";
import { editPayments } from "../../firebase/editData";
import { generateFreshPayment, removeVirtualIdPortion } from "../../util/util";
import { format, addDays } from "date-fns";
import PaymentTypeSelector, {
  type PaymentTypeOption,
} from "./PaymentTypeSelector";
import { Pressable, ScrollView, View } from "react-native";
import Input from "../Input";
import { useBudget } from "../../context/BudgetContext/useBudget";
import { useDatabase } from "../../context/DatabaseContext/useDatabase";
import MoneyInput from "../Payments/MoneyInput";
import Btn from "../Buttons/Btn";
import { Picker } from "@react-native-picker/picker";
import { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { MyText } from "../MyText";
import firestore from "@react-native-firebase/firestore";
import Toast from "react-native-toast-message";

type User = FirebaseAuthTypes.User;
const { Timestamp } = firestore;

interface IPaymentForm {
  paymentToEdit: Payment | null;
  user: User;
  handleBack: () => void;
  /** Called when a payment is updated in place (e.g. Pay extra on a debt). Optional. */
  onPaymentUpdated?: (payment: Payment) => void;
}

export default function PaymentForm({
  paymentToEdit,
  user,
  handleBack,
}: IPaymentForm) {
  const { activeBudgetId } = useBudget();
  const { payDate, payPeriodInterval, payments, setPayments } = useDatabase();

  const [newPaymentDate, setNewPaymentDate] = useState<string>(
    paymentToEdit?.dueDate.toDate()
      ? format(paymentToEdit.dueDate.toDate(), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd"), // Default to today's date string if it's a brand new payment
  );
  const [newPayment, setNewPayment] = useState<Payment>(
    paymentToEdit ?? generateFreshPayment(),
  );

  // For new payments, start with type selection
  const [selectedPaymentType, setSelectedPaymentType] =
    useState<PaymentTypeOption | null>(
      paymentToEdit ? getPaymentTypeFromPayment(paymentToEdit) : null,
    );

  // Track if user wants to split bill across pay periods (for BILL type only)
  const [splitBillAcrossPayPeriods, setSplitBillAcrossPayPeriods] = useState(
    paymentToEdit?.interval === SPLIT && paymentToEdit?.recurring === true,
  );

  // Helper to determine PaymentTypeOption from existing Payment
  function getPaymentTypeFromPayment(p: Payment): PaymentTypeOption {
    if (p.type === "FUND") return "FUND";
    if (p.type === "DEBT") return "DEBT";
    // For BILL with SPLIT interval, it's still a Bill (just split across pay periods)
    return "BILL";
  }

  // Handle payment type selection
  function handleSelectPaymentType(type: PaymentTypeOption) {
    setSelectedPaymentType(type);
    setSplitBillAcrossPayPeriods(false); // Reset split toggle

    switch (type) {
      case "BILL":
        setNewPayment({
          ...newPayment,
          type: "BILL",
          interval: undefined, // Let user choose
          recurring: undefined,
          total: undefined,
        });
        break;
      case "DEBT":
        setNewPayment({
          ...newPayment,
          type: "DEBT",
          interval: undefined, // Let user choose
          recurring: undefined,
        });
        break;
      case "FUND":
        // Fund is a planned expense to save toward - uses SPLIT interval
        setNewPayment({
          ...newPayment,
          type: "FUND",
          interval: SPLIT,
          recurring: false,
          total: newPayment.amount,
        });
        break;
    }
  }

  // Handle toggling split for BILL type
  function handleToggleSplitBill(enabled: boolean) {
    setSplitBillAcrossPayPeriods(enabled);
    if (enabled) {
      setNewPayment({
        ...newPayment,
        interval: SPLIT,
        recurring: true,
      });
    } else {
      setNewPayment({
        ...newPayment,
        interval: undefined,
        recurring: undefined,
      });
    }
  }

  function resetForm() {
    setNewPayment(generateFreshPayment());
    setSelectedPaymentType(null);
    setSplitBillAcrossPayPeriods(false);
  }

  function handleSetNewInterval(i: Interval) {
    setNewPayment({
      ...newPayment,
      interval: i,
      recurring: undefined, // Clear recurring for non-SPLIT intervals
    });
  }
  function handleCalendarChange(d: DateData) {
    const dateString = d.dateString;
    setNewPaymentDate(dateString);

    const [year, month, day] = dateString.split("-").map(Number);
    const localDate = new Date(year, month - 1, day);

    setNewPayment((prev) => ({
      ...prev,
      dueDate: Timestamp.fromDate(localDate),
    }));
  }

  async function editPayment() {
    if (!user || !newPayment || !paymentToEdit) return;
    const originalPaymentToEditId = removeVirtualIdPortion(paymentToEdit);
    setPayments((prev) => {
      const updatedPayments = prev.map((p) => {
        const currentPaymentOriginalId = removeVirtualIdPortion(p);
        return currentPaymentOriginalId === originalPaymentToEditId
          ? { ...newPayment, id: originalPaymentToEditId }
          : p;
      });
      if (activeBudgetId) editPayments(updatedPayments, activeBudgetId);
      return updatedPayments;
    });

    resetForm();
    Toast.show({ type: "success", text1: "Payment updated" });
  }

  async function addPayment() {
    if (!user || !newPayment) return;
    if (payments.some((p) => p.id === newPayment.id)) {
      Toast.show({ type: "error", text1: "Payment name already exists" });
      return;
    }
    let updatedPayments: Payment[] = [];
    if (newPayment.type === "DEBT") {
      updatedPayments = [
        ...payments,
        { ...newPayment, originalTotal: newPayment.total },
      ];
    } else {
      updatedPayments = [...payments, newPayment];
    }
    setPayments(updatedPayments);
    if (!activeBudgetId) return;
    await editPayments(updatedPayments, activeBudgetId);
    Toast.show({ type: "success", text1: "Payment added" });
    resetForm();
  }

  async function handleSavePayment() {
    if (paymentToEdit) await editPayment();
    else await addPayment();
    resetForm();
    handleBack();
  }

  function handleClickBack() {
    resetForm();
    handleBack();
  }

  // Get label for payment type
  function getPaymentTypeLabel(): string {
    switch (selectedPaymentType) {
      case "BILL":
        return splitBillAcrossPayPeriods ? "Bill (Split)" : "Bill";
      case "DEBT":
        return "Debt";
      case "FUND":
        return "Fund";
      default:
        return "";
    }
  }

  // Check if form is complete enough to save
  const canSave =
    selectedPaymentType &&
    newPayment.name &&
    newPayment.amount > 0 &&
    newPayment.interval &&
    newPaymentDate;

  // If type is FUND, minDate is tomorrow. Otherwise, there is no minimum date constraint.
  const minDateString =
    selectedPaymentType === "FUND"
      ? format(addDays(new Date(), 1), "yyyy-MM-dd")
      : undefined;

  const paymentLabel =
    selectedPaymentType === "FUND" ? "Funding Goal" : "Payment Amount";

  return (
    <ScrollView
      className=""
      contentContainerStyle={{
        flexGrow: 1,
      }}
    >
      <View className="gap-2 justify-center text-my-white-dark bg-my-green-dark w-full h-fit text-center px-2 py-8 m-auto">
        <MyText className="text-center w-full text-my-white-light p-2 text-3xl">
          {paymentToEdit ? "Edit Payment" : "Add Payment"}
        </MyText>
        {/* Step 1: Payment Type Selection (for new payments only) */}
        {!selectedPaymentType && !paymentToEdit ? (
          <View className="w-full justify-center px-2 mt-12">
            <PaymentTypeSelector
              onSelect={handleSelectPaymentType}
              onBack={handleClickBack}
            />
          </View>
        ) : (
          <>
            {/* Show current type with option to change */}
            {!paymentToEdit && (
              <View className="w-full items-center gap-[1px] mt-4">
                <MyText className="text-lg text-my-white-light">
                  Type:{" "}
                  <MyText className="font-bold">{getPaymentTypeLabel()}</MyText>
                </MyText>

                <Pressable
                  className="mb-8"
                  onPress={() => setSelectedPaymentType(null)}
                >
                  <MyText className="text-my-blue-light text-xs">
                    (Change)
                  </MyText>
                </Pressable>
              </View>
            )}

            {/* Payment Name */}
            <Input
              id="name"
              value={newPayment?.name.toLowerCase()}
              placeholder="Enter payment name"
              onChange={(e) =>
                setNewPayment({
                  ...newPayment,
                  name: e.toLowerCase(),
                })
              }
            />

            {/* Payment Amount */}
            {newPayment.name && (
              <View className="items-center w-full mb-4">
                <MoneyInput
                  id="amount"
                  label={paymentLabel}
                  value={newPayment?.amount ?? 0}
                  onChange={(amount) => {
                    setNewPayment({
                      ...newPayment,
                      amount,
                      ...(selectedPaymentType === "FUND"
                        ? { total: amount }
                        : {}),
                    });
                  }}
                  placeholder={
                    selectedPaymentType === "FUND"
                      ? "Target amount to save"
                      : "Payment amount"
                  }
                />
                {selectedPaymentType === "FUND" && (
                  <MyText className="text-xs text-my-white-light mt-1">
                    This amount will be split across your pay periods until the
                    target date
                  </MyText>
                )}
                {splitBillAcrossPayPeriods && (
                  <MyText className="text-xs text-my-white-light mt-1">
                    This monthly amount will be split across your pay periods
                  </MyText>
                )}
              </View>
            )}

            {/* Split toggle for BILL type only */}
            {selectedPaymentType === "BILL" &&
              newPayment.name &&
              newPayment.amount > 0 &&
              payPeriodInterval !== ("MONTHLY" as Interval) && (
                <View className="flex-row items-center gap-3 mb-4 w-full justify-center">
                  <MyText className="text-sm w-fit text-my-white-light">
                    Split across pay periods
                  </MyText>

                  <Pressable
                    className={`w-5 h-5 rounded-sm border-2 ${splitBillAcrossPayPeriods ? "bg-black border-white" : "bg-white border-black"}`}
                    onPress={() =>
                      handleToggleSplitBill(!splitBillAcrossPayPeriods)
                    }
                  />
                </View>
              )}

            {/* Due/Target Date */}
            {newPayment.name && newPayment.amount > 0 && (
              <View className="items-center w-full">
                <MyText className="text-my-white-base">
                  {selectedPaymentType === "FUND"
                    ? "Target Date (when you need the money)"
                    : "Due Date"}
                </MyText>
                <View className="text-black rounded-md overflow-hidden border-2 border-my-white-dark text-center bg-my-white-light p-2 w-[70%]">
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
                    onDayPress={handleCalendarChange}
                    date={newPaymentDate}
                    minDate={minDateString}
                  />
                </View>
              </View>
            )}

            {/* Total Owed (for DEBT type only) */}
            {selectedPaymentType === "DEBT" &&
              newPayment.name &&
              newPayment.amount > 0 && (
                <View className="items-center w-full mt-4">
                  <MoneyInput
                    id="total"
                    label="Total Owed"
                    value={newPayment?.total ?? 0}
                    onChange={(total) =>
                      setNewPayment({
                        ...newPayment,
                        total,
                      })
                    }
                    placeholder="Total remaining balance"
                  />
                </View>
              )}

            {/* Interest rate (optional, for DEBT type only) */}
            {selectedPaymentType === "DEBT" &&
              newPayment.name &&
              newPayment.amount > 0 && (
                <View className="items-center w-full mt-4">
                  <MyText className="text-my-white-light">
                    Interest rate (%) – optional
                  </MyText>
                  <Input
                    id="interestRate"
                    numeric
                    // className="w-[80%] max-w-[20rem] border-2 p-2 rounded-md border-my-white-dark bg-my-white-light text-my-black-dark"
                    value={newPayment?.interestRate?.toString() ?? ""}
                    onChange={(e) => {
                      const val = e;
                      setNewPayment({
                        ...newPayment,
                        interestRate: val === "" ? undefined : Number(val),
                      });
                    }}
                    placeholder="e.g. 5.5"
                  />
                </View>
              )}

            {/* Interval selector for BILL (non-split) and DEBT */}
            {((selectedPaymentType === "BILL" && !splitBillAcrossPayPeriods) ||
              selectedPaymentType === "DEBT") &&
              newPayment.name &&
              newPayment.amount > 0 && (
                <View className="items-center w-full mt-4">
                  <MyText className="text-my-white-light">
                    Payment Frequency
                  </MyText>
                  <Picker
                    selectedValue={newPayment.interval || ""}
                    onValueChange={(e) =>
                      handleSetNewInterval(e.toUpperCase() as Interval)
                    }
                    style={{
                      width: "70%",
                      backgroundColor: "#fff2d9",
                      borderRadius: 9,
                    }}
                  >
                    <Picker.Item
                      value=""
                      enabled={false}
                      label="-- Select Frequency --"
                    />
                    <Picker.Item value={MONTHLY} label="Monthly" />
                    <Picker.Item value={WEEKLY} label="Weekly" />
                    <Picker.Item value={BIWEEKLY} label="Bi-Weekly" />
                    <Picker.Item value={YEARLY} label="Yearly" />
                  </Picker>
                </View>
              )}
          </>
        )}
        {/* Save/Back buttons - show when we have enough info */}
        {canSave ? (
          <View className="text-my-black-base pb-8 w-full mt-4">
            <View className="text-center mb-4 p-3 bg-my-white-light rounded-md mx-4 items-center">
              <MyText className="text-my-green-dark font-bold">
                {newPayment?.name}{" "}
                <MyText className="text-my-red-dark">
                  ${newPayment?.amount.toFixed(2)}
                </MyText>
              </MyText>
              <View className="text-sm mt-1">
                {splitBillAcrossPayPeriods ? (
                  <MyText>Monthly amount split across your pay periods</MyText>
                ) : selectedPaymentType === "FUND" ? (
                  <View className="items-center">
                    <MyText>Planned expense due </MyText>
                    <MyText className="text-my-blue-dark">
                      {format(newPayment.dueDate.toDate(), "MMM do, yyyy")}
                    </MyText>
                  </View>
                ) : (
                  <MyText>
                    Due {newPayment.interval?.toLowerCase()} on the{" "}
                    <MyText className="text-my-blue-dark">
                      {format(newPayment.dueDate.toDate(), "do")}
                    </MyText>
                  </MyText>
                )}
              </View>
            </View>
            <View className="gap-4 items-center justify-center w-full">
              <Btn color="gold" text="Save" onPress={handleSavePayment} />
              <Btn
                color="red"
                text="Cancel"
                onPress={() => handleClickBack()}
              />
            </View>
          </View>
        ) : selectedPaymentType ? (
          <View className="mt-4 w-full flex justify-center items-center">
            <Btn color="red" text="Cancel" onPress={() => handleClickBack()} />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
