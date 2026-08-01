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
    <Pressable onPress={() => handleSelectTransaction(t)} key={t.id}>
      <View
        className={`flex-row items-center justify-between px-2 w-[100%] h-[2.5rem] bg-my-white-base rounded-sm overflow-hidden gap-4 `}
      >
        <MyText className={`w-[4rem]`}>
          {format(t.createdAt.toDate(), "MMM do")}
        </MyText>
        <MyText className={`flex-1`} numberOfLines={1}>
          {t.description}
        </MyText>
      </View>
    </Pressable>
  );
}
