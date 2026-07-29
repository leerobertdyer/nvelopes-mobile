import React from "react";
import { View } from "react-native";
import { Nvelope } from "../../types";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { MyText } from "../MyText";

interface INvelopeCard {
  envelope: Nvelope;
}

export default function NvelopeCard({
  envelope,
}: INvelopeCard) {
  // 1. Calculate color logic dynamically
  const isSpent = envelope.spent >= envelope.total;
  const isMidSpend = envelope.spent >= envelope.total * 0.5;

  const borderClass = isSpent
    ? "border-my-red-dark"
    : isMidSpend
      ? "border-my-black-dark"
      : "border-my-green-dark";
  const bgClass = isSpent
    ? "bg-my-red-dark text-my-white-dark"
    : isMidSpend
      ? "bg-my-black-dark text-my-white-dark"
      : "bg-my-green-dark text-my-white-dark";

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
      <MyText numberOfLines={1} className={`w-full text-center p-[2px] ${bgClass}`}>
        {envelope.name}
      </MyText>
    </View>
  );
}
