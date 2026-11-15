import { Pressable, ScrollView, View } from "react-native";
import { useBudget } from "../context/BudgetContext/useBudget";
import { MyText } from "../components/MyText";
import { useEffect, useState } from "react";
import { getAllBudgetData } from "../firebase/budgets";
import { BudgetMeta } from "../types";
import Btn from "../components/Buttons/Btn";
import Loading from "../components/Loading";
import MyIcon from "../components/MyIcon";

export default function AllBudgets({
  handleClose,
}: {
  handleClose: () => void;
}) {
  const { budgets, activeBudgetId, setActiveBudgetId } = useBudget();
  const [bugetsWithMeta, setBudgetsWithMeta] = useState<BudgetMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function populateMeta() {
      const bucket = [];
      for (const b of budgets) {
        const budget = await getAllBudgetData(b.id);
        if (budget) {
          bucket.push(budget);
        }
      }
      setBudgetsWithMeta(bucket);
      setLoading(false);
    }
    populateMeta();
  }, [budgets]);

  async function selectBudget(id: string) {
    if (activeBudgetId === id) return;
    setActiveBudgetId(id);
    handleClose();
  }

  async function handleEditBudget(id: string) {}
  async function handleNewBudget() {}

  if (loading) return <Loading text="Loading budgets..." />;
  

  return (
    <ScrollView contentContainerClassName="justify-center items-center">
      <View className="p-2 gap-2">
        <MyText className="text-xl text-center font-bold">Switch Budget</MyText>
        {bugetsWithMeta.map((b) => (
          <View
            key={b.id}
            className={`
            w-[24rem] h-fit 
            rounded-md  border-my-black-dark
            p-2 
            ${b.id === activeBudgetId ? "bg-my-blue-light border-4 border-my-blue-dark" : "bg-white border-2"}`}
          >
            <View className="flex-row items-center justify-center gap-2 w-full">
              <MyText
                numberOfLines={1}
                className="text-lg text-center text-my-black-light"
              >
                {b.name}
              </MyText>
            </View>
            <View className="flex-row items-center justify-between mt-2">
              <View className="items-center">
                <View className="flex-row w-[2.25rem] h-[2.25rem] p-2 rounded-md bg-my-green-dark justify-center items-center">
                  <MyIcon type="CASH" size={22} />
                </View>
                <MyText className="text-lg">
                  ${b.availableBudget?.toFixed(2)}
                </MyText>
              </View>
              <View className="items-center">
                <View className="w-[2.25rem] h-[2.25rem] p-2 rounded-md bg-my-black-dark justify-center items-center">
                  <MyIcon type="NVELOPE" size={22} />
                </View>
                <MyText className="text-lg">{b.envelopeCount}</MyText>
              </View>
              <View className="items-center">
                <View className="w-[2.25rem] h-[2.25rem] p-2 rounded-md bg-my-red-dark justify-center items-center">
                  <MyIcon type="CASH" size={22} />
                </View>
                <MyText className="text-lg">{b.billCount}</MyText>
              </View>
            </View>
            {activeBudgetId !== b.id ? (
              <View className="flex-row gap-2 my-2">
                <Btn
                  color="gold"
                  text="Edit"
                  w="w-[7rem]"
                  h="h-[2rem]"
                  onPress={() => handleEditBudget(b.id)}
                />
                <Btn
                  color="green"
                  text="Select"
                  w="w-[7rem]"
                  h="h-[2rem]"
                  onPress={() => selectBudget(b.id)}
                />
              </View>
            ) : (
              <View className="flex-row gap-2 my-2">
                <Btn
                  color="gold"
                  text="Edit"
                  w="w-[7rem]"
                  h="h-[2rem]"
                  onPress={() => handleEditBudget(b.id)}
                  disabled
                />
                <Btn
                  color="green"
                  text="Select"
                  w="w-[7rem]"
                  h="h-[2rem]"
                  onPress={() => selectBudget(b.id)}
                  disabled
                />
              </View>
            )}
          </View>
        ))}
        <Pressable onPress={handleNewBudget} className="w-[24rem] bg-white h-[10rem] rounded-md border-2 justify-center items-center">
            <MyIcon type="ADD" />
            <MyText>Add New Budget</MyText>
        </Pressable>
      </View>
      <Btn color="red" onPress={() => handleClose()} text="Back" w="w-full" />
    </ScrollView>
  );
}
