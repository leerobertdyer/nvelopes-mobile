import { useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { MyText } from "../MyText";
import {
  centsToDollars,
  dollarsToCents,
  formatCentsForDisplay,
} from "../../util/bankStyleMoney";

const MAX_CENTS = 999999999999;

interface MoneyInputProps {
  value: number;
  onChange: (dollars: number) => void;
  id?: string;
  label?: string;
  labelColor?: string;
  placeholder?: string;
  allowNegative?: boolean;
  w?: string;
}

export default function MoneyInput({
  value,
  onChange,
  label,
  labelColor,
  placeholder = "0.00",
  allowNegative = false,
  w = "w-[90%]"
}: MoneyInputProps) {
  const inputRef = useRef<TextInput>(null);
  const cents = dollarsToCents(value);
  const displayStr = formatCentsForDisplay(cents);
  const [isNegative, setIsNegative] = useState(false);

  function handleChangeText(text: string) {
    const digitsOnly = text.replace(/[^0-9]/g, "");

    if (digitsOnly === "") {
      onChange(0);
      return
    }

    const newCents = parseInt(digitsOnly, 10);
    if (newCents > MAX_CENTS) return;
    const dollars = centsToDollars(newCents);
    onChange(isNegative ? -dollars : dollars);
  }

  return (
    <View className={`${w} m-auto gap-2 items-center justify-center`}>
      {label != null && label !== "" && (
        <MyText
          className={`
          ${labelColor === "black" ? "text-my-black-dark" : "text-my-white-light"}
          p-2 w-full 
          text-center`}
        >
          {label}
        </MyText>
      )}
      {allowNegative ? (
        <View className="flex-row w-[20rem] gap-2 items-center">
          <TextInput
            ref={inputRef}
            keyboardType={"number-pad"}
            value={displayStr}
            onChangeText={handleChangeText}
            placeholder={placeholder}
            selection={{ start: displayStr.length, end: displayStr.length }}
            className="bg-my-white-light border-2 border-my-white-dark rounded-md p-2 w-full max-w-[20rem] text-my-black-dark text-center"
          />
          <Pressable
            onPress={() => setIsNegative(!isNegative)}
            className="bg-my-white-dark rounded-md w-[1.75rem] h-[1.75rem] justify-center items-center"
          >
            <MyText className="text-center text-my-black-dark">
              {isNegative ? "+" : "-"}
            </MyText>
          </Pressable>
        </View>
      ) : (
        <TextInput
          ref={inputRef}
          keyboardType={"number-pad"}
          value={displayStr}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          selection={{ start: displayStr.length, end: displayStr.length }}
          className="bg-my-white-light border-2 border-my-white-dark rounded-md p-2 w-full max-w-[20rem] text-my-black-dark text-center"
        />
      )}
    </View>
  )
}
