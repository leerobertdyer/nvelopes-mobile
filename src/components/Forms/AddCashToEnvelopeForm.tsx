import { Modal, ScrollView, View } from "react-native";
import { useDatabase } from "../../context/DatabaseContext/useDatabase";
import { Nvelope } from "../../types";
import Btn from "../Buttons/Btn";
import Loading from "../Loading";
import MoneyInput from "../Payments/MoneyInput";
import { MyText } from "../MyText";

interface iAddCashToEnvelopeForm {
  showLoading: boolean;
  loadingText: string;
  cashAmount: number;
  envelopeToEdit?: Nvelope;
  setCashAmount: (n: number) => void;
  addCashToEnvelope: () => Promise<void>;
  setIsAddingCashToEnvelope: (b: boolean) => void;
}

export default function AddCashToEnvelopeForm({
  showLoading,
  loadingText,
  cashAmount,
  envelopeToEdit,
  setCashAmount,
  addCashToEnvelope,
  setIsAddingCashToEnvelope,
}: iAddCashToEnvelopeForm) {
  const { totalSpendingBudget } = useDatabase();

  return (
    <Modal>
      {showLoading && <Loading text={loadingText} />}
      <ScrollView className="w-full h-full bg-my-white-light" contentContainerClassName="items-center justify-center min-h-full">
        <View
          className={`${totalSpendingBudget - cashAmount < 0 ? "bg-my-red-dark" : "bg-my-green-dark "} h-fit w-full  p-4`}
        >
          <MyText className="text-my-white-base mb-2 text-center">
            Remaining Budget: ${(totalSpendingBudget - cashAmount).toFixed(2)}
          </MyText>
          <MyText className="p-2 text-my-white-light text-center">
            Add cash to
          </MyText>
          <MyText className="text-my-white-dark text-center mb-4">
            {envelopeToEdit?.name}
          </MyText>
          <MoneyInput
            id="add-cash-amount"
            label=""
            value={cashAmount}
            onChange={setCashAmount}
            placeholder="Amount"
          />
          <View className="w-full items-center gap-2 mt-4">
            <Btn text="Add" onPress={addCashToEnvelope} color="gold" />
            <Btn
              onPress={() => setIsAddingCashToEnvelope(false)}
              color={totalSpendingBudget - cashAmount < 0 ? "green" : "red"}
              text="Go Back"
            />
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}
