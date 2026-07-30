import type { RefObject } from "react";
import { Pressable, View } from "react-native";
import { MyText } from "../MyText";
import MyIcon, { MyIconType } from "../MyIcon";

interface ActionButtonsProps {
  onPaymentClick?: () => void;
  onCashClick?: () => void;
  onEnvelopeClick?: () => void;
  onClearClick?: () => void;
  paymentRef?: RefObject<View | null>;
  cashRef?: RefObject<View | null>;
  envelopeRef?: RefObject<View | null>;
  clearRef?: RefObject<View | null>;
}

/**
 * Reusable action buttons bar for Payment, Cash, Nvelope, and Clear actions.
 * Used in MainView.
 */
export default function ActionButtons({
  onPaymentClick,
  onCashClick,
  onEnvelopeClick,
  onClearClick,
  paymentRef,
  cashRef,
  envelopeRef,
  clearRef,
}: ActionButtonsProps) {
  return (
    <View className="flex-row w-full justify-center gap-4 items-center">
      {/* Payment Button */}
      <Pressable
        ref={paymentRef}
        onPress={onPaymentClick}
        className="bg-[#9c6d00] border-2 border-my-black-dark rounded-lg p-[1px] h-[6rem] w-[6rem]"
      >
        <View className="flex-1 pt-2 justify-center items-center">
          <MyIcon type={"PAYMENT"} />
        </View>
        <MyText className="text-sm w-full text-center text-my-white-light">Payment</MyText>
      </Pressable>

      {/* Cash Button */}
      <Pressable
        ref={cashRef}
        onPress={onCashClick}
        className="bg-my-green-dark border-2 border-my-black-dark rounded-lg p-[1px] h-[6rem] w-[6rem]"
      >
        <View className="flex-1 pt-2 justify-center items-center">
          <MyIcon type={"CASH"} />
        </View>
        <MyText className="text-sm w-full text-center text-my-white-light">Cash</MyText>
      </Pressable>

      {/* Nvelope Button */}
      <Pressable
        ref={envelopeRef}
        onPress={onEnvelopeClick}
        className="bg-my-blue-dark border-2 border-my-black-dark rounded-lg p-[1px] h-[6rem] w-[6rem]"
      >
        <View className="flex-1 pt-2 justify-center items-center">
          <MyIcon type={"NVELOPE"} />
        </View>
        <MyText className="text-sm w-full text-center text-my-white-light">Nvelope</MyText>
      </Pressable>

      {/* Clear Button */}
      <Pressable
        ref={clearRef}
        onPress={onClearClick}
        className="bg-my-red-dark border-2 border-my-black-dark rounded-lg p-[1px] h-[6rem] w-[6rem]"
      >
        <View className="flex-1 pt-2 justify-center items-center">
          <MyIcon type={"RESET"} />
        </View>
        <MyText className="text-sm w-full text-center text-my-white-light">Reset</MyText>
      </Pressable>
    </View>
  );
}
