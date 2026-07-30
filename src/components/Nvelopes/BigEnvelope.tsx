import Entypo from "@expo/vector-icons/Entypo";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import { Modal, Pressable, View } from "react-native";
import Btn from "../Buttons/Btn";
import { Nvelope, NvelopesTransaction } from "../../types";
import EvilIcons from "@expo/vector-icons/EvilIcons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { MyText } from "../MyText";
import SpendBtn from "../Buttons/SpendBtn";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { useBudget } from "../../context/BudgetContext/useBudget";
import { getTransactions } from "../../firebase/budgets";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Transactions from "../Transactions/Transactions";

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
  handleSetShowSpendingPage,
  handleSetupEdit,
  setUpShowGiveAndTake,
  handleDeleteEnvelope,
  handleAddCashToEnvelope,
}: IBigEnvelope) {
  const { activeBudgetId } = useBudget();

  const [transactions, setTransactions] = useState<NvelopesTransaction[]>([]);
  const [showTransactions, setShowTransactions] = useState(false);

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

  const envelopeRemainder = (
    Number(envelope.total) - Number(envelope.spent)
  ).toFixed(2);

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
      <LinearGradient
        colors={["#0edbed", "#fcca68", "#076346"]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View className="h-full w-full">
          <View className="w-full h-fit m-auto items-center justify-start gap-4">
            <View className="w-[24rem] items-center justify-center gap-2 bg-my-green-dark/30 p-8 rounded-[24px]">
              <MyText className="text-my-white-dark text-center text-3xl">
                "{envelope.name}"
              </MyText>
              <MyText className="text-my-white-light text-center ">
                ${envelopeRemainder}
              </MyText>
              <SpendBtn onPress={() => handleSetShowSpendingPage(envelope)} />
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
                  <MyText>Manually Edit Envelope</MyText>
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
      </LinearGradient>
    </Modal>
  );
}
