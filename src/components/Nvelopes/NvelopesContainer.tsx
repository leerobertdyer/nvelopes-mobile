/**
 * Nvelopes – Main envelope list container on the main view.
 * Renders the envelope section header (Nvelope / Remaining / Total), uses ListEnvelope
 * for each envelope row, and handles give/take between envelopes and opening the
 * selected envelope in BigEnvelope (Views). Parent of ListEnvelope; coordinates
 * drag-and-drop reorder and selection state.
 */

import { useEffect, useState } from "react";
import { Nvelope } from "../../types";
import { useDatabase } from "../../context/DatabaseContext/useDatabase";
import { useBudget } from "../../context/BudgetContext/useBudget";
import {
  addTransaction,
  editDatabaseWithTransaction,
  editEnvelopes,
  editTotalSpendingBudget,
} from "../../firebase/editData";
import NvelopeCard from "./NvelopeCard";
import { View } from "react-native";
import GiveAndTake from "../Payments/GiveAndTake";
import BigEnvelope from "./BigEnvelope";
import { Pressable } from "react-native-gesture-handler";
import { MyText } from "../MyText";
import Entypo from "@expo/vector-icons/Entypo";
import firestore from "@react-native-firebase/firestore";
import { useAuth } from "../../context/AuthContext/useAuth";
import { createTransactionId } from "../../util/util";
import DraggableNvelope from "./DraggableNvelope";

interface NvelopeProps {
  resetState: () => void;
  handleSetupEdit: (envelope: Nvelope) => void;
  editEnvelope: (envelope: Nvelope) => Promise<void>;
  handleSetShowSpendingPage: (envelope: Nvelope) => void;
  handleDeleteEnvelope: (id?: string) => void;
  handleAddCashToEnvelope: (envelope: Nvelope) => void;
}

