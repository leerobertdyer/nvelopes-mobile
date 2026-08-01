import type { Nvelope } from "../../types";
import { randomUUID } from "../../util/util";
import { View } from "react-native";
import Input from "../Input";
import MoneyInput from "../Payments/MoneyInput";
import { MyText } from "../MyText";
import Btn from "../Buttons/Btn";

interface IProps {
  newEnvelopeName: string;
  setNewEnvelopeName: (s: string) => void;
  newEnvelopeTotal: number;
  setNewEnvelopeTotal: (n: number) => void;
  isEditing: boolean;
  handleBack?: () => void;
  handleSaveEnvelope?: (envelope: Nvelope) => Promise<void>;
  editEnvelope?: (envelope: Nvelope, isSpending: boolean) => Promise<void>;
  envelope?: Nvelope;
  newEnvelopeSpent?: number;
  setNewEnvelopeSpent?: (n: number) => void;
}

export default function EnvelopeForm(props: IProps) {
  const {
    newEnvelopeName,
    setNewEnvelopeName,
    newEnvelopeTotal,
    setNewEnvelopeTotal,
    handleSaveEnvelope,
    handleBack,
    isEditing,
    editEnvelope,
    envelope,
    newEnvelopeSpent,
    setNewEnvelopeSpent,
  } = props;

  return (
    <View className="w-full bg-my-blue-dark h-fit items-center justify-center p-4 gap-4 m-auto">
      <MyText className="text-my-white-dark p-2 text-3xl text-center w-full">
        {isEditing ? "Edit Envelope" : "Add New Nvelope"}
      </MyText>
      <View className="w-full gap-4">
        <Input
          id="newEnvelopeName"
          label="What is your nvelope for?"
          labelColor="text-my-white-light"
          placeholder="Envelope name"
          value={newEnvelopeName ?? ""}
          onChange={(e) => setNewEnvelopeName(e.toLowerCase())}
        />
        {newEnvelopeName && (
          <>
            <MoneyInput
              id="newTotal"
              label="How much do you want to add?"
              labelColor="text-my-white-light"
              placeholder="Envelope Amount"
              value={newEnvelopeTotal}
              onChange={setNewEnvelopeTotal}
            />
            {setNewEnvelopeSpent != null && (
              <MoneyInput
                id="newSpent"
                label="How much is already spent?"
                labelColor="black"
                placeholder="Spent"
                value={newEnvelopeSpent ?? 0}
                onChange={(n) => setNewEnvelopeSpent(n)}
              />
            )}
          </>
        )}
        {newEnvelopeName && newEnvelopeTotal > 0 && (
          <Btn
            onPress={
              isEditing && envelope
                ? () => {
                    editEnvelope?.(
                      {
                        id: envelope!.id,
                        name: newEnvelopeName,
                        total: newEnvelopeTotal,
                        spent: newEnvelopeSpent ?? envelope.spent,
                        order: envelope.order || 1000,
                      },
                      false,
                    );
                  }
                : () => {
                    handleSaveEnvelope?.({
                      id: randomUUID(),
                      name: newEnvelopeName,
                      total: newEnvelopeTotal,
                      spent: 0,
                      order: 0,
                    });
                  }
            }
            color="green"
            text="Save"
          />
        )}
        <Btn
          onPress={() => {
            handleBack?.();
          }}
          color="red"
          text="Back"
        />
      </View>
    </View>
  );
}
