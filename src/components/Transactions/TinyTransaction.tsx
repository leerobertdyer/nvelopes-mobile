import { Pressable, View } from "react-native";
import { NvelopesTransaction } from "../../types";
import { MyText } from "../MyText";
import { format } from "date-fns";
import BigTransaction from "./BigTransaction";
import { useState } from "react";

export default function TinyTransaction({ t }: { t: NvelopesTransaction }) {
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionToEdit, setTransactionToEdit] =
    useState<NvelopesTransaction | null>(null);

  function handleSelectTransaction(t: NvelopesTransaction) {
    setTransactionToEdit(t);
    setShowTransactionModal(true);
  }

  function resetState() {
    setShowTransactionModal(false);
    setTransactionToEdit(null);
  }

  if (showTransactionModal && transactionToEdit)
    return <BigTransaction t={transactionToEdit} onClose={resetState} />;

  return (
    <Pressable onPress={() => handleSelectTransaction(t)} key={t.id} className="border-b-[2px] border-black">
      <View
        className={`flex-row items-center justify-between px-2 w-[100%] h-[3.5rem] bg-my-white-base rounded-sm  gap-4`}
      >
        <View className="w-10 h-10 ml-4 rounded-md bg-my-white-light border border-my-black-light mr-4">
          <View className="h-2 bg-my-red-base" />
          <View className="flex-1 items-center justify-center">
            <MyText className="text-sm font-bold">
              {format(t.createdAt.toDate(), "M/d")}
            </MyText>
          </View>
        </View>
        <MyText className={`flex-1 underline text-my-blue-dark`} numberOfLines={1}>
          {t.description}
        </MyText>
      </View>
    </Pressable>
  );
}
