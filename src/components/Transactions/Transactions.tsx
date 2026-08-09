import { Modal, Pressable, ScrollView, View } from "react-native";
import { NvelopesTransaction } from "../../types";
import Btn from "../Buttons/Btn";
import { MyText } from "../MyText";
import TinyTransaction from "./TinyTransaction";

interface ITransactions {
  transactions: NvelopesTransaction[];
  onClose: () => void;
  name: string;
}
export default function Transactions({
  transactions,
  onClose,
  name,
}: ITransactions) {
  return (
    <View className="w-full h-full bg-my-white-light items-center justify-center">
      <View className="w-full gap-4">
        <ScrollView
          contentContainerClassName="justify-center items-center"
          className="w-full m-auto p-4 bg-my-white-light "
        >
          <MyText className="text-3xl w-full text-center">Transactions</MyText>
          <MyText className="text-lg w-full text-center mb-4">{name}</MyText>
          {transactions.map((t) => (
            <TinyTransaction t={t} key={t.id}/>
          ))}
        </ScrollView>
        <Btn color="red" text="Back" onPress={onClose} />
      </View>
    </View>
  );
}
