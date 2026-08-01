/**
 * Nvelope – Single envelope rendered in different modes (kind).
 */
import { useEffect, useState } from "react";

import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Modal, Pressable, View } from "react-native";
import { Nvelope } from "../../types";
import NvelopeCalculator from "./NvelopeCalculator";
import EnvelopeForm from "../Forms/EnvelopeForm";
import Svg, { Line } from "react-native-svg";
import Hr from "../Hr";
import { MyText } from "../MyText";
import Btn from "../Buttons/Btn";

interface NvelopeProps {
  kind:
    | "deleteEnvelope"
    | "addEnvelope"
    | "dash"
    | "editEnvelope"
    | "spendingEnvelope";
  envelope: Nvelope;
  onPress?: () => void;
  handleBack?: () => void;
  handleSaveEnvelope?: (envelope: Nvelope) => Promise<void>;
  editEnvelope?: (
    envelope: Nvelope,
    isSpending: boolean,
    spendDesc?: string,
    amount?: number,
  ) => Promise<void>;
  handleDeleteEnvelope?: () => void;
}
export default function MainEnvelope({
  kind,
  envelope,
  onPress,
  handleBack,
  handleSaveEnvelope,
  editEnvelope,
  handleDeleteEnvelope,
}: NvelopeProps) {
  const [newEnvelopeName, setNewEnvelopeName] = useState<string>(
    envelope.name || "",
  );
  const [newEnvelopeTotal, setNewEnvelopeTotal] = useState<number>(
    envelope.total ?? 0,
  );
  const [newEnvelopeSpent, setNewEnvelopeSpent] = useState<number>(
    envelope.spent ?? 0,
  );
  const [spendingDescription, setSpendingDescription] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setNewEnvelopeName(envelope.name || "");
    setNewEnvelopeTotal(envelope.total ?? 0);
    setNewEnvelopeSpent(envelope.spent ?? 0);
  }, [envelope]);

  const dottedWidth = 150;
  const dottedHeight = 80;
  const dottedStrokeWidth = 8;

  function handleEnterAmount(amount: number, n: Nvelope) {
    if (amount <= 0) return;
    n.spent = Number(n.spent) + amount;
    editEnvelope?.(n, true, spendingDescription || undefined, amount);
    handleBack?.();
  }

  switch (kind) {
    case "deleteEnvelope":
      return (
        <Modal>
          <View className="p-4 gap-2 bg-my-black-dark w-screen h-[50%] m-auto justify-center items-center ">
            <MyText className="p-4 rounded-md text-my-white-dark w-full text-center">
              Are you sure you want to delete "{envelope.name}"?
            </MyText>
            <MyText className="text-xs w-[85%] text-center text-white">
              This will not affect your available budget.
            </MyText>
            <View className="w-full h-fit rounded-md justify-center items-center gap-2">
              <Btn
                text="Delete"
                onPress={() => handleDeleteEnvelope?.()}
                color="gold"
              />
              <Btn text="Cancel" onPress={() => handleBack?.()} color="red" />
            </View>
          </View>
        </Modal>
      );
    case "spendingEnvelope":
      return (
        <NvelopeCalculator
          spendingDescription={spendingDescription}
          setSpendingDescription={setSpendingDescription}
          envelope={envelope}
          selectEnvelope={envelope.id === ""}
          handleEnterAmount={handleEnterAmount}
          handleBack={handleBack}
        />
      );
    case "editEnvelope":
      return (
        <EnvelopeForm
          isEditing={true}
          handleBack={handleBack}
          editEnvelope={editEnvelope}
          newEnvelopeSpent={newEnvelopeSpent}
          setNewEnvelopeSpent={setNewEnvelopeSpent}
          envelope={envelope}
          newEnvelopeName={newEnvelopeName}
          newEnvelopeTotal={newEnvelopeTotal}
          setNewEnvelopeName={setNewEnvelopeName}
          setNewEnvelopeTotal={setNewEnvelopeTotal}
        />
      );
    case "addEnvelope":
      return (
        <EnvelopeForm
          isEditing={false}
          handleBack={handleBack}
          handleSaveEnvelope={handleSaveEnvelope}
          newEnvelopeName={newEnvelopeName}
          newEnvelopeTotal={newEnvelopeTotal}
          setNewEnvelopeName={setNewEnvelopeName}
          setNewEnvelopeTotal={setNewEnvelopeTotal}
        />
      );
    case "dash":
      return (
        <Pressable
          className={`w-fit relative bg-white border rounded-sm`}
          onPress={() => onPress?.()}
        >
          <MyText className="absolute top-1/2 left-[13%] w-fit text-center text-sm text-my-black-dark">
            {envelope.name}
          </MyText>
          <Svg width={dottedWidth} height={dottedHeight}>
            {/* Bottom Line */}
            <Line
              x1="0"
              y1={dottedHeight}
              x2={dottedWidth}
              y2={dottedHeight}
              stroke="green"
              strokeDasharray="6, 4, 5, 3"
              strokeWidth={dottedStrokeWidth}
            />
            {/* Top Line */}
            <Line
              x1="0"
              y1="0"
              x2={dottedWidth}
              y2="0"
              stroke="green"
              strokeDasharray="6, 4, 5, 3"
              strokeWidth={dottedStrokeWidth}
            />
            {/* Left Line */}
            <Line
              x1="0"
              y1={dottedHeight}
              x2="0"
              y2={0}
              stroke="green"
              strokeDasharray="6, 4, 5, 3"
              strokeWidth={dottedStrokeWidth}
            />
            {/* Right Line */}
            <Line
              x1={dottedWidth}
              y1={dottedHeight}
              x2={dottedWidth}
              y2={0}
              stroke="green"
              strokeDasharray="6, 4, 5, 3"
              strokeWidth={dottedStrokeWidth}
            />
            {/* Left Diagnal */}
            <Line
              x1="0"
              y1="0"
              x2={dottedWidth * 0.5}
              y2={dottedHeight * 0.35}
              stroke="green"
              strokeDasharray="8, 2"
              strokeWidth={dottedStrokeWidth * 0.35}
            />
            {/* Right Diagnal */}
            <Line
              x1={dottedWidth}
              y1="0"
              x2={dottedWidth * 0.5}
              y2={dottedHeight * 0.35}
              stroke="green"
              strokeDasharray="8, 2"
              strokeWidth={dottedStrokeWidth * 0.35}
            />
          </Svg>
        </Pressable>
      );
    default:
      return (
        <View className="w-[35vw] h-[35vw] relative">
          <MyText className="absolute w-[60%] left-1/2 -translate-x-1/2 text-center top-2 text-[.6rem]">
            {envelope.name}
          </MyText>
          <MyText className="absolute w-[60%] left-1/2 -translate-x-1/2 text-center top-10 text-[.65rem]">
            ${envelope.spent}
          </MyText>
          <Hr />
          <MyText className="absolute w-[60%] left-1/2 -translate-x-1/2 text-center top-14 text-[.65rem]">
            ${envelope.total}
          </MyText>
          <FontAwesome
            name="envelope-o"
            size={24}
            color="black"
            className="w-full h-full"
          />
        </View>
      );
  }
}
