import { Modal, View } from "react-native";
import { NvelopesTransaction } from "../../types";
import { MyText } from "../MyText";
import Btn from "../Buttons/Btn";
import { format } from "date-fns";
import { useDatabase } from "../../context/DatabaseContext/useDatabase";
import { useEffect, useState } from "react";

export default function BigTransaction({
  t,
  onClose,
}: {
  t: NvelopesTransaction;
  onClose: () => void;
}) {
  const { envelopes, payments } = useDatabase();
  const isEnvelopeOrPayment = !!t.nvelopeOrPaymentId;
  const [transactionDesc, setTransactionDesc] = useState("");

  useEffect(() => {
    if (isEnvelopeOrPayment) {
      const envelope = envelopes.find((e) => e.id === t.nvelopeOrPaymentId);
      if (envelope) {
        const name = `${envelope.name}`;
        const desc = createDesc(name);
        setTransactionDesc(desc);
      } else {
        const payment = payments.find((p) => p.id === t.nvelopeOrPaymentId);
        if (payment) {
          const name = `${payment.name}`;
          const desc = createDesc(name)
          setTransactionDesc(desc);
        }
      }
    }
  }, [envelopes, payments]);

  function createDesc(name: string): string {
    const workingTimestamp = t.modifiedAt ?? t.createdAt;
    const workingDate = format(workingTimestamp.toDate(), "MM/dd/yyyy");
    switch (t.type) {
      case "EDIT":
        return `On ${workingDate}, ${t.createdBy} manually edited "${name}".`;
      case "EXTRA":
        return `On ${workingDate}, ${t.createdBy} paid $${t.amount} extra towards "${name}".`;
      case "FILL":
        return `On ${workingDate}, ${t.createdBy} added $${t.amount} to "${name}".`;
      case "SPEND":
        return `On ${workingDate}, ${t.createdBy} spent $${t.amount} from "${name}".`;
      case "PAID":
        return `On ${workingDate}, ${t.createdBy} toggled "${name}" as Paid/Unpaid`;
      default:
        return t.description ?? "";
    }
  }

  return (
    <Modal>
      <View className="bg-my-blue-dark w-full h-full justify-center">
        <View className="w-full h-fit p-8 items-center justify-center gap-4 bg-my-white-light">
          <MyText className="text-2xl mb-2">Transaction Details</MyText>
          {transactionDesc ? (
            <MyText className="text-center">{transactionDesc}</MyText>
          ) : (
            <>
              <MyText>{format(t.createdAt.toDate(), "MM/dd/yyyy")}</MyText>
              <MyText>{t.createdBy}</MyText>
              <MyText>{t.description}</MyText>
            </>
          )}
          <Btn onPress={onClose} color="red" text="Go Back" />
        </View>
      </View>
    </Modal>
  );
}
