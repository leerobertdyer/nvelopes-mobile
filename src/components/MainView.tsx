import { useEffect, useMemo, useState } from "react";
import { Interval, ViewContent, type Nvelope, type Payment } from "../types";
import {
  editDatabaseWithTransaction,
  editEnvelopes,
  editPayments,
  editSnowballTargetPaymentId,
  editTotalSpendingBudget,
  resetAllNvelopes,
  updateBudgetStateAndDBB,
} from "../firebase/editData";
import firestore from "@react-native-firebase/firestore";
import {
  createTransactionId,
  deriveIsPaid,
  getVirtualPaymentsForCurrentPeriod,
  randomUUID,
  removeVirtualIdPortion,
} from "../util/util";
import Loading from "./Loading";
import { startOfDay, addMonths } from "date-fns";
import AddIncomeForm from "./Forms/AddIncomeForm";
import { useDatabase } from "../context/DatabaseContext/useDatabase";
import { useAuth } from "../context/AuthContext/useAuth";
import { useBudget } from "../context/BudgetContext/useBudget";
import { Button, Pressable, ScrollView, Text, View } from "react-native";
import SplitPaymentDueModal from "./Payments/SplitPaymentDueModal";
import CongratsPaidOffModal from "./Payments/CongratsPaidOffModal";
import BigPayment from "./Payments/BigPayment";
import PaymentForm from "./Forms/PaymentForm";
import ActionButtons from "./Buttons/ActionButtons";
import PaymentMap from "./Payments/PaymentMap";
import { MyText } from "./MyText";
import Btn from "./Buttons/Btn";
import AddCashToEnvelopeForm from "./Forms/AddCashToEnvelopeForm";
import Header from "./Nav/Header";
import { navigationRef } from "../../App";
import Toast from "react-native-toast-message";
import {
  applyAmountToTotal,
  computeUpdatedPayment,
  getOriginalIdFromVirtualId,
  togglePaidDates,
} from "../util/paymentUtils";
import NvelopesContainer from "./Nvelopes/NvelopesContainer";
import MainEnvelope from "./Nvelopes/MainNvelope";
import { DraxProvider } from "react-native-drax";
import ContentSelector from "./ContentSelector";

