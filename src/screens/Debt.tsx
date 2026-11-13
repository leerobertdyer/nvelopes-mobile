import { useCallback, useEffect, useRef, useState } from "react";
import Loading from "../components/Loading";
import Header from "../components/Nav/Header";
import {
  addTransaction,
  editDatabaseWithTransaction,
  editPayments,
  editSnowballTargetPaymentId,
  editTotalSpendingBudget,
} from "../firebase/editData";
import { format, parse } from "date-fns";
import Entypo from "@expo/vector-icons/Entypo";
import PaymentForm from "../components/Forms/PaymentForm";
import CongratsPaidOffModal from "../components/Payments/CongratsPaidOffModal";
import { useAuth } from "../context/AuthContext/useAuth";
import { useBudget } from "../context/BudgetContext/useBudget";
import Toast from "react-native-toast-message";
import { Payment } from "../types";
import { useDatabase } from "../context/DatabaseContext/useDatabase";
import {
  applyPayoffSurplusToTarget,
  calculatePayoffDate,
  calculateSnowballPayoffDate,
  createTransactionId,
  getRemainingDebtsForSnowball,
  paymentsTotal,
  removeVirtualIdPortion,
  rollSnowballOnPayoff,
  setSnowballAmount,
  type SurplusDisposition,
} from "../util/util";
import MoneyInput from "../components/Payments/MoneyInput";
import { MyText } from "../components/MyText";
import Btn from "../components/Buttons/Btn";
import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import {
  getSnowballAmount,
  getSnowballName,
  getSnowballPayment,
  isSnowballPayment,
} from "../util/paymentUtils";
import BigPayment from "../components/Payments/BigPayment";
import firestore from "@react-native-firebase/firestore";

interface iDebtGrid {
  name: string;
  interest: string;
  owed: string;
  color?: string;
  paymentsLeft?: string;
  payOffDate?: string;
}

function DebtGrid({
  name,
  interest,
  owed,
  color,
  paymentsLeft,
  payOffDate,
}: iDebtGrid) {
  return (
    <View className="flex-row w-[90%] items-center">
      <MyText className={`flex-[3] text-left text-xs text-${color}`}>
        {name}
      </MyText>
      <MyText className={`flex-[1] text-center text-xs text-${color}`}>
        {interest}
      </MyText>
      <MyText className={`flex-[1] text-right text-xs text-${color}`}>
        {owed}
      </MyText>
      {paymentsLeft && (
        <MyText className={`flex-[2] text-right text-xs text-${color}`}>
          {paymentsLeft}
        </MyText>
      )}
      {payOffDate && (
        <MyText className={`flex-[2] text-right text-xs text-${color}`}>
          {payOffDate}
        </MyText>
      )}
    </View>
  );
}

function InterestRateInput({
  d,
  onSave,
}: {
  d: Payment;
  onSave: (d: Payment, rate: number) => void;
}) {
  const [value, setValue] = useState(
    d.interestRate ? String(d.interestRate) : "",
  );

  return (
    <TextInput
      style={{ height: 24, padding: 0, fontSize: 11, textAlign: "center" }}
      className="bg-my-white-light border-2 border-my-white-dark rounded-md w-[2rem] m-auto text-my-black-dark"
      value={value}
      onChangeText={(text) => {
        const num = Number(text);
        if (num < 0 || num > 100) return;
        setValue(text);
      }}
      onBlur={() => {
        const num = Number(value);
        if (!isNaN(num)) onSave(d, num);
      }}
      keyboardType="number-pad"
      placeholder="0"
    />
  );
}

