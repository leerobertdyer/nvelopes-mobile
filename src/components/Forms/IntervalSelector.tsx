import { forwardRef } from "react";
import { BIWEEKLY, MONTHLY, WEEKLY, YEARLY } from "../../constants";
import type { Interval } from "../../types";
import { View } from "react-native";
import { MyText } from "../MyText";
import { Picker } from "@react-native-picker/picker";

interface IntervalSelectorProps {
  value: Interval | null;
  onChange: (interval: Interval) => void;
  label?: string;
  className?: string;
}

/**
 * Reusable interval selector component for pay period selection.
 * Used in Settings and FirstTimeSetup.
 */
export default function IntervalSelector({
  value,
  onChange,
  label = "Change Budget Interval",
  className = "",
}: IntervalSelectorProps) {
  return (
    <View
      className={`bg-my-black-base w-full p-2 rounded-md my-4 items-center ${className}`}
    >
      {label && (
        <MyText className="text-my-white-dark text-center w-full">
          {label}
        </MyText>
      )}
      <Picker
        style={{
          width: "70%",
          backgroundColor: "#fff2d9",
          borderRadius: 9,
        }}
        selectedValue={value ?? ""}
        onValueChange={(e) => onChange(e.toUpperCase() as Interval)}
        className="w-full border-2 bg-my-white-light p-2 rounded-md my-4 text-my-black-dark"
      >
        <Picker.Item value="" enabled={false} label="Select Interval" />
        <Picker.Item value={WEEKLY} enabled={false} label="Weekly" />
        <Picker.Item value={BIWEEKLY} enabled={false} label="Bi-Weekly" />
        <Picker.Item value={MONTHLY} enabled={false} label="Monthly" />
        <Picker.Item value={YEARLY} enabled={false} label="Yearly" />
      </Picker>
    </View>
  );
}
