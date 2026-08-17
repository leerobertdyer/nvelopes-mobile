import { useState } from "react";
import { editTotalSpendingBudget } from "../../firebase/editData";
import { useBudget } from "../../context/BudgetContext/useBudget";
import { useDatabase } from "../../context/DatabaseContext/useDatabase";
import MoneyInput from "../Payments/MoneyInput";
import Btn from "../Buttons/Btn";
import { Modal, View } from "react-native";

interface IProps {
  handleBack: () => void;
}

export default function EditSpendingBudget({ handleBack }: IProps) {
  const { totalSpendingBudget, setTotalSpendingBudget } = useDatabase();
  const { activeBudgetId } = useBudget();

  const [cashAmount, setCashAmount] = useState(totalSpendingBudget);

  function resetState() {
    setCashAmount(0);
    handleBack();
  }

  async function manuallySetBudgetInDB() {
    if (!activeBudgetId) return;
    await editTotalSpendingBudget(cashAmount, activeBudgetId);
    setTotalSpendingBudget(cashAmount);
    handleBack();
  }

  return (
    <Modal>
      <View className="w-full h-full items-center justify-center gap-2  bg-my-black-base">
        <View className="w-full h-fit items-center justify-center gap-2  bg-my-blue-dark py-8">
          <MoneyInput
            label="Manually Adjust Your Remaining Budget"
            id="newBudgetAmount"
            value={cashAmount}
            onChange={setCashAmount}
            placeholder="Amount"
            allowNegative
          />
          <Btn color="gold" text="Save" onPress={manuallySetBudgetInDB} />
          <Btn color="red" text="Back" onPress={resetState} />
        </View>
      </View>
    </Modal>
  );
}
