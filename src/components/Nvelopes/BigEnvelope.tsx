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
import NvelopeActionBtns from "../Buttons/NvelopeActionBtns";

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
          }}
          name={envelope.name}
        />
      </Modal>
    );

  return (
    <Modal>
      <View className="bg-my-white-light">
        <View className="h-full w-full justify-around items-center py-12 gap-8">
          <View className="w-full items-center mt-[4rem] p-4 gap-2 bg-my-white-dark/70">
            <FontAwesome name="envelope-open" size={50} color="#FFF" />
            <MyText className="text-my-black-dark text-center text-3xl">
              {envelope.name}
            </MyText>
          </View>
          <View className="w-full items-center justify-start gap-4">
            <View className="w-[24rem] items-center justify-center gap-2 bg-my-blue-dark/80 p-8 rounded-md">
              <MyText
                className={`${envelopeRemainder - amount < 0 ? "text-my-red-dark" : "text-my-white-light"} text-center text-s`}
              >
                Remaining: ${(envelopeRemainder - amount).toFixed(2)}
              </MyText>
              {envelope.total - envelope.spent > 0 ? (
                <>
                  <View className="w-full justify-between p-2 flex-row items-center gap-4">
                    <MoneyInput
                      w="w-[65%]"
                      value={amount}
                      onChange={(n) => setAmount(n)}
                    />
                  </View>
                  <Btn
                    text={amount > 0 ? `Spend $${amount.toFixed(2)}` : "Spend"}
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
                </>
              ) : (
                <View className="items-center w-full">
                  <MyText className="text-xl text-my-black-light mb-4">
                    Nvelope is empty{" "}
                    <FontAwesome name="envelope-open-o" size={20} />{" "}
                  </MyText>
                  <MyText>Use the ADD button below</MyText>
                  <MyText>Or take from another Nvelope.</MyText>
                </View>
              )}
            </View>

            <Pressable
              disabled={transactions.length < 1}
              onPress={() => setShowTransactions(true)}
            >
              <MyText className="text-center text-my-blue-dark underline">
                Show Transactions
              </MyText>
            </Pressable>
          </View>
          <View className="gap-8 w-full">
            <Btn onPress={handleBack} color="red" text="Go Back" />
            <NvelopeActionBtns
              n={envelope}
              onTake={() => setUpShowGiveAndTake(envelope)}
              onAdd={() => handleAddCashToEnvelope(envelope)}
              onEdit={() => handleSetupEdit(envelope)}
              onDelete={() => handleDeleteEnvelope(envelope.id)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
