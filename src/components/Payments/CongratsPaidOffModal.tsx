import { useState } from "react";
import { Modal, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MyText } from "../MyText";
import Btn from "../Buttons/Btn";
import { Payment } from "../../types";

interface IProps {
  debtName: string;
  /** The minimum payment freed up by paying off this debt. */
  freedUpAmount: number;
  /** Remaining debts eligible to become the next snowball target, lowest balance first. */
  candidates: Payment[];
  defaultTargetId: string | null;
  /** Roll the freed-up amount into the snowball, targeting the chosen debt. */
  onRoll: (targetId: string) => void;
  /** Don't touch the snowball for this payoff. */
  onDecline: () => void;
}

export default function CongratsPaidOffModal({
  debtName,
  freedUpAmount,
  candidates,
  defaultTargetId,
  onRoll,
  onDecline,
}: IProps) {
  const [targetId, setTargetId] = useState<string | null>(
    defaultTargetId ?? candidates[0]?.id ?? null,
  );

  const hasCandidates = candidates.length > 0;

  return (
    <Modal backdropColor={"#242424"}>
      <View className="h-[60%] m-auto w-full p-4 items-center gap-2 justify-center">
        <MyText className="text-2xl text-my-green-light">
          🎉 Congrats! 🎉
        </MyText>
        <MyText className="text-lg text-my-white-light">You paid off</MyText>
        <MyText className="text-my-white-dark mb-4">"{debtName}"</MyText>

        {hasCandidates ? (
          <>
            <MyText className="text-center text-my-white-light w-[85%]">
              Roll its ${freedUpAmount.toFixed(2)}/mo into your snowball?
            </MyText>
            {candidates.length > 1 ? (
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
              <MyText className="text-gray-400 text-center mb-2">
                Next up: "{candidates[0].name}"
              </MyText>
            )}
            <Btn
              color="green"
              text="Roll it into the snowball"
              onPress={() => targetId && onRoll(targetId)}
              disabled={!targetId}
            />
            <Btn color="red" onPress={onDecline} text="Not now" />
          </>
        ) : (
          <MyText className="text-center text-my-green-base w-[85%]">
            That was your last debt — nothing left to roll the snowball into!
          </MyText>
        )}

        {!hasCandidates && (
          <Btn color="red" onPress={onDecline} text="Close" />
        )}
      </View>
    </Modal>
  );
}
