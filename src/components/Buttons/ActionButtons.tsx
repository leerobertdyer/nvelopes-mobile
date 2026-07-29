import type { RefObject } from "react";
import { Pressable, View } from "react-native";
import { MyText } from "../MyText";

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
        className="bg-white border-2 border-my-white-dark rounded-lg p-[1px]"
      >
        <View
          style={{
            width: 77,
            height: 77,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <MyText className="text-[3rem]">💸</MyText>
          <MyText className="text-sm w-full text-center bg-my-white-base text-my-black-dark">
            Payment
          </MyText>
        </View>
      </Pressable>

      {/* Cash Button */}
      <Pressable
        ref={cashRef}
        onPress={onCashClick}
        className="bg-white border-2 border-my-white-dark rounded-lg p-[1px]"
      >
        <View
          style={{
            width: 77,
            height: 77,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <MyText className="text-[3rem]">💰</MyText>
          <MyText className="text-sm w-full text-center bg-my-white-base text-my-black-dark">
            Cash
          </MyText>
        </View>
      </Pressable>

      {/* Nvelope Button */}
      <Pressable
        ref={envelopeRef}
        onPress={onEnvelopeClick}
        className="bg-white border-2 border-my-white-dark rounded-lg p-[1px]"
      >
        <View
          style={{
            width: 77,
            height: 77,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <MyText className="text-[3rem]">📨</MyText>
          <MyText className="text-sm w-full text-center bg-my-white-base text-my-black-dark">
            Nvelope
          </MyText>
        </View>
      </Pressable>

      {/* Clear Button */}
      <Pressable
        ref={clearRef}
        onPress={onClearClick}
        className="bg-white border-2 border-my-white-dark rounded-lg p-[1px]"
      >
        <View
          style={{
            width: 77,
            height: 77,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <MyText className="text-[3rem]">♻️</MyText>
          <MyText className="text-sm w-full text-center bg-my-white-base text-my-black-dark">
            Reset
          </MyText>
        </View>
      </Pressable>
    </View>
  );
}