export default function MainView() {
  const { user } = useAuth();
  const { activeBudgetId, budgets } = useBudget();
  const activeBudgetName =
    budgets.find((b) => b.id === activeBudgetId)?.name ?? "Budget";
  const {
    totalSpendingBudget,
    setTotalSpendingBudget,
    envelopes,
    setEnvelopes,
    payDate,
    payPeriodInterval,
    snowballTargetPaymentId,
    setSnowballTargetPaymentId,
    payments,
    setPayments,
  } = useDatabase();

  const [paymentToEdit, setPaymentToEdit] = useState<Payment | null>(null);
  const [showPaymentInputs, setShowPaymentInputs] = useState(false);
  const [showDeletePayment, setShowDeletePayment] = useState(false);

  const [envelopeToEdit, setEnvelopeToEdit] = useState<Nvelope | undefined>();
  const [isEditingEnvelope, setIsEditingEnvelope] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingCash, setIsAddingCash] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBudgetWarning, setShowBudgetWarning] = useState(false);
  const [cashName, setCashName] = useState("");
  const [cashAmount, setCashAmount] = useState(0);
  const [showSpendPage, setShowSpendPage] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [showLoading, setShowLoading] = useState(false);
  const [isAddingCashToEnvelope, setIsAddingCashToEnvelope] = useState(false);
  const [showClearEnvelopes, setShowClearNvelopes] = useState(false);
  const [dueFundPayment, setDueFundPayment] = useState<Payment | null>(null);
  const [dismissedDuePayments, setDismissedDuePayments] = useState<Set<string>>(
    new Set(),
  );
  const [paidOffDebtName, setPaidOffDebtName] = useState<string | null>(null);
  const [content, setContent] = useState<ViewContent>("NVELOPES");

  // Only ever show current pay period's payments (derived, never full list)
  const paymentsThisPeriod = useMemo(() => {
    if (!payDate || !payments?.length || !payPeriodInterval) return [];
    const virtual = getVirtualPaymentsForCurrentPeriod(
      payments,
      payPeriodInterval,
      payDate,
    );
    // Hide paid-off debts from main payment view (they appear on Debt page)
    return virtual.filter(
      (p) => !(p.type === "DEBT" && p.total != null && p.total <= 0),
    );
  }, [payments, payDate, payPeriodInterval]);

  // Check for due Fund (planned expense) payments
  useEffect(() => {
    if (!payments) return;

    const today = startOfDay(new Date());

    // Find Fund payments that are due (dueDate <= today) and not fully paid
    const duePayment = payments.find((p) => {
      if (p.type !== "FUND") return false;
      if (dismissedDuePayments.has(p.id)) return false;
      const dueDate = startOfDay(p.dueDate.toDate());
      return dueDate <= today && !deriveIsPaid(p);
    });

    if (duePayment && !dueFundPayment) {
      setDueFundPayment(duePayment);
    }
  }, [payments, dismissedDuePayments, dueFundPayment]);

  async function handleEditPayment(p: Payment) {
    setPaymentToEdit(p);
    setShowPaymentInputs(true);
  }

  // Handler for marking a Fund (planned expense) payment as fully paid
  async function handleMarkFundPaid(payment: Payment) {
    if (!user) return;
    const updatedPayments = payments.map((p) =>
      p.id === payment.id ? { ...p, paid: true } : p,
    );
    setPayments(updatedPayments);
    await editPayments(updatedPayments, activeBudgetId!);
    setDueFundPayment(null);
    Toast.show({ type: "success", text1: `${payment.name} marked as paid!` });
  }

  // Handler for extending a Fund payment's target date
  async function handleExtendFundDate(payment: Payment) {
    if (!user) return;
    // Extend by 1 month by default
    const newDueDate = addMonths(payment.dueDate.toDate(), 1);
    const updatedPayments = payments.map((p) =>
      p.id === payment.id
        ? { ...p, dueDate: firestore.Timestamp.fromDate(newDueDate) }
        : p,
    );
    setPayments(updatedPayments);
    await editPayments(updatedPayments, activeBudgetId!);
    setDueFundPayment(null);
    Toast.show({
      type: "success",
      text1: `${payment.name} extended by 1 month`,
    });
  }

  // Handler for dismissing the Fund due modal (remind later)
  function handleDismissFundModal() {
    if (dueFundPayment) {
      setDismissedDuePayments((prev) => new Set(prev).add(dueFundPayment.id));
    }
    setDueFundPayment(null);
  }

  function handleDeleteBill(p: Payment) {
    setPaymentToEdit(p);
    setShowDeletePayment(true);
  }

  async function deleteBill() {
    if (!user || !paymentToEdit) return;
    const originalPaymentToEditId = removeVirtualIdPortion(paymentToEdit);
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
        nvelopeOrPaymentId: originalPaymentToEditId,
        description: `Deleted payment: "${paymentToEdit?.name}"`,
        createdBy: user.email ?? user.uid,
      },
      budgetId: activeBudgetId!,
      func: () => editPayments(updatedPayments, activeBudgetId!),
    });
    resetPaymentState();
    Toast.show({ type: "success", text1: "Payment deleted" });
  }

  function handleAddPayment() {
    setPaymentToEdit(null);
    setShowPaymentInputs(true);
  }

  function resetPaymentState() {
    setShowPaymentInputs(false);
    setPaymentToEdit(null);
  }

  async function applySnowballToTarget(virtualPayment: Payment) {
    if (!snowballTargetPaymentId || !activeBudgetId || !user) return;

    const snowballPayment = payments.find((p) => p.id === "SNOWBALL");
    const targetDebt = payments.find((p) => p.id === snowballTargetPaymentId);
    if (!snowballPayment || !targetDebt) return;

    const occurrenceDate = virtualPayment.dueDate.toDate();
    const occurrenceKey = startOfDay(occurrenceDate).getTime().toString();

    const updatedSnowball = togglePaidDates(snowballPayment, occurrenceDate);
    const updatedTarget = applyAmountToTotal(
      targetDebt,
      virtualPayment.amount,
      occurrenceKey,
    );

    let updatedPayments: Payment[] = payments.map((p) => {
      if (p.id === "SNOWBALL") return updatedSnowball;
      if (p.id === snowballTargetPaymentId) return updatedTarget;
      return p;
    });

    if (updatedTarget.total! <= 0) {
      const remainder = virtualPayment.amount - (targetDebt.total ?? 0);
      updatedPayments = await handleDebtPayoff(
        targetDebt,
        updatedPayments,
        remainder,
      );
    }
    setPayments(updatedPayments);
    await editDatabaseWithTransaction({
      t: {
        id: createTransactionId(user),
        type: "SNOWBALL",
        createdAt: firestore.Timestamp.now(),
        nvelopeOrPaymentId: virtualPayment.id,
        description: `Applied snowball to  "${targetDebt?.name}"`,
        createdBy: user.email ?? user.uid,
      },
      budgetId: activeBudgetId!,
      func: () => editPayments(updatedPayments, activeBudgetId!),
    });
  }

  async function handleDebtPayoff(
    paidOffPayment: Payment,
    updatedPayments: Payment[],
    remainder: number = 0,
  ): Promise<Payment[]> {
    if (!user) return [];
    setPaidOffDebtName(paidOffPayment.name);

    const remainingDebts = updatedPayments.filter(
      (p) =>
        p.type === "DEBT" &&
        p.id !== "SNOWBALL" &&
        p.id !== paidOffPayment.id &&
        p.total != null &&
        p.total > 0,
    );
    const nextDebt =
      remainingDebts.sort((a, b) => (a.total ?? 0) - (b.total ?? 0))[0] ?? null;

    setSnowballTargetPaymentId(nextDebt.id);
    await editDatabaseWithTransaction({
      t: {
        id: createTransactionId(user),
        type: "PAID_OFF",
        createdAt: firestore.Timestamp.now(),
        nvelopeOrPaymentId: paidOffPayment.id,
        description: `Snowball paid off "${paidOffPayment?.name}" Rolling into "${nextDebt?.name}"`,
        createdBy: user!.email ?? user!.uid,
      },
      budgetId: activeBudgetId!,
      func: () => editSnowballTargetPaymentId(activeBudgetId!, nextDebt.id),
    });

    const snowballPayment = updatedPayments.find((p) => p.id === "SNOWBALL");
    const newSnowballAmount =
      (snowballPayment?.amount ?? 0) + paidOffPayment.amount;

    let finalPayments: Payment[];
    if (snowballPayment) {
      finalPayments = updatedPayments.map((p) =>
        p.id === "SNOWBALL" ? { ...p, amount: newSnowballAmount } : p,
      );
    } else {
      finalPayments = [
        ...updatedPayments,
        {
          id: "SNOWBALL",
          name: "❄️Snowball❄️",
          amount: newSnowballAmount,
          dueDate: payDate!,
          interval: "SPLIT" as Interval,
          recurring: true,
          paidDates: [],
          paidAmounts: {},
          type: "DEBT",
        } as Payment,
      ];
    }

    if (remainder > 0) {
      const newBudget = totalSpendingBudget + remainder;
      setTotalSpendingBudget(newBudget);
      await editDatabaseWithTransaction({
        t: {
          id: createTransactionId(user),
          type: "SNOWBALL",
          createdAt: firestore.Timestamp.now(),
          nvelopeOrPaymentId: paidOffPayment.id,
          description: `Snowball exeeded final payment. Applied $${remainder} to available budget`,
          createdBy: user!.email ?? user!.uid,
        },
        budgetId: activeBudgetId!,
        func: () => editTotalSpendingBudget(newBudget, activeBudgetId!),
      });
    }
    Toast.show({
      type: "success",
      text1: `${paidOffPayment.name} paid off!`,
      text2:
        remainder > 0
          ? `$${remainder.toFixed(2)} returned to budget`
          : undefined,
    });

    return finalPayments;
  }

  async function handleUpdatePaid(virtualPayment: Payment) {
    if (!user) return;
    const originalId = getOriginalIdFromVirtualId(virtualPayment.id);

    // Snowball payment routes to its own handler
    if (originalId === "SNOWBALL") {
      await applySnowballToTarget(virtualPayment);
      return;
    }

    const originalPayment = payments.find((p) => p.id === originalId);
    if (!originalPayment) return;

    const updatedPayment = computeUpdatedPayment(
      originalPayment,
      virtualPayment,
    );
    let updatedPayments: Payment[] = payments.map((p) =>
      p.id === originalId ? updatedPayment : p,
    );

    // Is Debt Paid Off?
    const paidOffPayment = updatedPayments.find(
      (p) =>
        p.id === originalId &&
        p.type === "DEBT" &&
        p.total != null &&
        p.total <= 0,
    );
    if (paidOffPayment) {
      updatedPayments = await handleDebtPayoff(paidOffPayment, updatedPayments);
    }
    setPayments(updatedPayments);
    await editDatabaseWithTransaction({
      t: {
        id: createTransactionId(user),
        type: "PAID",
        createdAt: firestore.Timestamp.now(),
        description: `Toggled "${updatedPayment?.name}" Paid/Unpaid `,
        nvelopeOrPaymentId: updatedPayment.id,
        createdBy: user.email ?? user.uid,
      },
      budgetId: activeBudgetId!,
      func: () => editPayments(updatedPayments, activeBudgetId!),
    });

    return updatedPayment;
  }

  const emptyEnvelope = {
    id: "",
    name: "",
    total: 0,
    spent: 0,
    oneTime: false,
  };

  async function saveNewEnvelope(n: Nvelope) {
    if (!n.name.trim() || !user) return;
    setLoadingText("Adding New Nvelope...");
    setShowLoading(true);
    setIsAdding(false);
    const newEnvelopes = [...envelopes];
    newEnvelopes.push({
      id: n.id,
      name: n.name,
      total: n.total,
      spent: n.spent || 0,
      order: n.order || 0,
    });
    setEnvelopes(newEnvelopes);
    await editDatabaseWithTransaction({
      t: {
        id: createTransactionId(user),
        type: "NEW",
        createdAt: firestore.Timestamp.now(),
        nvelopeOrPaymentId: n.id,
        amount: n.total,
        description: `Added new envelope ${n.name} with $${n.total}`,
        createdBy: user.email ?? user.uid,
      },
      budgetId: activeBudgetId!,
      func: () => editEnvelopes(newEnvelopes, activeBudgetId!),
    });

    await updateBudgetStateAndDBB(
      Number(n.total) * -1,
      activeBudgetId!,
      totalSpendingBudget,
      setTotalSpendingBudget,
    );
    resetState();
    Toast.show({ type: "success", text1: "Envelope created" });
  }

  async function handleSetShowSpendingPage(n: Nvelope) {
    setEnvelopeToEdit(n);
    setShowSpendPage(true);
  }

  async function deleteEnvelope() {
    if (!user || !envelopeToEdit) return;
    try {
      setLoadingText("Deleting Envelope...");
      setShowLoading(true);
      const newEnvelopes = [...envelopes].filter(
        (e) => e.id !== envelopeToEdit.id,
      );
      setEnvelopes(newEnvelopes);
      await editDatabaseWithTransaction({
        t: {
          id: createTransactionId(user),
          type: "DELETE",
          description: `Deleted envelope ${envelopeToEdit.name}`,
          createdAt: firestore.Timestamp.now(),
          createdBy: user.email ?? user.uid,
        },
        budgetId: activeBudgetId!,
        func: () => editEnvelopes(newEnvelopes, activeBudgetId!),
      });
      resetState();
      Toast.show({ type: "success", text1: "Envelope deleted" });
    } catch (error) {
      console.error("Error deleting envelope:", error);
      setShowLoading(false);
      Toast.show({ type: "error", text1: "Failed to delete envelope" });
    }
  }

  // Edit Envelopes AND budget
  async function editEnvelopeAndBudget(n: Nvelope) {
    if (!user) return;
    try {
      const originalEnvelope = envelopes.find((e) => e.id === n.id);
      if (!originalEnvelope) return;
      setLoadingText("Editing Envelope...");
      setShowLoading(true);
      if (originalEnvelope.total > n.total) {
        await updateBudgetStateAndDBB(
          Number(originalEnvelope.total - n.total),
          activeBudgetId!,
          totalSpendingBudget,
          setTotalSpendingBudget,
        );
      } else if (originalEnvelope.total < n.total) {
        await updateBudgetStateAndDBB(
          Number(n.total - originalEnvelope.total) * -1,
          activeBudgetId!,
          totalSpendingBudget,
          setTotalSpendingBudget,
        );
      }
      const newEnvelopes = [...envelopes].map((e) => (e.id === n.id ? n : e));
      setEnvelopes(newEnvelopes);
      await editDatabaseWithTransaction({
        t: {
          id: createTransactionId(user),
          type: "EDIT",
          description: `Manually Edited "${n.name}"`,
          nvelopeOrPaymentId: n.id,
          createdAt: firestore.Timestamp.now(),
          createdBy: user.email ?? user.uid,
        },
        budgetId: activeBudgetId!,
        func: () => editEnvelopes(newEnvelopes, activeBudgetId!),
      });
      resetState();
      Toast.show({ type: "success", text1: "Envelope updated" });
    } catch (error) {
      console.error("Error editing envelope:", error);
      setShowLoading(false);
      Toast.show({ type: "error", text1: "Failed to update envelope" });
    }
  }

  // Edit just the envelopes without affecting budget
  async function editEnvelope(
    n: Nvelope,
    isSpending: boolean,
    spendDesc?: string,
    amount?: number,
  ) {
    if (!user) return;
    const originalEnvelope = envelopes.find((e) => e.id === n.id);
    if (!originalEnvelope) return;
    setLoadingText("Editing Envelope...");
    setShowLoading(true);
    const newEnvelopes = [...envelopes].map((e) => (e.id === n.id ? n : e));
    setEnvelopes(newEnvelopes);
    try {
      await editDatabaseWithTransaction({
        t: {
          id: createTransactionId(user),
          type: isSpending ? "SPEND" : "EDIT",
          description: spendDesc || `Manually edited ${n.name}.`,
          nvelopeOrPaymentId: n.id,
          ...(amount !== undefined && { amount }),
          createdAt: firestore.Timestamp.now(),
          createdBy: user.email ?? user.uid,
        },
        budgetId: activeBudgetId!,
        func: () => editEnvelopes(newEnvelopes, activeBudgetId!),
      });
    } catch (error) {}

    resetState();
  }

  function handleSetupEdit(n: Nvelope) {
    setIsDeleting(false);
    setEnvelopeToEdit(n);
    setIsEditingEnvelope(true);
  }

  function handleSetupNewEnvelope() {
    setEnvelopeToEdit(undefined);
    setIsAdding(true);
  }

  function resetState() {
    setIsAdding(false);
    setIsEditingEnvelope(false);
    setIsDeleting(false);
    setEnvelopeToEdit(undefined);
    setCashAmount(0);
    setCashName("");
    setIsAddingCash(false);
    setShowSpendPage(false);
    setShowBudgetWarning(false);
    setShowLoading(false);
    setLoadingText("");
    setIsAddingCashToEnvelope(false);
  }

  function handleSetupDelete(id?: string) {
    if (id) {
      setEnvelopeToEdit(envelopes.find((e) => e.id === id));
    }
    setIsEditingEnvelope(false);
    setIsAdding(false);
    setIsDeleting(true);
  }

  function handleAddCash() {
    setIsAddingCash(true);
  }

  async function handleResetEnvelopesAndPaid() {
    if (!activeBudgetId || !user) return;
    const paymentsMarkedPaid = payments.map((p) => {
      return { ...p, paidDates: [], paidAmounts: {} };
    });
    setPayments(paymentsMarkedPaid);
    setShowClearNvelopes(false);
    await resetAllNvelopes(envelopes, setEnvelopes, activeBudgetId);
    await editDatabaseWithTransaction({
      t: {
        id: createTransactionId(user),
        type: "RESET",
        description: "Reset Nvelopes & Marked Payments as UNPAID",
        createdAt: firestore.Timestamp.now(),
        createdBy: user.email ?? user.uid,
      },
      budgetId: activeBudgetId!,
      func: () => editPayments(paymentsMarkedPaid, activeBudgetId!),
    });
    Toast.show({ type: "success", text1: "Envelopes and Payments reset" });
  }

  async function addCashToDb() {
    if (cashAmount <= 0 || !cashName || !user) return;
    setLoadingText("Adding Cash...");
    setShowLoading(true);
    const randomId = randomUUID();
    const date = firestore.Timestamp.fromDate(new Date());
    await editDatabaseWithTransaction({
      t: {
        id: createTransactionId(user),
        type: "CASH",
        amount: cashAmount,
        description: `Added Cash: ${cashName}`,
        createdAt: firestore.Timestamp.now(),
        createdBy: user.email ?? user.uid,
      },
      budgetId: activeBudgetId!,
      func: () =>
        updateBudgetStateAndDBB(
          cashAmount,
          activeBudgetId!,
          totalSpendingBudget,
          setTotalSpendingBudget,
        ),
    });
    resetState();
    Toast.show({ type: "success", text1: "Cash added to budget" });
  }

  function handleAddCashToEnvelope(envelope: Nvelope) {
    setIsAddingCashToEnvelope(true);
    setEnvelopeToEdit(envelope);
  }

  async function addCashToEnvelope() {
    const n = envelopes.find((e) => e.id === envelopeToEdit?.id);
    if (!n || cashAmount <= 0 || !user) return;
    setLoadingText("Filling Nvelope...");
    setShowLoading(true);
    const newEnvelopes = [...envelopes].map((e) =>
      e.id === n.id ? { ...n, total: n.total + cashAmount } : e,
    );
    await updateBudgetStateAndDBB(
      cashAmount * -1,
      activeBudgetId!,
      totalSpendingBudget,
      setTotalSpendingBudget,
    );
    await editDatabaseWithTransaction({
      t: {
        id: createTransactionId(user),
        type: "FILL",
        description: `Added $${cashAmount} to ${n.name}`,
        nvelopeOrPaymentId: n.id,
        amount: cashAmount,
        createdAt: firestore.Timestamp.now(),
        createdBy: user.email ?? user.uid,
      },
      budgetId: activeBudgetId!,
      func: () => editEnvelopes(newEnvelopes, activeBudgetId!),
    });
    setEnvelopes(newEnvelopes);
    Toast.show({ type: "success", text1: `${cashAmount} added to ${n.name}` });
    resetState();
  }

  if (showClearEnvelopes)
    return (
      <View className="justify-center items-center bg-my-blue-dark h-fit w-full m-auto p-6">
        <View className="items-center w-fit mx-auto bg-my-black-dark/60 p-4 rounded-md">
          <MyText className="text-my-white-light text-xl m-2">
            Reset <MyText className="text-my-blue-light">Nvelope</MyText>{" "}
            amounts to <MyText className="text-my-green-base">$0.00</MyText>
          </MyText>
          <MyText className="text-my-white-light text-xl m-2">
            Mark <MyText className="text-my-red-light">ALL Payments</MyText>
            <MyText className="text-gray-400"> unpaid</MyText>.
          </MyText>
          <MyText className="text-my-white-light text-sm mt-2">
            (Your budget total will be unaffected)
          </MyText>
        </View>
        <View className="w-full mt-8 gap-4">
          <Btn
            color="gold"
            text="Clear"
            onPress={handleResetEnvelopesAndPaid}
          />
          <Btn
            color="red"
            text="Back"
            onPress={() => setShowClearNvelopes(false)}
          />
        </View>
      </View>
    );

  if (showDeletePayment && payDate && paymentToEdit) {
    return (
      <View className="w-full h-full">
        <View className="bg-my-black-dark w-full h-fit justify-center items-center ">
          <MyText className="p-4 rounded-md text-my-white-dark w-full text-center">
            Are you sure you want to delete "{paymentToEdit.name}"?
          </MyText>
          <MyText className="text-xs text-my-white-light text-center mb-4">
            Removing this payment will not change your available budget.
          </MyText>
          <View className="flex gap-2 items-center justify-center w-[95%]">
            <Button
              title="No"
              color="red"
              onPress={() => {
                setShowDeletePayment(false);
                resetPaymentState();
              }}
            />

            <Button
              title="Yes"
              color="green"
              onPress={() => {
                deleteBill();
                setShowDeletePayment(false);
                resetPaymentState();
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  if (isDeleting && envelopeToEdit) {
    return (
      <>
        {showLoading && <Loading text={loadingText} />}
        <MainEnvelope
          kind="deleteEnvelope"
          envelope={envelopeToEdit}
          handleBack={resetState}
          handleDeleteEnvelope={() => deleteEnvelope()}
        />
      </>
    );
  }

  // Show modal for due Fund (planned expense) payments
  if (dueFundPayment) {
    return (
      <SplitPaymentDueModal
        payment={dueFundPayment}
        onMarkPaid={handleMarkFundPaid}
        onExtendDate={handleExtendFundDate}
        onDismiss={handleDismissFundModal}
      />
    );
  }

  if (showPaymentInputs) {
    if (paymentToEdit) {
      return (
        <>
          <BigPayment
            handleUpdatePaid={handleUpdatePaid}
            resetState={resetPaymentState}
            handleBack={resetPaymentState}
            paymentToEdit={paymentToEdit}
            handleDeleteBill={handleDeleteBill}
            onPaymentUpdated={setPaymentToEdit}
          />
          {paidOffDebtName && (
            <CongratsPaidOffModal
              debtName={paidOffDebtName}
              onClose={() => setPaidOffDebtName(null)}
            />
          )}
        </>
      );
    } else if (user)
      return (
        <PaymentForm
          paymentToEdit={null}
          user={user}
          handleBack={resetPaymentState}
        />
      );
  }

  if (showSpendPage && envelopes.length > 0) {
    const envelopeSent = envelopeToEdit || emptyEnvelope;
    return (
      <>
        {showLoading && <Loading text={loadingText} />}
        <MainEnvelope
          kind="spendingEnvelope"
          envelope={envelopeSent}
          editEnvelope={editEnvelope}
          handleBack={resetState}
        />
      </>
    );
  }

  if (isEditingEnvelope && envelopeToEdit) {
    return (
      <>
        {showLoading && <Loading text={loadingText} />}
        <MainEnvelope
          kind="editEnvelope"
          envelope={envelopeToEdit}
          editEnvelope={editEnvelope}
          handleBack={resetState}
          handleDeleteEnvelope={() => handleSetupDelete()}
        />
      </>
    );
  }

  if (isAdding) {
    return (
      <>
        {showLoading && <Loading text={loadingText} />}
        <MainEnvelope
          kind="addEnvelope"
          envelope={emptyEnvelope}
          handleSaveEnvelope={saveNewEnvelope}
          handleBack={resetState}
        />
      </>
    );
  }

  if (showBudgetWarning) {
    return (
      <View
      //   className="items-center gap-2"
      >
        <Text>You have nothing left in your budget!</Text>
        <Text>Try moving some money from another envelope</Text>
        <Button
          title="Go Back"
          onPress={() => setShowBudgetWarning(false)}
          color="green"
        />
      </View>
    );
  }

  if (isAddingCash) {
    return (
      <AddIncomeForm
        showLoading={showLoading}
        loadingText={loadingText}
        setIsAddingCash={setIsAddingCash}
        addCashToDb={addCashToDb}
        cashAmount={cashAmount}
        setCashAmount={setCashAmount}
        cashName={cashName}
        setCashName={setCashName}
      />
    );
  }

  if (isAddingCashToEnvelope) {
    return (
      <AddCashToEnvelopeForm
        showLoading={showLoading}
        loadingText={loadingText}
        cashAmount={cashAmount}
        setCashAmount={setCashAmount}
        addCashToEnvelope={addCashToEnvelope}
        envelopeToEdit={envelopeToEdit}
        setIsAddingCashToEnvelope={setIsAddingCashToEnvelope}
      />
    );
  }

  return (
    <>
      <View className="w-full text-center items-center flex-1 bg-my-white-light">
        {showLoading && <Loading text={loadingText} />}
        <DraxProvider>
          <ScrollView
            bounces={false}
            className="w-full h-full"
            contentContainerClassName="items-center"
          >
            <Header links={["Settings", "Debt"]} />

            <MyText className="text-lg font-semibold text-my-black-dark mb-2 py-6">
              {activeBudgetName}
            </MyText>

            {!payDate && (
              <Pressable
                className="mb-4"
                onPress={() =>
                  (navigationRef.navigate as Function)("Settings", {
                    showEditMenu: true,
                  })
                }
              >
                <MyText className="text-my-green-light underline text-center">
                  Set your pay date in Settings
                </MyText>
                <MyText className="text-sm text-my-white-light text-center">
                  to see your pay period in the header.
                </MyText>
              </Pressable>
            )}

            {content === "NVELOPES" ? (
              <NvelopesContainer
                resetState={resetState}
                handleSetupEdit={handleSetupEdit}
                editEnvelope={editEnvelopeAndBudget}
                handleSetShowSpendingPage={handleSetShowSpendingPage}
                handleDeleteEnvelope={handleSetupDelete}
                handleAddCashToEnvelope={handleAddCashToEnvelope}
              />
            ) : (
              <PaymentMap
                paymentsThisPeriod={paymentsThisPeriod}
                handleUpdatePaid={handleUpdatePaid}
                handleEditBill={handleEditPayment}
              />
            )}
          </ScrollView>
        </DraxProvider>

        <View className="w-full gap-4 mt-4">
          <ActionButtons
            onPaymentClick={handleAddPayment}
            onCashClick={handleAddCash}
            onEnvelopeClick={handleSetupNewEnvelope}
            onClearClick={() => setShowClearNvelopes(true)}
          />
          <ContentSelector content={content} setContent={setContent} />
        </View>
      </View>
      {paidOffDebtName && (
        <CongratsPaidOffModal
          debtName={paidOffDebtName}
          onClose={() => setPaidOffDebtName(null)}
        />
      )}
    </>
  );
}
