import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import EvilIcons from "@expo/vector-icons/EvilIcons";
import { useState } from "react";
import { format } from "date-fns";
import { Payment } from "../../types";
import { useAuth } from "../../context/AuthContext/useAuth";
import { useBudget } from "../../context/BudgetContext/useBudget";
import { useDatabase } from "../../context/DatabaseContext/useDatabase";
import {
  createTransactionId,
  deriveIsPaid,
  removeVirtualIdPortion,
} from "../../util/util";
import {
  editDatabaseWithTransaction,
  editPayments,
} from "../../firebase/editData";
import PaymentForm from "../Forms/PaymentForm";
import Btn from "../Buttons/Btn";
import { Modal, View } from "react-native";
import MoneyInput from "./MoneyInput";
import { MyText } from "../MyText";
import firestore from "@react-native-firebase/firestore";

interface IProps {
  handleBack: () => void;
  paymentToEdit: Payment | null;
  resetState: () => void;
  handleUpdatePaid: ((payment: Payment) => Promise<Payment | undefined>) | null;
  handleDeleteBill: (p: Payment) => void;
  onPaymentUpdated?: (payment: Payment) => void;
}

export default function BigPayment({
  handleBack,
  paymentToEdit,
  handleUpdatePaid,
  handleDeleteBill,
  onPaymentUpdated,
}: IProps) {
  const [showForm, setShowForm] = useState(false);
  const [p, setP] = useState<Payment | null>(paymentToEdit);
  const [showExtraPaymentForm, setShowExtraPaymentForm] = useState(false);
  const [extraPaymentAmount, setExtraPaymentAmount] = useState(0);
  const [extraPaymentError, setExtraPaymentError] = useState<string | null>(
    null,
  );
  const { user } = useAuth();
  const { activeBudgetId } = useBudget();
  const { payments, setPayments } = useDatabase();
  async function updatePaid() {
    if (!p || !handleUpdatePaid) return;
    setP((prev) => prev && { ...prev, paid: !deriveIsPaid(prev) });
    const updated = await handleUpdatePaid(p);
    if (updated) setP(updated);
  }

  function handlePaymentUpdated(updated: Payment) {
    setP(updated);
    onPaymentUpdated?.(updated);
  }

  async function applyExtraToDebt(extra: number) {
    if (!user || !p || p.type !== "DEBT" || !activeBudgetId) return;
    const currentTotal = p.total ?? 0;
    if (currentTotal <= 0) return;
    const amount = Math.min(extra, currentTotal);
    const newTotal = Math.max(0, currentTotal - amount);
    const originalId = removeVirtualIdPortion(p);
    const updatedPayment: Payment = { ...p, id: originalId, total: newTotal };
    const updatedPayments = payments.map((pay) =>
      removeVirtualIdPortion(pay) === originalId ? updatedPayment : pay,
    );
    setPayments(updatedPayments);
    await editDatabaseWithTransaction({
      t: {
        id: createTransactionId(user),
        type: "EXTRA",
        description: `Paid $${extra} extra towards debt for ${p.name}`,
        nvelopeOrPaymentId: p.id,
        createdAt: firestore.Timestamp.now(),
        createdBy: user.email ?? user.uid,
      },
      budgetId: activeBudgetId!,
      func: () => editPayments(updatedPayments, activeBudgetId),
    });
    setP(updatedPayment);
    onPaymentUpdated?.(updatedPayment);
  }

  async function handlePayExtra() {
    if (!p || p.type !== "DEBT") return;
    const currentTotal = p.total ?? 0;
    if (currentTotal <= 0) return;
    if (extraPaymentAmount <= 0) {
      setExtraPaymentError("Enter a positive amount");
      return;
    }
    if (extraPaymentAmount > currentTotal) {
      setExtraPaymentError(`Remaining balance is $${currentTotal.toFixed(2)}`);
      return;
    }
    setExtraPaymentError(null);
    await applyExtraToDebt(extraPaymentAmount);
    setExtraPaymentAmount(0);
    setShowExtraPaymentForm(false);
  }

  async function handlePayAll() {
    if (!p || p.type !== "DEBT") return;
    const currentTotal = p.total ?? 0;
    if (currentTotal <= 0) return;
    await applyExtraToDebt(currentTotal);
    setShowExtraPaymentForm(false);
    setExtraPaymentAmount(0);
    setExtraPaymentError(null);
    handleBack();
  }

  if (showForm && user)
    return (
      <PaymentForm
        paymentToEdit={p}
        user={user}
        handleBack={handleBack}
        onPaymentUpdated={handlePaymentUpdated}
      />
    );
  if (!p) return <MyText>Error: Missing Payment To Edit</MyText>;
  return (
    <View className="pt-[3rem] bg-my-white-light w-full">
      <View className="w-full items-center justify-start">
        <View className="justify-center items-start p-2 w-[17rem] text-my-black-light rounded-md mb-8">
          <MyText className="text-lg text-my-black-dark mb-4 text-center w-full">
            "{p.name}"
          </MyText>
          <View className="items-center w-[14rem] justify-between m-auto">
            <View className="w-full flex-row justify-between">
              <MyText>Type: </MyText>
              <MyText
                className={`${p.type === "BILL" ? "text-my-red-dark" : p.type === "FUND" ? "text-my-green-dark" : "text-my-blue-dark"}`}
              >
                {p.type}
              </MyText>
            </View>
            <View className="w-full flex-row justify-between">
              <MyText>{p.type === "FUND" ? "Per Period:" : "Amount:"} </MyText>
              <MyText className="text-my-green-dark">
                ${Number(p.amount).toFixed(2)}
              </MyText>
            </View>
            <View className="w-full flex-row justify-between">
              <MyText>{p.type === "FUND" ? "Target Date:" : "Due:"} </MyText>
              <MyText className="text-my-green-dark">
                {format(
                  p.dueDate.toDate(),
                  p.type === "FUND" ? "MMM do, yyyy" : "do",
                )}
              </MyText>
            </View>
            {p.type === "DEBT" && (p.total ?? 0) > 0 && (
              <View className="w-full flex-row justify-between">
                <MyText>Remaining Due: </MyText>
                <MyText className="text-my-green-dark">
                  ${Number(p.total).toFixed(2)}
                </MyText>
              </View>
            )}
            {p.type === "FUND" && (
              <View className="w-full flex-row justify-between">
                <MyText>Target Amount: </MyText>
                <MyText className="text-my-green-dark">
                  ${Number(p.total).toFixed(2)}
                </MyText>
              </View>
            )}
          </View>
        </View>
        <View className="h-2" />
        <View className="justify-center items-center gap-2 w-full">
          {handleUpdatePaid && (
            <Btn
              color="green"
              onPress={() => updatePaid()}
              text={deriveIsPaid(p) ? 'Mark As "Not Paid"' : 'Mark As "Paid"'}
            />
          )}
          <Btn
            color="gold"
            onPress={() => {
              setShowForm(true);
            }}
            text="Manually Edit Payment"
          />
          {p.type === "DEBT" && (p.total ?? 0) > 0 && (
            <Btn
              text="Extra Payment"
              color="blue"
              onPress={() => {
                setShowExtraPaymentForm(true);
                setExtraPaymentError(null);
                setExtraPaymentAmount(0);
              }}
            />
          )}
          <Btn
            text="Delete Payment"
            color="red"
            onPress={() => {
              handleDeleteBill(p);
            }}
          />
          <View className="mt-8" />
          <Btn onPress={handleBack} color="red" text="Go Back" />
        </View>
        {showExtraPaymentForm && p?.type === "DEBT" && (p.total ?? 0) > 0 && (
          <Modal>
            <View className="w-full h-fit bg-my-blue-dark m-auto p-4">
                <View className="items-center justify-center gap-2 w-full">
                  <MyText className="text-2xl font-medium mb-1 text-my-white-light">
                    Extra Payment
                  </MyText>
                  <MyText className="text-lg text-my-white-light mb-2">
                    Remaining: ${(p.total ?? 0).toFixed(2)}
                  </MyText>
                  <Btn color="gold" onPress={handlePayAll} text="Pay All" />
                  <MoneyInput
                    id="extraPaymentAmount"
                    label=""
                    value={extraPaymentAmount}
                    onChange={(d) => {
                      setExtraPaymentAmount(d);
                      setExtraPaymentError(null);
                    }}
                    placeholder="Amount"
                  />
                  <Btn text="Apply" color="green" onPress={handlePayExtra} />
                  {extraPaymentError && (
                    <MyText className="text-xs text-my-red-light mb-2">
                      {extraPaymentError}
                    </MyText>
                  )}
                  <Btn
                    color="red"
                    text="Cancel"
                    onPress={() => {
                      setShowExtraPaymentForm(false);
                      setExtraPaymentAmount(0);
                      setExtraPaymentError(null);
                    }}
                  />
                </View>
              </View>
          </Modal>
        )}
      </View>
    </View>
  );
}
