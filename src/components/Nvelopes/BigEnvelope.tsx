import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Modal, Pressable, View } from "react-native";
import Btn from "../Buttons/Btn";
import { Nvelope, NvelopesTransaction } from "../../types";
import EvilIcons from "@expo/vector-icons/EvilIcons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { MyText } from "../MyText";
import { useEffect, useState } from "react";
import { useBudget } from "../../context/BudgetContext/useBudget";
import { getTransactions } from "../../firebase/budgets";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Transactions from "../Transactions/Transactions";
import MoneyInput from "../Payments/MoneyInput";
import { createTransactionId } from "../../util/util";
import {
  editDatabaseWithTransaction,
  editEnvelopes,
} from "../../firebase/editData";
import { useAuth } from "../../context/AuthContext/useAuth";
import firestore from "@react-native-firebase/firestore";
import { useDatabase } from "../../context/DatabaseContext/useDatabase";
import Toast from "react-native-toast-message";

interface IBigEnvelope {
  handleBack: () => void;
  envelope: Nvelope;
  resetState: () => void;
  handleSetShowSpendingPage: (envelope: Nvelope) => void;
  handleSetupEdit: (envelope: Nvelope) => void;
  setUpShowGiveAndTake: (envelope: Nvelope) => void;
  handleDeleteEnvelope: (id: string) => void;
  handleAddCashToEnvelope: (envelope: Nvelope) => void;
}

