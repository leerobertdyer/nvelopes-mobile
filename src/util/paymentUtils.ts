import { startOfDay } from "date-fns";
import { Payment } from "../types";
import firestore from "@react-native-firebase/firestore";

export function togglePaidDates(
  payment: Payment,
  occurrenceDate: Date,
): Payment {
  const paidDates = payment.paidDates || [];
  const occurrenceTime = startOfDay(occurrenceDate).getTime();
  const alreadyPaid = paidDates.some(
    (pd) => startOfDay(pd.toDate()).getTime() === occurrenceTime,
  );
  if (alreadyPaid) {
    return {
      ...payment,
      paidDates: paidDates.filter(
        (pd) => startOfDay(pd.toDate()).getTime() !== occurrenceTime,
      ),
    };
  }
  return {
    ...payment,
    paidDates: [
      ...paidDates,
      firestore.Timestamp.fromDate(startOfDay(occurrenceDate)),
    ],
  };
}

export function applyAmountToTotal(
  payment: Payment,
  amount: number,
  occurrenceKey: string,
): Payment {
  const paidAmounts = { ...(payment.paidAmounts || {}) };
  const alreadyPaid = occurrenceKey in paidAmounts;
  if (alreadyPaid) {
    const amountToAddBack = paidAmounts[occurrenceKey] ?? 0;
    delete paidAmounts[occurrenceKey];
    return {
      ...payment,
      total: Math.max(0, (payment.total ?? 0) + amountToAddBack),
      paidAmounts,
    };
  }
  const amountToApply = Math.min(amount, payment.total ?? 0);
  paidAmounts[occurrenceKey] = amountToApply;
  return {
    ...payment,
    total: Math.max(0, (payment.total ?? 0) - amountToApply),
    paidAmounts,
  };
}

export function getSnowballAmount(payments: Payment[]): number {
  return payments.find((p) => p.name.toUpperCase() === "SNOWBALL")?.amount ?? 0;
}

export function getSnowballName(payments: Payment[], snowballTargetPaymentId: string): string {
    return payments.find((p) => p.id === snowballTargetPaymentId)?.name ?? "Set Snowball";
}

export function getSnowballPayment(payments: Payment[], snowballTargetPaymentId: string): Payment | undefined {
    return payments.find((p) => p.id === snowballTargetPaymentId);
}

export function computeUpdatedPayment(
  original: Payment,
  virtual: Payment,
): Payment {
  const occurrenceDate =
    original.interval === "YEARLY"
      ? new Date(
          virtual.dueDate.toDate().getFullYear(),
          original.dueDate.toDate().getMonth(),
          original.dueDate.toDate().getDate(),
        )
      : virtual.dueDate.toDate();
  const occurrenceKey = startOfDay(occurrenceDate).getTime().toString();

  if (original.type === "DEBT" || original.type === "FUND") {
    const withTotal = applyAmountToTotal(
      original,
      virtual.amount,
      occurrenceKey,
    );
    return togglePaidDates(withTotal, occurrenceDate);
  }

  return togglePaidDates(original, occurrenceDate);
}

export function getOriginalIdFromVirtualId(id: string) {
  return id.includes("-WEEKLY-")
    ? id.split("-WEEKLY-")[0]
    : id.includes("-BIWEEKLY-")
      ? id.split("-BIWEEKLY-")[0]
      : id.includes("-SPLIT-")
        ? id.split("-SPLIT-")[0]
        : id;
}
