import { View } from "react-native";
import Btn from "../Buttons/Btn";
import { MyText } from "../MyText";

interface IPaymentTypeSelector {
  onSelect: (type: "BILL" | "DEBT") => void;
  onSkip?: () => void;
  onBack?: () => void;
  skipText?: string;
}

export default function PaymentTypeSelector({
  onSelect,
  onSkip,
  onBack,
  skipText = "Skip - I'll add payments later",
}: IPaymentTypeSelector) {
  return (
    <View
      className={`
    justify-center
    items-center 
    gap-4 
    w-full
    shrink-0`}
    >
      <Btn color="gold" shadow onPress={() => onSelect("BILL")} text="BILL">
        <MyText className="text-xs text-gray-700">Utilities, Subscriptions, Rent...</MyText>
      </Btn>

      <Btn color="blue" shadow onPress={() => onSelect("DEBT")} text='DEBT'>
        <MyText className="text-xs text-gray-700">Loans, Credit Cards, etc.</MyText>
      </Btn>

      {onSkip && <Btn color="green" shadow onPress={onSkip} text={skipText}></Btn>}

      {onBack && <Btn color="red" shadow onPress={onBack} text="Go Back"></Btn>}
    </View>
  );
}
