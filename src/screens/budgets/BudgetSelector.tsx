import { Modal, View } from "react-native";
import { MyText } from "../../components/MyText";
import { Picker } from "@react-native-picker/picker";
import { useBudget } from "../../context/BudgetContext/useBudget";
import Btn from "../../components/Buttons/Btn";

interface IBudgetSelector {
  setShowBudgetSelector: (b: boolean) => void;
}
export default function BudgetSelector({ setShowBudgetSelector }: IBudgetSelector) {
  const { activeBudgetId, setActiveBudgetId, budgets } = useBudget();

  return (
    <Modal>
      <View className="w-full h-full bg-my-black-base">
        <View className="w-full m-auto gap-8">
          <MyText className="text-xs text-center text-my-black-dark">Select A Budget</MyText>
          <Picker
            style={{
              width: "100%",
              backgroundColor: "#fff2d9",
              borderRadius: 9,
            }}
            id="budget-switcher"
            selectedValue={activeBudgetId ?? ""}
            onValueChange={(e) => {
              if (!e) return;
              setActiveBudgetId(e);
            //   setShowBudgetSelector(false);
            }}
          >
            {budgets.map((b) => (
              <Picker.Item key={b.id} value={b.id} label={b.name} />
            ))}
          </Picker>
          <Btn color="red" text="Go Back" onPress={() => setShowBudgetSelector(false)} />
        </View>
      </View>
    </Modal>
  );
}
