import { useState } from "react";

import { Nvelope } from "../../types";
import { useDatabase } from "../../context/DatabaseContext/useDatabase";
import { Modal, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import MoneyInput from "../Payments/MoneyInput";
import { MyText } from "../MyText";
import Btn from "../Buttons/Btn";
import Input from "../Input";

interface NvelopeCalculatorProps {
  handleEnterAmount: (amount: number, envelope: Nvelope) => void;
  handleBack: (() => void) | undefined;
  selectEnvelope?: boolean;
  envelope?: Nvelope;
  setSpendingDescription: (desc: string) => void;
  spendingDescription: string | null;
}
export default function NvelopeCalculator({
  handleEnterAmount,
  handleBack,
  selectEnvelope,
  envelope,
  setSpendingDescription,
  spendingDescription,
}: NvelopeCalculatorProps) {
  const { envelopes } = useDatabase();

  const [amount, setAmount] = useState(0);
  const [selectedEnvelope, setSelectedEnvelope] = useState<Nvelope | undefined>(
    undefined,
  );

  function handleSetAmount(n: number) {
    const env = selectedEnvelope || envelope;
    if (env && n > env.total) return;
    setAmount(n);
  }

  function handleSetEnvelope(id: string) {
    const env = envelopes.find((e) => e.id === id);
    setSelectedEnvelope(env || undefined);
  }

  function spendAll() {
    handleEnterAmount(
      Number(envelope?.total) - Number(envelope?.spent),
      selectedEnvelope || envelope!,
    );
  }

  return (
    <Modal>
      <View className="w-full h-full bg-my-black-base text-my-white-dark flex items-center justify-center gap-5">
        <View className="w-full h-fit m-auto gap-4">
          <View className="w-full justify-center items-center gap-2">
            {envelope && (
              <View className="w-full">
                <MyText className="text-my-white-dark text-center">
                  "{envelope.name}"
                </MyText>
                <MyText className="w-full text-center text-my-white-light">
                  balance:{" "}
                  <MyText className="text-my-green-light ml-2">
                    $
                    {(
                      Number(envelope?.total) -
                      Number(envelope?.spent) -
                      amount
                    ).toFixed(2)}
                  </MyText>
                </MyText>
              </View>
            )}

            <Btn text="Spend All" onPress={spendAll} color="gold" />
            <View className="w-full max-w-[20rem]  justify-center items-center gap-4">
              <MoneyInput
                id="newAmountForEnvelope"
                label="Amount To Spend"
                value={amount}
                onChange={handleSetAmount}
                placeholder={`$5 from ${envelope?.name ?? ""}`}
              />
              <Input
                onChange={setSpendingDescription}
                placeholder={`Optional reason for expense...`}
                value={spendingDescription ?? ""}
              />
            </View>
            {selectEnvelope && (
              <Picker
                selectedValue={selectedEnvelope?.id || ""}
                className="bg-my-white-light border-2 border-my-white-dark rounded-md p-2 w-[80%] max-w-[20rem] text-my-black-dark"
                onValueChange={(itemValue) => handleSetEnvelope(itemValue)}
              >
                <Picker.Item
                  label="Select a nvelope"
                  enabled={false}
                  value="java"
                />
                {envelopes.map((envelope) => (
                  <Picker.Item
                    key={envelope.id}
                    label={envelope.name}
                    value={envelope.id}
                  />
                ))}
              </Picker>
            )}
          </View>
          {(amount || envelope?.total === 0) && (
            <Btn
              text="Spend"
              onPress={() => {
                handleEnterAmount(amount, selectedEnvelope || envelope!);
              }}
              color="green"
            />
          )}
          <Btn
            text={selectEnvelope ? "View Nvelopes" : "Cancel"}
            onPress={() => handleBack?.()}
            color="red"
          />
        </View>
      </View>
    </Modal>
  );
}