export default function BigEnvelope({
  handleBack,
  envelope,
  handleSetupEdit,
  setUpShowGiveAndTake,
  handleDeleteEnvelope,
  handleAddCashToEnvelope,
}: IBigEnvelope) {
  const { activeBudgetId } = useBudget();
  const { envelopes, setEnvelopes } = useDatabase();

  const { user } = useAuth();

  const [transactions, setTransactions] = useState<NvelopesTransaction[]>([]);
  const [showTransactions, setShowTransactions] = useState(false);
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    async function getEnvelopeTransactions() {
      const allTransactions = await getTransactions(activeBudgetId!);
      const filteredTransactions = allTransactions.filter(
        (t) => t.nvelopeOrPaymentId === envelope.id,
      );
      setTransactions(filteredTransactions);
    }
    getEnvelopeTransactions();
  }, [activeBudgetId, envelope.id]);

  const envelopeRemainderStr = (
    Number(envelope.total) - Number(envelope.spent)
  ).toFixed(2);

  const envelopeRemainder = envelope.total - envelope.spent;

  async function handleSpend(spendAll?: boolean) {
    const amountToSpend = spendAll ? envelopeRemainder : amount;
    if ((!spendAll && amount <= 0) || !user) return;

    if (envelope.spent + amountToSpend > envelope.total) {
      Toast.show({
        type: "error",
        text1: "You don't have the funds. Add Money From Budget below",
      });
      return;
    }

    const newEnvelopes = envelopes.map((n) =>
      n.id === envelope.id ? { ...n, spent: n.spent + amountToSpend } : n,
    );
    const spendDesc = `${user.email} spent $${amountToSpend} from ${envelope.name}`;
    setEnvelopes(newEnvelopes);
    try {
      await editDatabaseWithTransaction({
        t: {
          id: createTransactionId(user),
          type: "SPEND",
          description: spendDesc,
          nvelopeOrPaymentId: envelope.id,
          amount: spendAll ? envelopeRemainder : amount,
          createdAt: firestore.Timestamp.now(),
          createdBy: user.email ?? user.uid,
        },
        budgetId: activeBudgetId!,
        func: () => editEnvelopes(newEnvelopes, activeBudgetId!),
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed to save spend, please try again",
      });
      setEnvelopes(envelopes); // roll back optimistic update
    }

    handleBack?.();
  }

  if (showTransactions)
    return (
      <Modal>
        <Transactions
          transactions={transactions}
          onClose={() => {
            setShowTransactions(false);
            handleBack();
          }}
          name={envelope.name}
        />
      </Modal>
    );

  return (
    <Modal>
      <View className="bg-my-white-base">
        <View className="h-full w-full">
          <View className="w-full h-fit m-auto items-center justify-start gap-4">
            <View className="w-[24rem] items-center justify-center gap-2 bg-my-black-dark/60 p-8 rounded-[24px]">
              <MyText className="text-my-white-dark text-center text-3xl">
                "{envelope.name}"
              </MyText>
              <MyText className="text-my-white-light text-center ">
                ${envelopeRemainderStr}
              </MyText>
              <MoneyInput value={amount} onChange={(n) => setAmount(n)} />
              <Btn
                text={`Spend $${amount.toFixed(2)}`}
                disabled={amount <= 0}
                w="w-full"
                color="green"
                onPress={() => handleSpend(false)}
              />
              <Btn
                text="Spend All"
                w="w-full"
                color="gold"
                onPress={() => handleSpend(true)}
              />
            </View>

            <Btn onPress={handleBack} color="red" text="Go Back" />

            <View className="justify-center items-center gap-2 w-full ">
              <Pressable
                className="border-2 rounded-md p-2 bg-my-green-dark w-[18rem]"
                onPress={() => handleAddCashToEnvelope(envelope)}
                style={{
                  shadowColor: "#121212",
                  shadowOffset: { width: 5, height: 4 },
                  shadowOpacity: 0.85,
                  shadowRadius: 6,
                }}
              >
                <View className="flex-row items-center h-10 w-full gap-4 p-[3px] border-2 rounded-md bg-my-white-base border-my-black-dark">
                  <FontAwesome6 name="sack-dollar" color="#076346" size={20} />
                  <MyText>Add Money From Budget</MyText>
                </View>
              </Pressable>
              <Pressable
                className="border-2 rounded-md p-2 bg-my-white-dark w-[18rem]"
                onPress={() => setUpShowGiveAndTake(envelope)}
                style={{
                  shadowColor: "#121212",
                  shadowOffset: { width: 5, height: 4 },
                  shadowOpacity: 0.85,
                  shadowRadius: 6,
                }}
              >
                <View className="flex-row items-center h-10 w-full gap-4 p-[3px] border-2 rounded-md bg-my-white-base border-my-black-dark">
                  <Entypo name="hand" color="black" size={20} />
                  <MyText>Take From This Envelope</MyText>
                </View>
              </Pressable>
              <Pressable
                className="border-2 rounded-md p-2 bg-my-blue-light w-[18rem]"
                onPress={() => handleSetupEdit(envelope)}
                style={{
                  shadowColor: "#121212",
                  shadowOffset: { width: 5, height: 4 },
                  shadowOpacity: 0.85,
                  shadowRadius: 6,
                }}
              >
                <View className="flex-row items-center h-10 w-full gap-4 p-[3px] border-2 rounded-md bg-my-white-base text-black border-my-black-dark">
                  <FontAwesome name="pencil-square-o" size={20} />
                  <MyText>Manually Edit Nvelope</MyText>
                </View>
              </Pressable>
              <Pressable
                className="border-2 rounded-md p-2 bg-my-red-base w-[18rem]"
                onPress={() => handleDeleteEnvelope(envelope.id)}
                style={{
                  shadowColor: "#121212",
                  shadowOffset: { width: 5, height: 4 },
                  shadowOpacity: 0.85,
                  shadowRadius: 6,
                }}
              >
                <View className="flex-row items-center w-full gap-4 p-[2px] border-2 rounded-md bg-my-white-base border-my-black-dark">
                  <EvilIcons name="trash" size={24} color="#ad0241" />
                  <MyText>Delete Envelope</MyText>
                </View>
              </Pressable>
              <Pressable
                className="border-2 rounded-md p-2 bg-white w-[18rem] mt-4"
                disabled={transactions.length < 1}
                onPress={() => setShowTransactions(true)}
                style={{
                  shadowColor: "#121212",
                  shadowOffset: { width: 5, height: 4 },
                  shadowOpacity: 0.85,
                  shadowRadius: 6,
                }}
              >
                <View className="flex-row items-center h-10 w-full gap-4 p-[3px] border-2 rounded-md bg-my-white-base border-my-black-dark">
                  <MaterialIcons name="notes" size={24} color="black" />
                  <MyText>Show Transactions</MyText>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
