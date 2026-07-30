import React from "react";
import { View } from "react-native";
import { Nvelope } from "../../types";
import { MyText } from "../MyText";

interface INvelopeCard {
  envelope: Nvelope;
}

export default function NvelopeCard({ envelope }: INvelopeCard) {
  const isSpent = envelope.spent >= envelope.total;

  const borderClass = isSpent ? "border-my-red-dark" : "border-my-green-dark";
  const bgClass = isSpent
    ? "bg-my-red-dark text-my-white-light"
    : "bg-my-green-dark text-my-white-light";

  return (
    <View
      className={`bg-white border-2 rounded-md ${borderClass} w-[7rem] items-center justify-center`}
    >
      <View className="flex-row items-center justify-between w-full p-2">
        <View className="items-center w-full">
          <MyText
            className={`text-my-black-dark text-sm font-medium border-b-2 w-full text-center`}
          >
            ${(envelope.total - envelope.spent).toFixed(2)}
          </MyText>

          <MyText className={`text-my-black-dark text-sm font-medium`}>
            ${envelope.total.toFixed(2)}
          </MyText>
        </View>
      </View>
      <MyText
        numberOfLines={1}
        className={`w-full text-center p-[2px] text-xs ${bgClass}`}
      >
        {envelope.name}
      </MyText>
    </View>
  );
}