export default function Debt() {
  const { user } = useAuth();
  const { activeBudgetId } = useBudget();
  const {
    payments,
    setPayments,
    payPeriodInterval,
    payDate,
    snowballTargetPaymentId,
    setSnowballTargetPaymentId,
    totalSpendingBudget,
    setTotalSpendingBudget,
  } = useDatabase();
  const { remainingDebt } = paymentsTotal(
    payments,
    payPeriodInterval,
    payDate ?? null,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [debtsMissingInfo, setDebtsMissingInfo] = useState<Payment[]>([]);
  const [debts, setDebts] = useState<Payment[]>([]);
  const [paidOffDebts, setPaidOffDebts] = useState<Payment[]>([]);
  const [showMissingInfoDebts, setShowMissingInfoDebts] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Payment | null>(null);
  const [extraMonthly, setExtraMonthly] = useState(0);
  const [showEditSnowball, setShowEditSnowball] = useState(false);
  const [debtMenuOpen, setDebtMenuOpen] = useState<Payment | null>(null);
  const [payoffWarningDebtId, setPayoffWarningDebtId] = useState<string | null>(
    null,
  );
  const [additionalPaymentDebt, setAdditionalPaymentDebt] =
    useState<Payment | null>(null);
  const [additionalPaymentAmount, setAdditionalPaymentAmount] = useState(0);
  const [pendingPayoff, setPendingPayoff] = useState<{
    paidOffPayment: Payment;
    paymentsAtPayoff: Payment[];
    /** Amount the payment exceeded the debt's remaining balance by, still awaiting a disposition. */
    remainder: number;
  } | null>(null);
  const [showDeletePayment, setShowDeletePayment] = useState(false);
  const [showSnowballTarget, setShowSnowballTarget] = useState(false);
  const [newSnowballAmount, setNewSnowballAmount] = useState(
    getSnowballAmount(payments),
  );

  // Keep the edit form's default in sync once payments load/change (e.g. after a roll).
  useEffect(() => {
    setNewSnowballAmount(getSnowballAmount(payments));
  }, [payments]);

  function debtHasAllValues(d: Payment) {
    return (
      typeof d.total === "number" &&
      typeof d.amount === "number" &&
      typeof d.interestRate === "number"
    );
  }

  const updatedPayOffDates = useRef(false);
  const previousEditingDebtRef = useRef<Payment | null>(null);

  const updateAllPayOffDatesIfNeeded = useCallback(async () => {
    if (!payments?.length || !user?.uid) return;

    let changed = false;

    const nextPayments = payments.map((p) => {
      if (p.type !== "DEBT") return p;

      const resp = calculatePayoffDate(p);
      if (!resp) return p;
      const { payOffDate, paymentsLeft } = resp;

      const next = payOffDate ? format(payOffDate, "MMM do, yyyy") : undefined;

      if (next !== p.payOffDate) changed = true;
      if (paymentsLeft !== p.paymentsLeft) changed = true;
      return { ...p, payOffDate: next, paymentsLeft };
    });

    if (!changed) return;
    setPayments(nextPayments);
    await editPayments(nextPayments, activeBudgetId!);
  }, [payments, user?.uid, setPayments]);

  useEffect(() => {
    if (updatedPayOffDates.current) return;
    if (!payments?.length || !user?.uid) return;

    updatedPayOffDates.current = true;
    updateAllPayOffDatesIfNeeded();
  }, [payments, user?.uid, updateAllPayOffDatesIfNeeded]);

  // When returning from edit form, recalc payoff dates so UI shows latest
  useEffect(() => {
    if (
      previousEditingDebtRef.current !== null &&
      editingDebt === null &&
      payments?.length &&
      user?.uid
    ) {
      updatedPayOffDates.current = false;
      updateAllPayOffDatesIfNeeded();
      updatedPayOffDates.current = true;
    }
    previousEditingDebtRef.current = editingDebt;
  }, [editingDebt, payments?.length, user?.uid, updateAllPayOffDatesIfNeeded]);

  useEffect(() => {
    const nextMissingInfo: Payment[] = [];
    const nextDebts: Payment[] = [];
    const nextPaidOff: Payment[] = [];

    for (const p of payments) {
      if (p.type === "DEBT") {
        if (isSnowballPayment(p)) continue;
        if (p.total != null && p.total <= 0 && p.originalTotal) {
          nextPaidOff.push(p);
          continue;
        }
        if (!debtHasAllValues(p)) {
          nextMissingInfo.push(p);
          continue;
        }

        nextDebts.push(p);
      }
    }

    setDebtsMissingInfo(nextMissingInfo);
    setDebts(nextDebts);
    setPaidOffDebts(nextPaidOff);
    setIsLoading(false);
  }, [payments]);

  async function handleUpdateSnowball(n: number) {
    if (!user || !activeBudgetId) return;
    const newPayments = setSnowballAmount(payments, n, payDate);
    setPayments(newPayments);
    setNewSnowballAmount(n);
    await editDatabaseWithTransaction({
      t: {
        id: createTransactionId(user),
        type: "SNOWBALL",
        createdAt: firestore.Timestamp.now(),
        amount: n,
        description: `Manually set snowball to $${n}`,
        createdBy: user.email ?? user.uid,
      },
      budgetId: activeBudgetId,
      func: () => editPayments(newPayments, activeBudgetId),
    });
    setShowEditSnowball(false);
  }

  async function saveDebtInformation(d: Payment) {
    const nextPayments = payments.map((p) => {
      if (p.id === d.id) return d;
      return p;
    });
    await editPayments(nextPayments, activeBudgetId!);
    setPayments(nextPayments);
    Toast.show({ type: "success", text1: "Debt updated" });
  }

  async function deleteBill() {
    if (!user || !debtMenuOpen) return;
    const originalPaymentToEditId = removeVirtualIdPortion(debtMenuOpen);
    const updatedPayments = payments.filter((p) => {
      const originalPId = removeVirtualIdPortion(p);
      return originalPId !== originalPaymentToEditId;
    });
    setPayments(updatedPayments);
    await editDatabaseWithTransaction({
      t: {
        id: createTransactionId(user),
        type: "DELETE",
        createdAt: firestore.Timestamp.now(),
        description: `Deleted debt ${debtMenuOpen.name}`,
        createdBy: user.email ?? user.uid,
      },
      budgetId: activeBudgetId!,
      func: () => editPayments(updatedPayments, activeBudgetId!),
    });
    setDebtMenuOpen(null);
    Toast.show({ type: "success", text1: "Payment deleted" });
  }

  const effectiveSnowballTargetId =
    snowballTargetPaymentId &&
    debts.some((d) => d.id === snowballTargetPaymentId)
      ? snowballTargetPaymentId
      : debts.length > 0
        ? ([...debts].sort((a, b) => (a.total ?? 0) - (b.total ?? 0))[0]?.id ??
          null)
        : null;

  async function handleSnowballTargetChange(debtId: string) {
    if (!user) return;
    try {
      setSnowballTargetPaymentId(debtId);
      const debt = payments.find((p) => p.id === debtId);
      await editDatabaseWithTransaction({
        t: {
          id: createTransactionId(user),
          type: "SNOWBALL",
          createdAt: firestore.Timestamp.now(),
          nvelopeOrPaymentId: debt?.id,
          description: `Snowball target changed to ${debt?.name}`,
          createdBy: user.email ?? user.uid,
        },
        budgetId: activeBudgetId!,
        func: () => editSnowballTargetPaymentId(activeBudgetId!, debtId),
      });
      Toast.show({ type: "success", text1: "Snowball target updated" });
      setShowSnowballTarget(false);
    } catch (error) {
      console.error(`There was an issue changing snowball targets: ${error}`);
      Toast.show({
        type: "error",
        text1: `There was an issue changing snowball targets: ${error}`,
      });
    }
  }

  async function handleApplyAdditionalPayment() {
    const debt = additionalPaymentDebt;
    if (!debt || !activeBudgetId || !user) return;
    const amount = additionalPaymentAmount;
    if (amount <= 0) {
      Toast.show({ type: "error", text1: "Enter a valid amount" });
      return;
    }
    const currentTotal = debt.total ?? 0;
    const newTotal = Math.max(0, currentTotal - amount);
    const updatedPayments = (payments ?? []).map((p) =>
      p.id === debt.id ? { ...p, total: newTotal } : p,
    );
    setPayments(updatedPayments);
    await editDatabaseWithTransaction({
      t: {
        id: createTransactionId(user),
        type: "EXTRA",
        createdAt: firestore.Timestamp.now(),
        nvelopeOrPaymentId: debt.id,
        description: `Extra payment of $${additionalPaymentAmount} applied to ${debt?.name}`,
        createdBy: user.email ?? user.uid,
      },
      budgetId: activeBudgetId!,
      func: () => editPayments(updatedPayments, activeBudgetId),
    });
    setAdditionalPaymentDebt(null);
    setAdditionalPaymentAmount(0);
    if (newTotal <= 0 && debt.amount != null) {
      const paidOffPayment = updatedPayments.find((p) => p.id === debt.id)!;
      await addTransaction(
        {
          id: createTransactionId(user),
          type: "PAID_OFF",
          createdAt: firestore.Timestamp.now(),
          nvelopeOrPaymentId: debt.id,
          description: `Extra payment of $${amount} paid off "${debt.name}"`,
          createdBy: user.email ?? user.uid,
        },
        activeBudgetId,
      );
      setPendingPayoff({
        paidOffPayment,
        paymentsAtPayoff: updatedPayments,
        remainder: 0,
      });
    }
    Toast.show({ type: "success", text1: "Payment applied" });
  }

  const payoffCandidates = pendingPayoff
    ? getRemainingDebtsForSnowball(
        pendingPayoff.paymentsAtPayoff,
        pendingPayoff.paidOffPayment.id,
      )
    : [];

  async function handleConfirmPayoff(choice: {
    roll: boolean;
    targetId: string | null;
    surplus: SurplusDisposition;
  }) {
    if (!pendingPayoff || !user || !activeBudgetId) return;
    const { paidOffPayment, paymentsAtPayoff, remainder } = pendingPayoff;
    const { roll, targetId, surplus } = choice;

    let workingPayments = paymentsAtPayoff;

    if (roll && targetId) {
      workingPayments = rollSnowballOnPayoff(
        workingPayments,
        paidOffPayment,
        payDate,
      );
      const nextTarget = workingPayments.find((p) => p.id === targetId);
      setSnowballTargetPaymentId(targetId);
      await addTransaction(
        {
          id: createTransactionId(user),
          type: "SNOWBALL",
          createdAt: firestore.Timestamp.now(),
          nvelopeOrPaymentId: paidOffPayment.id,
          description: `Rolled "${paidOffPayment.name}"'s payment into the snowball, targeting "${nextTarget?.name}"`,
          createdBy: user.email ?? user.uid,
        },
        activeBudgetId,
      );
      await editSnowballTargetPaymentId(activeBudgetId, targetId);
    }

    let cascadePayoff: typeof pendingPayoff | null = null;

    if (remainder > 0 && surplus === "availableBudget") {
      const newBudget = totalSpendingBudget + remainder;
      setTotalSpendingBudget(newBudget);
      await addTransaction(
        {
          id: createTransactionId(user),
          type: "SNOWBALL",
          createdAt: firestore.Timestamp.now(),
          nvelopeOrPaymentId: paidOffPayment.id,
          description: `Snowball exceeded final payment. Applied $${remainder.toFixed(2)} to available budget`,
          createdBy: user.email ?? user.uid,
        },
        activeBudgetId,
      );
      await editTotalSpendingBudget(newBudget, activeBudgetId);
      Toast.show({
        type: "success",
        text1: `$${remainder.toFixed(2)} returned to budget`,
      });
    } else if (remainder > 0 && surplus === "nextTarget" && targetId) {
      const result = applyPayoffSurplusToTarget(
        workingPayments,
        targetId,
        remainder,
      );
      workingPayments = result.payments;
      await addTransaction(
        {
          id: createTransactionId(user),
          type: "EXTRA",
          createdAt: firestore.Timestamp.now(),
          nvelopeOrPaymentId: targetId,
          description: `Applied $${result.applied.toFixed(2)} snowball surplus to "${paymentsAtPayoff.find((p) => p.id === targetId)?.name}"`,
          createdBy: user.email ?? user.uid,
        },
        activeBudgetId,
      );
      Toast.show({
        type: "success",
        text1: `$${result.applied.toFixed(2)} applied to next target`,
      });
      if (result.paidOff) {
        await addTransaction(
          {
            id: createTransactionId(user),
            type: "PAID_OFF",
            createdAt: firestore.Timestamp.now(),
            nvelopeOrPaymentId: result.paidOff.id,
            description: `Paid off "${result.paidOff.name}"`,
            createdBy: user.email ?? user.uid,
          },
          activeBudgetId,
        );
        cascadePayoff = {
          paidOffPayment: result.paidOff,
          paymentsAtPayoff: workingPayments,
          remainder: result.leftover,
        };
      }
    }

    setPayments(workingPayments);
    await editPayments(workingPayments, activeBudgetId);
    setPendingPayoff(cascadePayoff);
  }

  function handleDeclinePayoffRoll() {
    setPendingPayoff(null);
  }

  function handleDeleteBill(p: Payment) {
    setDebtMenuOpen(p);
    setShowDeletePayment(true);
  }

  if (showDeletePayment && payDate && debtMenuOpen) {
    return (
      <View className="w-full h-full m-auto bg-my-black-dark items-center justify-center">
        <View className="w-full h-[50%] justify-center items-center p-4">
          <MyText className="p-4 rounded-md text-my-white-dark w-full text-center">
            Are you sure you want to delete "{debtMenuOpen.name}"?
          </MyText>
          <MyText className="text-xs text-my-white-light text-center mb-4">
            Removing this debt will not change your available budget.
          </MyText>
          <View className="flex gap-2 items-center justify-center w-[95%]">
            <Btn
              text="Delete"
              color="gold"
              onPress={() => {
                deleteBill();
                setShowDeletePayment(false);
                setDebtMenuOpen(null);
              }}
            />
            <Btn
              text="Go Back"
              color="red"
              onPress={() => {
                setShowDeletePayment(false);
                setDebtMenuOpen(null);
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  if (isLoading) return <Loading text="Crunching Numbers" />;

  if (showEditSnowball) {
    return (
      <View className="w-screen h-full bg-my-blue-dark pt-[4rem]">
        <View className="justify-center items-center gap-2 w-full">
          <MoneyInput
            id="newSnowballAmount"
            label="Snowball Amount"
            value={newSnowballAmount}
            onChange={(n) => setNewSnowballAmount(Number(n))}
            placeholder={`$${getSnowballAmount(payments).toFixed(2)}`}
          />
          <Btn
            color="gold"
            onPress={() => handleUpdateSnowball(newSnowballAmount)}
            text="Save"
          />
          <Btn
            color="red"
            onPress={() => setShowEditSnowball(false)}
            text="Go Back"
          />
        </View>
      </View>
    );
  }

  if (additionalPaymentDebt) {
    const debt = additionalPaymentDebt;
    const maxPay = debt.total ?? 0;
    return (
      <View className="w-screen h-full bg-my-black-dark justify-center">
        <View className="h-fit m-auto items-center justify-center text-center w-full gap-2">
          <MyText className="text-my-white-light mb-2">
            Additional payment
          </MyText>
          <MyText className="text-my-white-dark text-sm mb-4">
            {debt.name}
          </MyText>
          <MyText className="text-my-white-dark text-xs mb-2">
            Remaining: ${maxPay.toFixed(2)}
          </MyText>
          <MoneyInput
            id="additional-payment-amount"
            label="Amount"
            value={additionalPaymentAmount}
            onChange={setAdditionalPaymentAmount}
            placeholder="$0"
          />
          <Btn
            color="green"
            onPress={handleApplyAdditionalPayment}
            text="Apply"
          />
          <Btn
            color="red"
            onPress={() => {
              setAdditionalPaymentDebt(null);
              setAdditionalPaymentAmount(0);
            }}
            text="Cancel"
          />
        </View>
      </View>
    );
  }

  if (debtMenuOpen) {
    const d = debtMenuOpen;
    return (
      <BigPayment
        handleUpdatePaid={null}
        handleDeleteBill={handleDeleteBill}
        handleBack={() => setDebtMenuOpen(null)}
        resetState={() => setDebtMenuOpen(null)}
        paymentToEdit={d}
      />
    );
  }

  if (editingDebt && user) {
    return (
      <PaymentForm
        paymentToEdit={editingDebt}
        user={user}
        handleBack={() => setEditingDebt(null)}
      />
    );
  }

  // Final payoff date = when the last debt is paid off (max of per-debt payoff dates)
  const payoffDatesParsed = debts
    .map((d) =>
      d.payOffDate ? parse(d.payOffDate, "MMM do, yyyy", new Date()) : null,
    )
    .filter((d): d is Date => d !== null);
  const finalPaymentDate =
    payoffDatesParsed.length > 0
      ? new Date(Math.max(...payoffDatesParsed.map((d) => d.getTime())))
      : new Date();
  const finalPaymentDateStr = format(finalPaymentDate, "MMM yyyy");

  const snowballPayoffDate = calculateSnowballPayoffDate(
    debts,
    getSnowballAmount(payments),
    effectiveSnowballTargetId,
    new Date(),
    extraMonthly || undefined,
  );
  const snowballPayoffDateStr = snowballPayoffDate
    ? format(snowballPayoffDate, "MMM yyyy")
    : null;

  return (
    <View className="w-full h-full bg-my-blue-dark py-4">
      <ScrollView
        contentContainerClassName="items-center"
        className="w-full h-full my-0 py-[3rem] bg-my-blue-dark"
      >
        <View className="bg-my-black-base/40 p-2 rounded-md w-[80%] mb-[1rem] items-center gap-2">
          <MyText className="text-my-white-dark text-xl">TOTAL DEBT</MyText>
          <MyText className="text-my-red-dark mb-[.75rem] bg-my-white-dark p-2 rounded-md">
            ${remainingDebt.toFixed(2)}
          </MyText>
          <MyText className="text-my-blue-base">
            <MyText className="text-my-white-light">Payoff Date:</MyText>{" "}
            {finalPaymentDateStr}
          </MyText>
          {snowballPayoffDateStr && (
            <MyText
              className={`${extraMonthly && "border-2 border-white p-2 rounded-sm"} text-my-green-light`}
            >
              <MyText className={"text-my-white-light"}>With snowball:</MyText>{" "}
              {snowballPayoffDateStr}
            </MyText>
          )}
          {debts.length > 0 && (
            <View className="bg-my-black-base/40 p-2 rounded-md text-my-white-light mb-[1rem] w-[80%] md:w-[24rem]">
              <MyText className="text-my-white-dark text-sm font-medium mb-2 text-center">
                What if you pay extra each month?
              </MyText>
              <View className="items-center gap-2 mb-2">
                <MoneyInput
                  id="extra-monthly"
                  label=""
                  placeholder="e.g. 400"
                  value={extraMonthly}
                  onChange={setExtraMonthly}
                />
              </View>
            </View>
          )}
        </View>

        {debtsMissingInfo.length > 0 && (
          <View className="items-center bg-my-black-base/40 p-2 rounded-md w-[80%] m-auto mb-[1rem]">
            <MyText className="text-my-red-dark bg-my-white-dark px-2 rounded-md">
              Missing Information on {debtsMissingInfo.length} debts:
            </MyText>
            {showMissingInfoDebts ? (
              <View className="w-full mt-8">
                <DebtGrid
                  name="Name"
                  interest="Interest"
                  owed="Owed"
                  color="my-white-dark"
                />
                {debtsMissingInfo.map((d: Payment) => (
                  <View
                    key={d.id}
                    className="px-1 mx-1 flex-row border-b-2 border-white pt-2 pb-4"
                  >
                    <MyText className="text-my-white-light col-span-3 text-left flex-[2]">
                      {d.name}
                    </MyText>
                    {d.interestRate ? (
                      <MyText className="text-my-white-light col-span-1 text-center mb-2 flex-[1]">
                        {d.interestRate}
                      </MyText>
                    ) : (
                      <View className="flex-[1] h-[.4rem] mt-[3px] ml-[4px]">
                        <InterestRateInput
                          d={d}
                          onSave={(debt, rate) =>
                            saveDebtInformation({ ...debt, interestRate: rate })
                          }
                        />{" "}
                      </View>
                    )}
                    <MyText className="text-my-white-light col-span-1 text-center flex-[1]">
                      ${d.total}
                    </MyText>
                  </View>
                ))}
                <Pressable
                  onPress={() => setShowMissingInfoDebts(false)}
                  className="w-full items-center mt-8"
                >
                  <Entypo
                    name={"chevron-up"}
                    size={20}
                    color="#fcca68"
                    className="px-2"
                  />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setShowMissingInfoDebts(true)}
                className="w-full items-center mt-4"
              >
                <Entypo
                  name={"chevron-down"}
                  size={20}
                  color="#fcca68"
                  className="px-2"
                />
              </Pressable>
            )}
          </View>
        )}
        <View className="bg-my-black-base/40 p-2 rounded-md text-my-blue-light mb-[1rem] w-[80%] items-center justify-between gap-4 px-3 py-6">
          <MyText className="text-my-white-light">❄️ Snowball ❄️</MyText>
          <View className="flex-row items-center justify-between w-[70%] gap-4">
            <MyText className="text-my-white-light">
              {getSnowballName(payments, snowballTargetPaymentId ?? "")}
            </MyText>
            <Pressable
              onPress={() => setShowSnowballTarget(!showSnowballTarget)}
            >
              <MyText className="text-my-blue-light underline text-sm">
                Edit
              </MyText>
            </Pressable>
          </View>
          <View className="flex items-center justify-between gap-2">
            <View className="flex-row items-center justify-between w-[70%] gap-4">
              <MyText className="text-my-white-dark">
                ${getSnowballAmount(payments).toFixed(2)}
              </MyText>
              <Pressable onPress={() => setShowEditSnowball(true)}>
                <MyText className="text-my-blue-light text-sm underline">
                  Edit
                </MyText>
              </Pressable>
            </View>
          </View>
        </View>
        {debts.length > 0 &&
          (() => {
            const debtsByLowestOwed = [...debts]
              .filter((d) => d.total! > 0)
              .sort((a, b) => (a.total ?? 0) - (b.total ?? 0));
            return (
              <View className="bg-my-black-base/40 p-4 rounded-md w-[100%] m-auto">
                <View className="gap-2 mb-4 items-center">
                  <MyText className="text-my-white-light mb-2">Debts</MyText>
                  {debtsByLowestOwed.length > 1 && showSnowballTarget ? (
                    <Picker
                      id="snowball-target"
                      selectedValue={effectiveSnowballTargetId ?? ""}
                      onValueChange={(e) => {
                        const id = e as string;
                        if (id) handleSnowballTargetChange(id);
                      }}
                      style={{
                        width: "80%",
                        backgroundColor: "#fff2d9",
                        borderRadius: 9,
                      }}
                    >
                      {debtsByLowestOwed.map((d) => (
                        <Picker.Item
                          key={d.id}
                          value={d.id}
                          label={
                            d.name + " - $" + `${d.total?.toFixed(0) ?? "0"}`
                          }
                        />
                      ))}
                    </Picker>
                  ) : (
                    debtsByLowestOwed.length === 1 && (
                      <MyText className="text-gray-400 text-center">
                        "{debtsByLowestOwed[0].name}"
                      </MyText>
                    )
                  )}
                </View>
                <View className="w-full flex-row justify-between">
                  <MyText className="w-[40%] text-my-white-dark text-xs">
                    Name
                  </MyText>
                  <MyText className="w-[30%] text-my-white-dark text-xs text-right pr-4">
                    Interest
                  </MyText>
                  <MyText className="w-[30%] text-my-white-dark text-xs text-right">
                    Remainder
                  </MyText>
                </View>
                {debtsByLowestOwed.map((d: Payment) => {
                  const cannotPayOff =
                    d.paymentsLeft == null || d.payOffDate == null;
                  return (
                    <Pressable key={d.id} onPress={() => setDebtMenuOpen(d)}>
                      <View className="border-y-2 border-my-white-dark my-2 w-full py-2">
                        <View className="w-full flex-row justify-center gap-12">
                          <View className="w-[40%] flex-row items-center justify-center gap-1">
                            <MyText
                              className={`text-center text-sm ${d.id === effectiveSnowballTargetId ? "text-my-blue-light" : "text-my-white-light"}`}
                            >
                              {d.id === effectiveSnowballTargetId
                                ? `❄️ ${d.name} ❄️`
                                : d.name}
                            </MyText>
                            {cannotPayOff && (
                              <Pressable
                                onPress={() => setPayoffWarningDebtId(d.id)}
                                hitSlop={8}
                              >
                                <Entypo
                                  name="warning"
                                  size={14}
                                  color="#f87171"
                                />
                              </Pressable>
                            )}
                          </View>
                          <MyText className="text-center text-my-white-light w-[20%]">
                            {d.interestRate != null
                              ? d.interestRate.toString() + " %"
                              : "—"}
                          </MyText>
                          <MyText className="text-center text-my-white-light w-[20%]">
                            {`$${d.total?.toFixed(0) ?? ""}`}
                          </MyText>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            );
          })()}

        {payoffWarningDebtId &&
          (() => {
            const warningDebt = debts.find((d) => d.id === payoffWarningDebtId);
            if (!warningDebt) return null;
            return (
              <Modal transparent animationType="fade">
                <Pressable
                  className="flex-1 bg-my-black-dark/80 items-center justify-center p-4"
                  onPress={() => setPayoffWarningDebtId(null)}
                >
                  <Pressable
                    className="bg-my-black-base border-2 border-my-red-light rounded-md p-4 max-w-[24rem] items-center gap-2"
                    onPress={() => {}}
                  >
                    <Entypo name="warning" size={28} color="#f87171" />
                    <MyText className="text-my-white-light text-sm text-center">
                      Payoff cannot be calculated for "{warningDebt.name}". Your
                      minimum payment may be too low to cover interest – try
                      increasing the payment amount.
                    </MyText>
                    <Pressable onPress={() => setPayoffWarningDebtId(null)}>
                      <MyText className="text-my-blue-light underline text-sm mt-2">
                        Got it
                      </MyText>
                    </Pressable>
                  </Pressable>
                </Pressable>
              </Modal>
            );
          })()}

        {paidOffDebts.length > 0 && (
          <View className="text-my-white-light bg-my-black-base/40 p-4 rounded-md w-[80%] md:w-[30rem] margin-auto mt-[1rem]">
            <MyText className="text-my-white-dark text-sm text-center">
              Paid Off
            </MyText>
            <MyText className="text-my-green-base w-full text-center text-sm mb-4">
              Total: $
              {paidOffDebts.reduce((acc, d) => d.originalTotal! + acc, 0)}
            </MyText>
            {paidOffDebts.map((d) => (
              <View
                key={d.id + new Date().getMilliseconds()}
                className="flex-row w-[15rem] m-auto justify-center gap-4"
              >
                <MyText className="text-my-white-light">{d.name}</MyText>
                <MyText key={d.id} className="text-my-white-light">
                  ${d.originalTotal}
                </MyText>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      {pendingPayoff && (
        <CongratsPaidOffModal
          // Remount on each payoff (including cascades) so the roll/target/surplus
          // choices don't carry stale state from the previous debt.
          key={pendingPayoff.paidOffPayment.id}
          debtName={pendingPayoff.paidOffPayment.name}
          freedUpAmount={pendingPayoff.paidOffPayment.amount ?? 0}
          remainder={pendingPayoff.remainder}
          candidates={payoffCandidates}
          defaultTargetId={payoffCandidates[0]?.id ?? null}
          onConfirm={handleConfirmPayoff}
          onDecline={handleDeclinePayoffRoll}
        />
      )}
    </View>
  );
}
