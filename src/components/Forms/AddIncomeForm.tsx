import Loading from "../Loading";
import TextInput from "../Input";
import { View } from "react-native";
import MoneyInput from "../Payments/MoneyInput";
import Btn from "../Buttons/Btn";
import { MyText } from "../MyText";

interface IAddIncomeForm {
  showLoading: boolean;
  loadingText: string;
  setIsAddingCash: (b: boolean) => void;
  addCashToDb: () => Promise<void>;
  cashAmount: number;
  setCashAmount: (n: number) => void;
  cashName: string;
  setCashName: (s: string) => void;
}
export default function AddIncomeForm({
  showLoading,
  loadingText,
  setIsAddingCash,
  addCashToDb,
  cashAmount,
  setCashAmount,
  cashName,
  setCashName,
}: IAddIncomeForm) {
  async function handleSave() {
    await addCashToDb();
    setCashName("");
    setCashAmount(0);
    setIsAddingCash(false);
  }

  function handleBack() {
    setCashName("");
    setCashAmount(0);
    setIsAddingCash(false);
  }

  return (
    <>
      {showLoading && <Loading text={loadingText} />}
      <View className="bg-my-green-dark h-fit w-full justify-center m-auto">
        <MyText className="text-center w-full p-2 text-3xl mb-4 text-my-white-light">
          Add Income
        </MyText>
        <View className="bg-my-green-dark rounded-md text-my-white-light w-[90vw] mx-auto p-4 pb-6 gap-4 ">
          <View className="w-full m-auto h-fit gap-4 items-center justify-center">
            <MyText className="text-my-white-dark text-lg py-2">
              Add Cash
            </MyText>
            <TextInput
              id="newCashName"
              label=""
              value={cashName}
              onChange={(e) => setCashName(e)}
              placeholder="Income Source"
            />
            <MoneyInput
              label=""
              id="newCashAmount"
              placeholder="Amount to add"
              value={cashAmount}
              onChange={setCashAmount}
            />
          </View>
          {cashAmount > 0 && cashName.length > 0 && (
            <Btn text="Save" onPress={handleSave} color="green" />
          )}
          <Btn text="Back" onPress={handleBack} color="red" />
        </View>
      </View>
    </>
  );
}