export default function Nvelopes({
  resetState,
  handleSetupEdit,
  editEnvelope,
  handleSetShowSpendingPage,
  handleDeleteEnvelope,
  handleAddCashToEnvelope,
}: NvelopeProps) {
  const {
    totalSpendingBudget,
    setTotalSpendingBudget,
    envelopes,
    setEnvelopes,
  } = useDatabase();
  const { activeBudgetId } = useBudget();
  const { user } = useAuth();

  const [showGiveAndTake, setShowGiveAndTake] = useState(false);
  const [envelopeToEdit, setEnvelopeToEdit] = useState<Nvelope | null>(null);
  const [isEnvelopeSelected, setIsEnvelopeSelected] = useState(false);
  const [sortedEnvelopes, setSortedEnvelopes] = useState<Nvelope[]>([]);
  const [showEnvelopes, setShowEnvelopes] = useState(true);

  useEffect(() => {
    const stupidLargeNumber = 1000;
    const sorted = [...envelopes].sort(
      (a, b) => (a.order || stupidLargeNumber) - (b.order || stupidLargeNumber),
    );
    setSortedEnvelopes(sorted);
  }, [envelopes]);

  function handleBack() {
    setShowGiveAndTake(false);
    setIsEnvelopeSelected(false);
    setEnvelopeToEdit(null);
    resetState();
  }

  async function takeBalanceFromEnvelope(amount?: number) {
    if (!envelopeToEdit || !user) return;
    let remainingBalancePlusTotal;
    if (amount) {
      envelopeToEdit.total -= amount;
      remainingBalancePlusTotal = totalSpendingBudget + amount;
    } else {
      remainingBalancePlusTotal =
        totalSpendingBudget + (envelopeToEdit.total - envelopeToEdit.spent);
      envelopeToEdit.total = envelopeToEdit.spent;
    }
    await editDatabaseWithTransaction({
      t: {
        id: createTransactionId(user),
        type: "TAKE",
        description: `Put $${amount} from ${envelopeToEdit.name} back into available funds`,
        nvelopeOrPaymentId: envelopeToEdit.id,
        createdAt: firestore.Timestamp.now(),
        createdBy: user.email ?? user.uid,
      },
      budgetId: activeBudgetId!,
      func: () => editEnvelope(envelopeToEdit),
    });
    await editTotalSpendingBudget(remainingBalancePlusTotal, activeBudgetId!);
    setTotalSpendingBudget(remainingBalancePlusTotal);
    handleBack();
  }

  async function takeAndGive(envelope: Nvelope, amount: number) {
    if (!envelope || !envelopeToEdit || !user) return;
    envelope.total += amount;
    envelopeToEdit.total -= amount;
    const newEnvelopes = [...envelopes];
    const envelopeIndex = newEnvelopes.findIndex((e) => e.id === envelope.id);
    newEnvelopes[envelopeIndex] = envelope;
    const envelopeToEditIndex = newEnvelopes.findIndex(
      (e) => e.id === envelopeToEdit.id,
    );
    newEnvelopes[envelopeToEditIndex] = envelopeToEdit;
    await editDatabaseWithTransaction({
      t: {
        id: createTransactionId(user),
        type: "TAKE",
        description: `${user.email ?? user.uid} took $${amount} from "${envelopeToEdit.name}" and put it in "${envelope.name}"`,
        nvelopeOrPaymentId: envelope.id,
        createdAt: firestore.Timestamp.now(),
        createdBy: user.email ?? user.uid,
      },
      budgetId: activeBudgetId!,
      func: () => editEnvelopes(newEnvelopes, activeBudgetId!),
    });
    await addTransaction(
      {
        id: createTransactionId(user),
        type: "GIVE",
        description: `Gave $${amount} to ${envelope.name} from ${envelopeToEdit.name}.`,
        nvelopeOrPaymentId: envelopeToEdit.id,
        createdAt: firestore.Timestamp.now(),
        createdBy: user.email ?? user.uid,
      },
      activeBudgetId!,
    );
    setEnvelopes(newEnvelopes);
    handleBack();
  }

  function setUpShowGiveAndTake(envelope: Nvelope) {
    setShowGiveAndTake(true);
    setEnvelopeToEdit(envelope);
  }

  function handleSelectListEnvelope(envelope: Nvelope) {
    setIsEnvelopeSelected(true);
    setEnvelopeToEdit(envelope);
  }

  async function handleReorderNvelopes(nvelopes: Nvelope[]) {
    setEnvelopes(nvelopes);
    await editEnvelopes(nvelopes, activeBudgetId!);
  }

  if (showGiveAndTake && envelopeToEdit) {
    return (
      <GiveAndTake
        envelope={envelopeToEdit}
        handleBack={handleBack}
        takeAndGive={takeAndGive}
        takeFromEnvelope={takeBalanceFromEnvelope}
      />
    );
  }

  if (isEnvelopeSelected) {
    return (
      <BigEnvelope
        handleAddCashToEnvelope={handleAddCashToEnvelope}
        handleBack={() => setIsEnvelopeSelected(false)}
        envelope={envelopeToEdit!}
        resetState={resetState}
        handleSetShowSpendingPage={handleSetShowSpendingPage}
        handleSetupEdit={handleSetupEdit}
        setUpShowGiveAndTake={setUpShowGiveAndTake}
        handleDeleteEnvelope={handleDeleteEnvelope}
      />
    );
  }

  const envelopesTotal = sortedEnvelopes.reduce((sum, e) => sum + e.total, 0);
  const envelopesTotalStr = `$${Math.ceil(envelopesTotal).toFixed(2)}`;

  return (
    <View className="justify-center items-center w-full h-fit">
      <View className="w-full">
        {showEnvelopes && sortedEnvelopes.length > 0 && (
          <DraggableNvelope
            onReorder={handleReorderNvelopes}
            envelopes={sortedEnvelopes}
            onPress={handleSelectListEnvelope}
          />
        )}
      </View>
    </View>
  );
}
