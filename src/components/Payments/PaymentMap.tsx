import { format, getMonth } from "date-fns";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Payment } from "../../types";
import {
  deriveIsPaid,
  getEffectivePaymentAmount,
  isDateInCurrentPayPeriod,
} from "../../util/util";
import { MyText } from "../MyText";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useDatabase } from "../../context/DatabaseContext/useDatabase";
import TinyTransaction from "../Transactions/TinyTransaction";
import { useTransactions } from "../../context/TransactionContext/useTransactions";
import Entypo from "@expo/vector-icons/Entypo";

interface PaymentMapProps {
  handleUpdatePaid: (payment: Payment) => void;
  handleEditBill: (payment: Payment) => void;
  paymentsThisPeriod: Payment[];
}
export default function PaymentMap({
  handleEditBill,
  handleUpdatePaid,
  paymentsThisPeriod,
}: PaymentMapProps) {
  const { payments, payPeriodInterval } = useDatabase();
  const { transactions } = useTransactions();
  const [view, setView] = useState<"CURRENT" | "ALL" | "TRANSACTIONS">(
    "CURRENT",
  );
  const [allMonthlyPayments, setAllMonthlyPayments] = useState<Payment[]>([]);

  useEffect(() => {
    const currentMonth = getMonth(new Date());

    const filtered = payments.filter((p) => {
      if (p.type === "DEBT" && typeof p.total === "number" && p.total <= 0) {
        return false;
      }
      if (p.type === "FUND") {
        return false;
      }
      if (
        p.interval === "YEARLY" &&
        p.dueDate.toDate().getMonth() !== currentMonth
      ) {
        return false;
      }
      return true;
    });

    setAllMonthlyPayments(filtered);
  }, [payments]);

  function RenderPayment({
    p,
    hidePayments,
  }: {
    p: Payment;
    hidePayments?: boolean;
  }) {
    const isSplitPayment = p.id.includes("-SPLIT-");
    const typeColor =
      p.type === "BILL"
        ? "bg-my-red-dark text-my-white-light"
        : p.type === "DEBT"
          ? "bg-my-blue-dark text-my-white-light"
          : "bg-my-green-dark text-my-white-light";

    return (
      <Pressable
        key={p.id}
        onPress={() => handleEditBill(p)}
        className={`flex-row py-2  justify-center items-center w-full rounded-sm
          ${deriveIsPaid(p) && !hidePayments ? "bg-my-white-dark/20" : "bg-my-white-dark/50"} ${hidePayments && "rounded-md"}`}
      >
        <>
          {!hidePayments && (
            <Pressable
              className="flex items-center justify-start mr-[1rem] flex-1"
              onPress={(e) => {
                e.stopPropagation();
                handleUpdatePaid(p);
              }}
            >
              {deriveIsPaid(p) ? (
                <View className="w-full h-[2rem] justify-center items-center">
                  <FontAwesome
                    name="check-circle"
                    color={"#076346"}
                    size={18}
                  />
                </View>
              ) : (
                <View className="w-full h-[2rem] justify-center items-center">
                  <Entypo name="circle" color={"#076346"} size={18} />
                </View>
              )}
            </Pressable>
          )}
          <View className="w-10 h-10 ml-4 rounded-md bg-my-white-light border border-my-black-light mr-4">
            <View className="h-2 bg-my-red-base" />
            <View className="flex-1 items-center justify-center">
              <MyText className="text-sm font-bold">
                {format(p.dueDate.toDate(), "do")}
              </MyText>
            </View>
          </View>
          <View className="flex-row items-center justify-start text-xsp-2 flex-[5] gap-4">
            <MyText
              className={`text-[10px] px-2 rounded w-[3rem] text-center ${isSplitPayment ? "bg-my-green-dark text-my-white-light" : typeColor}`}
            >
              {isSplitPayment ? "SPLIT" : p.type?.toUpperCase()}
            </MyText>
            <MyText
              numberOfLines={1}
              className={`text-sm ${deriveIsPaid(p) && "text-my-black-light"}`}
            >
              {p.name}
            </MyText>
          </View>
          {p.total != null ? (
            <MyText className="flex-row items-center justify-end gap-[2px] mr-[1rem]">
              <MyText
                className={`text-sm ${deriveIsPaid(p) && "text-my-black-light"}`}
              >
                ${Math.ceil(getEffectivePaymentAmount(p))}
              </MyText>
              /
              <MyText
                className={`text-sm ${deriveIsPaid(p) && "text-my-black-light"}`}
              >
                {Math.ceil(p.total)}
              </MyText>
            </MyText>
          ) : (
            <View className="items-center justify-end gap-[2px] mr-[1rem]">
              <MyText
                className={`text-sm ${deriveIsPaid(p) && "text-my-black-light"}`}
              >
                ${getEffectivePaymentAmount(p).toFixed(2)}
              </MyText>
            </View>
          )}
        </>
      </Pressable>
    );
  }

  const currentPaymentsTotal = `$${paymentsThisPeriod
    .reduce(
      (acc, p) => (deriveIsPaid(p) ? acc : getEffectivePaymentAmount(p) + acc),
      0,
    )
    .toFixed(2)}`;

  const monthlyPaymentsMinusFunds = `$${allMonthlyPayments
    .reduce((acc, p) => {
      if (p.type === "FUND") return acc;
      return p.amount + acc;
    }, 0)
    .toFixed(2)}`;

  return (
    <View className="h-fit w-full mb-8">
      <View className="w-full flex-row items-center justify-between border-y-2 bg-my-white-base">
        <Pressable onPress={() => setView("CURRENT")}>
          <MyText
            className={`border-r-2 text-center px-4 py-2 ${view === "CURRENT" ? "bg-my-white-dark" : "underline"}`}
          >
            Current Payments
          </MyText>
        </Pressable>
        <Pressable onPress={() => setView("ALL")}>
          <MyText
            className={`border-r-2 px-8 py-2 ${view === "ALL" ? "bg-my-white-dark" : "underline"}`}
          >
            All Payments
          </MyText>
        </Pressable>
        <Pressable onPress={() => setView("TRANSACTIONS")}>
          <MyText
            className={`py-2 px-4 ${view === "TRANSACTIONS" ? "bg-my-white-dark" : "underline"}`}
          >
            Transactions
          </MyText>
        </Pressable>
      </View>
      <ScrollView className="">
        <View className="h-fit w-full mb-8">
          {view === "CURRENT" && (
            <View className=" p-4 w-full">
              <View className="w-full bg-my-green-dark/40 p-2 text-my-black-dark flex-row items-center justify-center gap-4 rounded-t-md">
                <MyText>Remainder Due This Period: </MyText>
                <MyText>{currentPaymentsTotal}</MyText>
              </View>
              {paymentsThisPeriod.map((p) => (
                <RenderPayment key={p.id} p={p} />
              ))}
            </View>
          )}
        </View>
        <View className="h-fit w-full">
          {view === "ALL" && (
            <View className="p-4 w-full">
              <View className="w-full bg-my-green-dark/40 p-2 text-my-black-dark flex-row items-center justify-center gap-4 rounded-t-md">
                <MyText>Total Due Monthly: </MyText>
                <MyText>{monthlyPaymentsMinusFunds}</MyText>
              </View>
              {[...allMonthlyPayments]
                .sort(
                  (a, b) =>
                    a.dueDate.toDate().getDate() - b.dueDate.toDate().getDate(),
                )
                .map((p) => (
                  <RenderPayment key={p.id} p={p} hidePayments />
                ))}
            </View>
          )}
        </View>
        {transactions && view === "TRANSACTIONS" && transactions.length > 0 && (
          <View className="p-4 w-full">
            <View className="w-full bg-my-green-dark/40 p-2 text-my-black-dark flex-row items-center justify-center gap-4 rounded-t-md">
              <MyText>Transaction Log For Current Pay Period</MyText>
            </View>
            {transactions.map((t) => (
              <>
                <TinyTransaction key={t.id} t={t} />
              </>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
