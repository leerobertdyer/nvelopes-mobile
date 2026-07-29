import { format } from "date-fns";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Payment } from "../../types";
import { deriveIsPaid, getEffectivePaymentAmount } from "../../util/util";
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
  const { payments } = useDatabase();
  const { transactions } = useTransactions();

  const [showCurrent, setShowCurrent] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);

  function RenderPayment({
    p,
    hidePayments,
  }: {
    p: Payment;
    hidePayments?: boolean;
  }) {
    const isSplitPayment = p.id.includes("-SPLIT-");
    const textType = isSplitPayment
      ? "text-my-green-base"
      : p.type === "DEBT"
        ? "text-my-blue-dark"
        : p.type === "BILL"
          ? "text-my-red-light"
          : "text-my-green-light";

    return (
      <Pressable
        key={p.id}
        onPress={() => handleEditBill(p)}
        className={`flex-row py-2  justify-center items-center border-my-black-dark w-full rounded-sm
          ${deriveIsPaid(p) ? "bg-my-black-light border-[1px]" : "bg-my-black-base"} ${hidePayments && "rounded-md"}`}
      >
        {hidePayments ? (
          <View className="flex-row w-[50%] m-auto justify-between gap-2">
            <MyText className={`text-xs w-8 text-my-white-dark`}>
              {format(p.dueDate.toDate(), "do")}
            </MyText>
            <MyText
              numberOfLines={1}
              className={`text-xs w-20 text-left flex-1 text-my-white-light`}
            >
              {p.name}
            </MyText>
            <MyText className={`text-sm text-my-white-dark`}>
              ${getEffectivePaymentAmount(p).toFixed(2)}
            </MyText>
          </View>
        ) : (
          <>
            <Pressable
              className="flex items-center justify-start ml-[.75rem] mr-[1rem]"
              onPress={(e) => {
                e.stopPropagation();
                handleUpdatePaid(p);
              }}
              role="button"
              aria-label={deriveIsPaid(p) ? "Mark as not paid" : "Mark as paid"}
            >
              {deriveIsPaid(p) ? (
                <FontAwesome
                  name="check-circle"
                  color={"#076346"}
                  className="bg-my-white-dark rounded-md p-[4px] border-2 border-my-black-dark overflow-hidden"
                  size={20}
                />
              ) : (
                <FontAwesome
                  name="check-circle-o"
                  color={"#076346"}
                  className="bg-my-white-light rounded-md p-[4px] border-2 border-my-green-dark overflow-hidden"
                  size={20}
                />
              )}
            </Pressable>
            <MyText className={`text-xs w-8  ${textType}`}>
              {format(p.dueDate.toDate(), "do")}
            </MyText>
            <View className="flex-row items-center justify-start text-xs ml-[1rem] p-2 flex-[5]">
              <MyText numberOfLines={1} className={`${textType}`}>
                {p.name}
              </MyText>
              {isSplitPayment && (
                <MyText className="text-[10px] bg-my-green-dark px-2 rounded ml-2 text-my-white-light">
                  SPLIT
                </MyText>
              )}
            </View>
            {p.total != null ? (
              <MyText className="text-my-white-light flex-row items-center justify-end gap-[2px] mr-[1rem]">
                <MyText className={`text-sm ${textType}`}>
                  ${Math.ceil(getEffectivePaymentAmount(p))}
                </MyText>{" "}
                /{" "}
                <MyText
                  className={`text-sm ${p.type === "DEBT" ? "text-my-blue-light" : textType}`}
                >
                  {Math.ceil(p.total)}
                </MyText>
              </MyText>
            ) : (
              <View className="text-my-white-light flex items-center justify-end gap-[2px] mr-[1rem]">
                <MyText className={`text-sm ${textType}`}>
                  ${getEffectivePaymentAmount(p).toFixed(2)}
                </MyText>
              </View>
            )}
          </>
        )}
      </Pressable>
    );
  }

  const currentPaymentsTotal = `$${paymentsThisPeriod
    .reduce(
      (acc, p) => (deriveIsPaid(p) ? acc : getEffectivePaymentAmount(p) + acc),
      0,
    )
    .toFixed(2)}`;

  const allPaymentsTotal = `$${payments.reduce((acc, p) => p.amount + acc, 0).toFixed(2)}`;

  function PaymentBox({
    isShown,
    name,
    total,
    setter,
    isTransactions,
  }: {
    isShown: boolean;
    setter: () => void;
    total?: string;
    name: string;
    isTransactions?: boolean;
  }) {
    const Icon = () => (
      <Entypo
        name={!isShown ? "chevron-up" : "chevron-down"}
        size={20}
        color="#121212"
      />
    );

    return (
      <Pressable onPress={setter}>
        <View
          className={`flex-row items-center justify-between p-2 w-[95%] h-[3rem] m-auto rounded-sm border-my-black-dark border-2
           ${isTransactions ? "bg-white" : "bg-my-white-base"}`}
        >
          <View className={`flex-row flex-1  pl-2
            ${isTransactions ? "gap-[5rem]" : "gap-4"}`}>
            <Icon />
            <MyText
              className="text-my-black-dark"
            >
              {name}
            </MyText>
          </View>
          <MyText
            className="text-my-black-dark"
          >
            {total}
          </MyText>
        </View>
      </Pressable>
    );
  }

  return (
    <>
      <View className="h-fit w-full">
        <View className="h-fit w-full mb-2">
          <PaymentBox
            name="Current Payments"
            total={currentPaymentsTotal}
            isShown={showCurrent}
            setter={() => setShowCurrent(!showCurrent)}
          />
          {showCurrent && (
            <View className="bg-my-black-dark p-2 gap-[2px] w-[95%] m-auto mb-2">
              {paymentsThisPeriod.map((p) => (
                <RenderPayment key={p.id} p={p} />
              ))}
            </View>
          )}
        </View>
        <View className="h-fit w-full mb-2">
          <PaymentBox
            name="All Payments"
            total={allPaymentsTotal}
            isShown={showAll}
            setter={() => setShowAll(!showAll)}
          />
          {showAll && (
            <View className="p-2 bg-my-black-light gap-[2px] w-[95%] m-auto">
              {payments.map((p) => (
                <RenderPayment key={p.id} p={p} hidePayments />
              ))}
            </View>
          )}
        </View>
        <PaymentBox
          name="View All Transactions"
          isShown={showTransactions}
          setter={() => setShowTransactions(!showTransactions)}
          isTransactions
        />
        {transactions && showTransactions && transactions.length > 0 && (
          <View className="p-2 bg-my-black-light gap-[2px]">
            {transactions.map((t) => (
              <>
                <TinyTransaction key={t.id} t={t} />
              </>
            ))}
          </View>
        )}
      </View>
    </>
  );
}
