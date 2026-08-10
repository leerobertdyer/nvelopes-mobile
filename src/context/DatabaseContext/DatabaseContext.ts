import { createContext } from "react";
import type { Payment, Nvelope, Interval, Backup } from "../../types";
import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
type Timestamp = FirebaseFirestoreTypes.Timestamp;


interface IDatabaseContext {
    isLoadingDb: boolean,
    setIsLoadingDb: (b: boolean) => void;
    snowballTargetPaymentId: string | null;
    setSnowballTargetPaymentId: (id: string | null) => void;
    payDate: Timestamp | null | undefined
    setPayDate: (payDate: Timestamp | null | undefined) => void
    payPeriodInterval: Interval
    setPayPeriodInterval: (i: Interval) => void
    envelopes: Nvelope[]
    setEnvelopes: (envelopes: Nvelope[]) => void
    payments: Payment[]
    setPayments: React.Dispatch<React.SetStateAction<Payment[]>>
    isNewUser: boolean
    setIsNewUser: (isNewUser: boolean) => void
    totalSpendingBudget: number
    setTotalSpendingBudget: (totalSpendingBudget: number) => void
    backups: Backup | null;
    dbError: string | null;
    clearDbError: () => void;
    retryDb: () => void;
    documentExists: boolean | null;
    setDocumentExists: (exists: boolean | null) => void;
}
export const DatabaseContext = createContext<IDatabaseContext | null>(null)
