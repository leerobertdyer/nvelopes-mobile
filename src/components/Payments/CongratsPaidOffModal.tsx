import { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MyText } from "../MyText";
import Btn from "../Buttons/Btn";
import { Payment } from "../../types";
import type { SurplusDisposition } from "../../util/util";

interface IProps {
  debtName: string;
  /** The minimum payment freed up by paying off this debt. */
  freedUpAmount: number;
  /** Amount the payment exceeded the debt's remaining balance by, if any. */
  remainder: number;
  /** Remaining debts eligible to become the next snowball target, lowest balance first. */
  candidates: Payment[];
  defaultTargetId: string | null;
  /** Apply the chosen roll + surplus disposition. */
  onConfirm: (choice: {
    roll: boolean;
    targetId: string | null;
    surplus: SurplusDisposition;
  }) => void;
  /** Don't touch the snowball or the surplus for this payoff. */
  onDecline: () => void;
}

function CheckRow({
  label,
  checked,
  onPress,
  disabled,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      className="flex-row items-center gap-2"
    >
      <View
        className={`w-[1.1rem] h-[1.1rem] border-2 rounded-sm items-center justify-center ${
          disabled
            ? "border-gray-500"
            : "border-my-white-light"
        }`}
      >
        {checked && (
          <View
            className={`w-[.6rem] h-[.6rem] ${disabled ? "bg-gray-500" : "bg-my-green-light"}`}
          />
        )}
      </View>
      <MyText className={disabled ? "text-gray-500" : "text-my-white-light"}>
        {label}
      </MyText>
    </Pressable>
  );
}

export default function CongratsPaidOffModal({
  debtName,
  freedUpAmount,
  remainder,
  candidates,
  defaultTargetId,
  onConfirm,
  onDecline,
}: IProps) {
  const hasCandidates = candidates.length > 0;
  const hasRemainder = remainder > 0;
  const [roll, setRoll] = useState(hasCandidates);
  const [targetId, setTargetId] = useState<string | null>(
    defaultTargetId ?? candidates[0]?.id ?? null,
  );
  const [surplus, setSurplus] = useState<SurplusDisposition>(
    hasRemainder ? "availableBudget" : "none",
  );

  if (!hasCandidates && !hasRemainder) {
    return (
      <Modal backdropColor={"#242424"}>
        <View className="h-[60%] m-auto w-full p-4 items-center gap-2 justify-center">
          <MyText className="text-2xl text-my-green-light">
            🎉 Congrats! 🎉
          </MyText>
          <MyText className="text-lg text-my-white-light">
            You paid off
          </MyText>
          <MyText className="text-my-white-dark mb-4">"{debtName}"</MyText>
          <MyText className="text-center text-my-green-base w-[85%]">
            That was your last debt — nothing left to roll the snowball into!
          </MyText>
          <Btn color="red" onPress={onDecline} text="Close" />
        </View>
      </Modal>
    );
  }

  const needsTargetPicker = roll || surplus === "nextTarget";
  const canConfirm = !needsTargetPicker || !!targetId;

  return (
    <Modal backdropColor={"#242424"}>
      <View className="h-[80%] m-auto w-full p-4 items-center gap-3 justify-center">
        <MyText className="text-2xl text-my-green-light">
          🎉 Congrats! 🎉
        </MyText>
        <MyText className="text-lg text-my-white-light">You paid off</MyText>
        <MyText className="text-my-white-dark mb-2">"{debtName}"</MyText>

        {hasCandidates && (
          <CheckRow
            label={`Roll its $${freedUpAmount.toFixed(2)}/mo into your snowball`}
            checked={roll}
            onPress={() => setRoll((r) => !r)}
          />
        )}

        {needsTargetPicker &&
          (candidates.length > 1 ? (
            <Picker
              selectedValue={targetId ?? ""}
              onValueChange={(v) => setTargetId(v as string)}
              style={{
                width: "80%",
                backgroundColor: "#fff2d9",
                borderRadius: 9,
              }}
            >
              {candidates.map((d) => (
                <Picker.Item
                  key={d.id}
                  value={d.id}
                  label={d.name + " - $" + `${d.total?.toFixed(0) ?? "0"}`}
                />
              ))}
            </Picker>
          ) : (
            candidates.length === 1 && (
              <MyText className="text-gray-400 text-center">
                Next up: "{candidates[0].name}"
              </MyText>
            )
          ))}

        {hasRemainder && (
          <View className="items-center gap-2 w-[90%] border-t-2 border-my-white-dark/20 pt-4 mt-2">
            <MyText className="text-center text-my-white-light">
              Your payment had ${remainder.toFixed(2)} left over after paying
              off "{debtName}". What should we do with it?
            </MyText>
            <View className="items-start gap-2 mt-2">
              <CheckRow
                label="Add to available budget"
                checked={surplus === "availableBudget"}
                onPress={() => setSurplus("availableBudget")}
              />
              <CheckRow
                label="Apply to next target now"
                checked={surplus === "nextTarget"}
                disabled={!hasCandidates}
                onPress={() => setSurplus("nextTarget")}
              />
              <CheckRow
                label="Do nothing with it"
                checked={surplus === "none"}
                onPress={() => setSurplus("none")}
              />
            </View>
          </View>
        )}

        <Btn
          color="green"
          text="Confirm"
          disabled={!canConfirm}
          onPress={() =>
            onConfirm({
              roll,
              targetId: needsTargetPicker ? targetId : null,
              surplus,
            })
          }
        />
        <Btn color="red" onPress={onDecline} text="Not now" />
      </View>
    </Modal>
  );
}
