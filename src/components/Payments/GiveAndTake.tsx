import { useState } from "react";
import MoneyInput from "./MoneyInput";
import { Modal, ScrollView, View } from "react-native";
import RadioBtn from "../Buttons/RadioBtn";
import { Picker } from "@react-native-picker/picker";
import Btn from "../Buttons/Btn";
import { Nvelope } from "../../types";
import { useDatabase } from "../../context/DatabaseContext/useDatabase";
import { MyText } from "../MyText";

interface GiveAndTakeProps {
  envelope: Nvelope;
  handleBack: () => void;
  takeAndGive: (e: Nvelope, n: number) => Promise<void>;
  takeFromEnvelope: (n?: number) => Promise<void>;
}

export default function GiveAndTake({
  envelope,
  handleBack,
  takeAndGive,
  takeFromEnvelope,
}: GiveAndTakeProps) {
  const [amountToGiveOrTake, setAmountToGiveOrTake] = useState(0);
  const [isGiving, setIsGiving] = useState<boolean>(false);
  const [envelopeToGiveTo, setEnvelopeToGiveTo] = useState<Nvelope | null>(
    null,
  );
  const { envelopes, totalSpendingBudget } = useDatabase();

  return (
    <Modal>
      <ScrollView contentContainerClassName="w-full min-h-screen items-center justify-center bg-my-white-light">
        <View className="w-full h-fit  items-center justify-center bg-my-black-base p-4">
          <MyText className="text-2xl font-bold mb-4 text-my-white-dark">
            Give and Take
          </MyText>
          <View className="items-center gap-2 w-full">
            <View className="flex-row justify-around items-center gap-4">
              <View className="flex-row justify-center items-center">
                <MyText
                  numberOfLines={1}
                  className="text-my-white-dark max-w-[30rem]"
                >
                  {envelope.name}
                </MyText>
                <MyText className="text-my-white-light text-sm">
                  : $
                  {(
                    envelope.total -
                    envelope.spent -
                    amountToGiveOrTake
                  ).toFixed(2)}
                </MyText>
              </View>
              <View className="flex-row justify-around items-center">
                <MyText
                  numberOfLines={1}
                  className="text-my-white-dark max-w-[30rem]"
                >
                  {isGiving && envelopeToGiveTo
                    ? envelopeToGiveTo.name
                    : "Budget"}
                </MyText>
                <MyText className="text-my-white-light text-sm">
                  : $
                  {isGiving && envelopeToGiveTo
                    ? (
                        envelopeToGiveTo.total -
                        envelopeToGiveTo.spent +
                        amountToGiveOrTake
                      ).toFixed(2)
                    : (totalSpendingBudget + amountToGiveOrTake).toFixed(2)}
                </MyText>
              </View>
            </View>
            <MyText className="text-my-white-light/70 text-xs mt-4">
              Amount to take
            </MyText>

            <MoneyInput
              id="amount"
              value={amountToGiveOrTake}
              onChange={setAmountToGiveOrTake}
              placeholder="Enter amount"
            />
            <MyText className="text-my-white-light">
              Where do you want to put the $$$?
            </MyText>
            <View className="flex-row items-start justify-center gap-2 p-4  rounded-md">
              <RadioBtn
                option={{ id: "give", label: "Another Envelope" }}
                onSelect={() => setIsGiving(true)}
                selected={isGiving === true}
              />
              <RadioBtn
                option={{ id: "take", label: "Available Budget" }}
                onSelect={() => setIsGiving(false)}
                selected={isGiving === false}
              />
            </View>
            {isGiving && (
              <>
                <MyText className="text-my-white-light">
                  Enter envelope to give to
                </MyText>
                <Picker
                  style={{
                    width: "80%",
                    margin: "auto",
                    backgroundColor: "#fff2d9",
                    borderRadius: 9,
                  }}
                  onValueChange={(e) =>
                    setEnvelopeToGiveTo(
                      envelopes.find((envelope) => envelope.id === e) || null,
                    )
                  }
                  selectedValue={envelopeToGiveTo?.id || ""}
                >
                  <Picker.Item
                    enabled={false}
                    value=""
                    label="Select an envelope"
                  />
                  {envelopes.map(
                    (e) =>
                      e.id !== envelope.id && (
                        <Picker.Item key={e.id} value={e.id} label={e.name} />
                      ),
                  )}
                </Picker>
              </>
            )}
            {isGiving && envelopeToGiveTo !== null ? (
              <Btn
                onPress={() =>
                  takeAndGive(envelopeToGiveTo, amountToGiveOrTake)
                }
                color="green"
                text="Give"
              />
            ) : (
              !isGiving && (
                <>
                  <Btn
                    onPress={() => takeFromEnvelope(amountToGiveOrTake)}
                    color="gold"
                    text="Take"
                  />
                  <Btn
                    onPress={() =>
                      takeFromEnvelope(envelope.total - envelope.spent)
                    }
                    color="green"
                    text="Take All"
                  />
                </>
              )
            )}

            <Btn
              onPress={() => {
                setIsGiving(false);
                handleBack();
              }}
              color="red"
              text="Cancel"
            />
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}
