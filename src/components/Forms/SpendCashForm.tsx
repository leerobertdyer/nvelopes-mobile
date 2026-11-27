import Loading from "../Loading";
import TextInput from "../Input";
import { ScrollView, View } from "react-native";
import MoneyInput from "../Payments/MoneyInput";
import Btn from "../Buttons/Btn";
import { MyText } from "../MyText";

interface ISpendCashForm {
  showLoading: boolean;
  loadingText: string;
  setIsSpendingCash: (b: boolean) => void;
  spendCash: (b: boolean) => Promise<void>;
  cashAmount: number;
  setCashAmount: (n: number) => void;
  cashName: string;
  setCashName: (s: string) => void;
}
export default function SpendCashForm({
  showLoading,
  loadingText,
  setIsSpendingCash,
  spendCash,
  cashAmount,
  setCashAmount,
  cashName,
  setCashName,
}: ISpendCashForm) {
  async function handleSave() {
    await spendCash(true);
    setCashName("");
    setCashAmount(0);
    setIsSpendingCash(false);
  }

  function handleBack() {
    setCashName("");
    setCashAmount(0);
    setIsSpendingCash(false);
  }

  return (
    <ScrollView contentContainerClassName="justify-center items-center h-full">
      {showLoading && <Loading text={loadingText} />}
      <View className="bg-my-green-dark h-fit w-full justify-center m-auto">
        <View className="bg-my-green-dark rounded-md text-my-white-light w-[90vw] mx-auto p-4 pb-6 gap-4 ">
          <View className="w-full m-auto h-fit gap-4 items-center justify-center">
            <MyText className="text-my-white-dark text-lg py-2">
              Spend Cash
            </MyText>
            <TextInput
              id="newCashName"
              label=""
              value={cashName}
              onChange={(e) => setCashName(e)}
              placeholder="Reason"
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
            <Btn text="Save" onPress={handleSave} color="gold" />
          )}
          <Btn text="Go Back" onPress={handleBack} color="red" />
        </View>
      </View>
    </ScrollView>
  );
}
