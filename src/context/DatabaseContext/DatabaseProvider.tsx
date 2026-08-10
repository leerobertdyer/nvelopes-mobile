import { DatabaseContext } from "./DatabaseContext";
import { useEffect, useRef, useState } from "react";
import {
  type Backup,
  type Nvelope,
  type Interval,
  type Payment,
} from "../../types";
import { useAuth } from "../AuthContext/useAuth";
import { useBudget } from "../BudgetContext/useBudget";
import firestore from "@react-native-firebase/firestore";
import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";

type Timestamp = FirebaseFirestoreTypes.Timestamp;

const BUDGET_DATA_DOC_ID = "main";
/** After a local payments write, ignore snapshot payments for this long so we don't overwrite with stale cache. */
const PAYMENTS_WRITE_GUARD_MS = 2000;

export default function DatabaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { activeBudgetId, hasBudgets, handleRemovedFromBudget } = useBudget();
  const lastPaymentsWriteAtRef = useRef(0);
  const [retryKey, setRetryKey] = useState(0);

  const [isLoadingDb, setIsLoadingDb] = useState(true);
  const [snowballTargetPaymentId, setSnowballTargetPaymentId] = useState<
    string | null
  >(null);
  const [payDate, setPayDate] = useState<Timestamp | null | undefined>(
    undefined,
  );
  const [payPeriodInterval, setPayPeriodInterval] =
    useState<Interval>("MONTHLY");
  const [envelopes, setEnvelopes] = useState<Nvelope[]>([]);
  const [payments, setPaymentsState] = useState<Payment[]>([]);
  const setPayments = (next: Payment[] | ((prev: Payment[]) => Payment[])) => {
    lastPaymentsWriteAtRef.current = Date.now();
    setPaymentsState(next);
  };
  const [isNewUser, setIsNewUser] = useState<boolean>(false);
  const [totalSpendingBudget, setTotalSpendingBudget] = useState<number>(0);
  const [backups, setBackups] = useState<Backup | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [documentExists, setDocumentExists] = useState<boolean | null>(null);

  function clearBudgetDataState() {
    setSnowballTargetPaymentId(null);
    setPayDate(undefined);
    setPayPeriodInterval("MONTHLY");
    setEnvelopes([]);
    setPaymentsState([]);
    setIsNewUser(false);
    setTotalSpendingBudget(0);
    setBackups(null);
    setDbError(null);
    setDocumentExists(null);
  }

  function clearDbError() {
    setDbError(null);
  }

  function retryDb() {
    setDbError(null);
    setRetryKey((k) => k + 1);
  }

  function normalizeTimestamp(ts: any): Timestamp | null {
    if (!ts) return null;
    if (ts?.toDate instanceof Function) return ts; // already a proper Timestamp
    if (ts?.seconds !== undefined)
      return firestore.Timestamp.fromMillis(ts.seconds * 1000);
    return null;
  }

  function normalizePayment(data: any): Payment {
    return {
      ...data,
      dueDate: normalizeTimestamp(data.dueDate),
      paidDates: data.paidDates?.map(normalizeTimestamp) ?? [],
    };
  }
  useEffect(() => {
    clearBudgetDataState();

    if (!user) {
      setIsLoadingDb(false);
      return;
    }
    if (!hasBudgets) {
      setIsLoadingDb(false);
      return;
    }
    if (!activeBudgetId) {
      setIsLoadingDb(false);
      return;
    }

    setIsLoadingDb(true);
    const dataRef = firestore().doc(
      `budgets/${activeBudgetId}/data/${BUDGET_DATA_DOC_ID}`,
    );

    const unsubscribe = dataRef.onSnapshot(
      (docSnapshot) => {
        const data = docSnapshot.data();
        if (data) {
          setDbError(null);
          setDocumentExists(true);
          setIsLoadingDb(false);
          setSnowballTargetPaymentId(data.snowballTargetPaymentId ?? null);
          setEnvelopes(data.envelopes ?? []);
          setPayDate(normalizeTimestamp(data.payDate) ?? null);
          setPayPeriodInterval(data.payPeriodInterval ?? "MONTHLY");
          const snapshotPayments = (data.payments ?? []).map(normalizePayment);
          if (
            Date.now() - lastPaymentsWriteAtRef.current >=
            PAYMENTS_WRITE_GUARD_MS
          ) {
            setPaymentsState(snapshotPayments);
          }

          setIsNewUser(data.isNewUser ?? false);
          setTotalSpendingBudget(data.totalSpendingBudget ?? 0);
          setBackups(data.backups ?? null);
        } else {
          setDocumentExists(false);
          setPayDate(undefined);
          setIsLoadingDb(false);
        }
      },
      (error) => {
        console.error("❌ Firebase listener error:", error);
        const isPermissionDenied =
          (error as { code?: string }).code === "permission-denied" ||
          (error as { code?: string }).code === "permission_denied" ||
          /permission|insufficient/i.test(String(error?.message ?? ""));
        if (isPermissionDenied && handleRemovedFromBudget) {
          setDbError(null);
          setIsNewUser(false);
          setDocumentExists(true);
          handleRemovedFromBudget();
        } else {
          setDbError(
            `Database error: ${error.message}. Please try again.`,
          );
        }
        setIsLoadingDb(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [user, activeBudgetId, hasBudgets, retryKey]);

  const value = {
    isLoadingDb,
    setIsLoadingDb,
    snowballTargetPaymentId,
    setSnowballTargetPaymentId,
    payDate,
    setPayDate,
    payPeriodInterval,
    setPayPeriodInterval,
    envelopes,
    setEnvelopes,
    payments,
    setPayments,
    isNewUser,
    setIsNewUser,
    totalSpendingBudget,
    setTotalSpendingBudget,
    backups,
    setBackups,
    dbError,
    clearDbError,
    retryDb,
    documentExists,
    setDocumentExists,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}
