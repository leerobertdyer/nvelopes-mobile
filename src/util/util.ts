import type {
  Payment,
  Nvelope,
  Interval,
  IntervalDates,
  Backup,
} from "../types";
import { BIWEEKLY, MONTHLY, SPLIT, WEEKLY, YEARLY } from "../constants";
import {
  addMonths,
  addWeeks,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  getDay,
  getDaysInMonth,
  isAfter,
  isBefore,
  isWithinInterval,
  lastDayOfMonth,
  startOfDay,
  startOfMonth,
  startOfToday,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import firestore from "@react-native-firebase/firestore";
import { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import { FirebaseAuthTypes } from "@react-native-firebase/auth";
type User = FirebaseAuthTypes.User;
type Timestamp = FirebaseFirestoreTypes.Timestamp;
const { Timestamp } = firestore;

export function recalculateBudget(params: {
  currentAvailableBudget: number;
  diffAmount: number;
}): number {
  const { currentAvailableBudget, diffAmount } = params;
  return currentAvailableBudget + diffAmount;
}

export function recalculateRentPayment(
  rent: number,
  interval: Interval,
): number {
  if (interval === MONTHLY) return rent;
  if (interval === BIWEEKLY) return rent / 2;
  if (interval === WEEKLY) return rent / 4;
  return rent;
}

export function capitalizeFirstLetter(str: string | null): string {
  if (!str) return "";
  return str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase();
}

/** UUID v4. Uses crypto.randomUUID() when available (e.g. modern browsers), else a fallback for older iOS Safari/WebViews. */
export function randomUUID(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = (Math.random() * 256) | 0;
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function resetEnvelopesSpentToZero(envelopes: Nvelope[]) {
  const updatedEnvelopes = [...envelopes].map((e) => {
    return { ...e, spent: 0 };
  });
  return updatedEnvelopes;
}

export function getOccurrencesOfWeekday(
  year: number,
  month: number,
  weekday: number,
) {
  const start = new Date(year, month, 1);
  const end = lastDayOfMonth(start);
  const days = eachDayOfInterval({ start, end }).filter(
    (d) => getDay(d) === weekday,
  );
  return {
    first: days[0] || null,
    second: days[1] || null,
    third: days[2] || null,
    fourth: days[3] || null,
  };
}

export function calculateCurrentIntervalStart(d: Date, i: Interval): Date {
  const start = startOfDay(d);
  const today = startOfDay(new Date());
  if (start > today) return calculateIntervalsFromFutureDate(i, start, today);
  else return calculateIntervalsFromPastDate(i, start, today);
}

export function calculateIntervalsFromPastDate(
  i: Interval,
  start: Date,
  today: Date,
) {
  // Note: I've left both of these functions in place intentionally for readability
  switch (i) {
    case WEEKLY: {
      // Walk forward by weeks until start <= today
      while (isBefore(start, today)) {
        start = addWeeks(start, 1);
      }
      // If today IS the period start, return it directly (don't subtract)
      if (startOfDay(start).getTime() === startOfDay(today).getTime()) {
        return start;
      }
      return subWeeks(start, 1);
    }
    case BIWEEKLY: {
      while (isBefore(start, today)) {
        start = addWeeks(start, 2);
      }
      // If today IS the period start, return it directly (don't subtract)
      if (startOfDay(start).getTime() === startOfDay(today).getTime()) {
        return start;
      }
      return subWeeks(start, 2);
    }
    case MONTHLY: {
      while (isBefore(start, today)) {
        start = addMonths(start, 1);
      }
      // If today IS the period start, return it directly (don't subtract)
      if (startOfDay(start).getTime() === startOfDay(today).getTime()) {
        return start;
      }
      return subMonths(start, 1);
    }
    case YEARLY: {
      while (isBefore(start, today)) {
        start = addYears(start, 1);
      }
      // If today IS the period start, return it directly
      if (startOfDay(start).getTime() === startOfDay(today).getTime()) {
        return start;
      }
      return start;
    }
    case SPLIT:
      return calculateIntervalsFromPastDate(MONTHLY, start, today);
    default:
      console.error(`Unsupported interval: ${i}`);
      return today;
  }
}

export function calculateIntervalsFromFutureDate(
  i: Interval,
  start: Date,
  today: Date,
): Date {
  // Note: I've left both of these functions in place intentionally for readability
  switch (i) {
    case WEEKLY: {
      // Walk backwards by weeks until start <= today
      while (isAfter(start, today)) {
        start = subWeeks(start, 1);
      }
      return start;
    }
    case BIWEEKLY: {
      while (isAfter(start, today)) {
        start = subWeeks(start, 2);
      }
      return start;
    }
    case MONTHLY: {
      while (isAfter(start, today)) {
        start = subMonths(start, 1);
      }
      return start;
    }
    case YEARLY: {
      while (isAfter(start, today)) {
        start = subYears(start, 1);
      }
      return start;
    }
    case SPLIT:
      return calculateIntervalsFromFutureDate(MONTHLY, start, today);
    default:
      console.error(`Unsupported interval: ${i}`);
      return today;
  }
}

// Helper to return the start and end dates of a given interval based on a given date
export function getIntervalDateRange(i: Interval, start: Date): IntervalDates {
  let end = startOfDay(new Date(start));

  switch (i) {
    case WEEKLY:
      end = addWeeks(start, 1);
      break;
    case BIWEEKLY:
      end = addWeeks(start, 2);
      break;
    case MONTHLY:
      end = addMonths(start, 1);
      break;
    case YEARLY:
      end = addYears(start, 1);
      break;
    case SPLIT:
      // SPLIT = monthly amount split across pay periods; use same range as MONTHLY
      end = addMonths(start, 1);
      break;
    default:
      console.error(`Unsupported interval: ${i}`);
  }
  // Remove a day to prevent overlap
  end = subDays(end, 1);

  return {
    start,
    end,
  };
}

export function getNumberOfDaysFromInterval(i: Interval) {
  switch (i) {
    case "YEARLY":
      return 365;
    case "MONTHLY":
      return getDaysInMonth(new Date());
    case "BIWEEKLY":
      return 14;
    case "WEEKLY":
      return 7;
    default:
      return 0;
  }
}

export function getPaymentCurrentDueDate(p: Payment): Date {
  const originalDate = p.dueDate.toDate();
  const startOfCurrentPaymentInterval = calculateCurrentIntervalStart(
    originalDate,
    p.interval,
  );
  const { end } = getIntervalDateRange(
    p.interval,
    startOfCurrentPaymentInterval,
  );
  // console.log(`[getPaymentCurrentDueDate] checking ${p.name} to get current date. OriginalDueDate: ${originalDate}, startOfCurrentPaymentInterval: ${startOfCurrentPaymentInterval}, end: ${end}`)
  return end;
}

export function isDateInCurrentPayPeriod(
  payPeriodInterval: Interval,
  payDate: Date,
  d: Date,
): boolean {
  const startOfCurrentPaymentInterval = calculateCurrentIntervalStart(
    payDate,
    payPeriodInterval,
  );
  const { start, end } = getIntervalDateRange(
    payPeriodInterval,
    startOfCurrentPaymentInterval,
  );
  // console.log(`[isDateInCurrentPayPeriod] payPeriodInterval: ${payPeriodInterval}, payDate: ${payDate}, dateToCheck: ${d} PayPeriodRange: START=${start} end=${end}`)
  return isWithinInterval(d, { start, end }); // Is the date within the current pay period
}

export function getCurrentIntervalDateRange(
  payPeriodInterval: Interval,
  payDate: Timestamp,
) {
  const originalDate = payDate.toDate();
  const start = calculateCurrentIntervalStart(originalDate, payPeriodInterval);
  const { end } = getIntervalDateRange(payPeriodInterval, start);
  return { start, end };
}

/**
 * Effective amount for display and period totals.
 * For DEBT: min(amount, total) so last (smaller) payment is correct.
 * Do not use for mark-paid or snowball-update logic.
 */
export function getEffectivePaymentAmount(p: Payment): number {
  if (p.type === "DEBT" && p.total != null) {
    return Math.min(p.amount, p.total);
  }
  return p.amount;
}

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * Human-readable interval label for a bill (e.g. "Weekly on Fri", "Monthly").
 * Used on Bills page for list display.
 */
export function getBillIntervalLabel(p: Payment): string {
  const interval = p.interval ?? "MONTHLY";
  if (interval === WEEKLY) {
    const day = p.dueDate?.toDate?.() ? getDay(p.dueDate.toDate()) : 0;
    return `${WEEKDAY_NAMES[day]}s`;
  }
  if (interval === BIWEEKLY) return "Biweekly";
  if (interval === MONTHLY) return "Monthly";
  if (interval === YEARLY) return "Yearly";
  if (interval === SPLIT) return "Split";
  return "Monthly";
}

/**
 * Approximate monthly amount for a bill (for Bills page monthly view).
 * WEEKLY → amount * 4.33, BIWEEKLY → amount * 2, MONTHLY/SPLIT → amount, YEARLY → amount / 12.
 */
export function getBillMonthlyAmount(p: Payment): number {
  const interval = p.interval ?? "MONTHLY";
  switch (interval) {
    case WEEKLY:
      return p.amount * (52 / 12);
    case BIWEEKLY:
      return p.amount * 2;
    case MONTHLY:
    case SPLIT:
      return p.amount;
    case YEARLY:
      return p.amount / 12;
    default:
      return p.amount;
  }
}

export function paymentsTotal(
  payments: Payment[],
  payPeriodInterval: Interval,
  payDate: Timestamp | null,
) {
  const remainingDebt = payments.reduce((acc, p: Payment) => {
    return p.type === "DEBT" && p.total ? acc + p.total : acc;
  }, 0);

  if (payDate == null) {
    return {
      currentBills: 0,
      totalBills: 0,
      currentDebts: 0,
      currentFunds: 0,
      monthlyDebts: 0,
      totalFunds: 0,
      remainingDebt,
      totalMonthlyPayments: 0,
    };
  }

  // Get all virtual payments for the month, then filter for current period totals
  const virtualPayments = getVirtualPaymentsForCurrentPeriod(
    payments,
    payPeriodInterval,
    payDate,
  );
  const totalMonthlyPayments = virtualPayments.reduce(
    (acc, p: Payment) => acc + getEffectivePaymentAmount(p),
    0,
  );
  const currentBills = virtualPayments.reduce((acc, p: Payment) => {
    return p.type === "BILL" &&
      isDateInCurrentPayPeriod(
        payPeriodInterval,
        payDate.toDate(),
        getPaymentCurrentDueDate(p),
      )
      ? acc + p.amount
      : acc;
  }, 0);
  const currentDebts = virtualPayments.reduce((acc, p: Payment) => {
    return p.type === "DEBT" &&
      isDateInCurrentPayPeriod(
        payPeriodInterval,
        payDate.toDate(),
        getPaymentCurrentDueDate(p),
      )
      ? acc + getEffectivePaymentAmount(p)
      : acc;
  }, 0);
  const currentFunds = virtualPayments.reduce((acc, p: Payment) => {
    return p.type === "FUND" &&
      isDateInCurrentPayPeriod(
        payPeriodInterval,
        payDate.toDate(),
        getPaymentCurrentDueDate(p),
      )
      ? acc + p.amount
      : acc;
  }, 0);
  const monthlyDebts = virtualPayments.reduce((acc, p: Payment) => {
    return p.type === "DEBT" ? acc + getEffectivePaymentAmount(p) : acc;
  }, 0);
  const totalBills = virtualPayments.reduce((acc, p: Payment) => {
    return p.type === "BILL" ? acc + p.amount : acc;
  }, 0);
  const totalFunds = virtualPayments.reduce((acc, p: Payment) => {
    return p.type === "FUND" ? acc + p.amount : acc;
  }, 0);
  return {
    currentBills,
    totalBills,
    currentDebts,
    currentFunds,
    monthlyDebts,
    totalFunds,
    remainingDebt,
    totalMonthlyPayments,
  };
}

/**
 * Returns the number of remaining payment periods (n),
 * or null if the debt cannot be paid off with the current payment.
 */
export function calculateRemainingDebtPayments(debt: Payment): number | null {
  if (!debt.total || !debt.amount) return null;

  const L = debt.total;
  const p = debt.amount;

  // When remaining balance <= payment amount, one more payment pays it off
  if (L <= p) return 1;

  if (!debt.interestRate) {
    if (p <= 0) return null;
    return Math.ceil(L / p);
  }

  const periodsPerYear =
    debt.interval === "MONTHLY"
      ? 12
      : debt.interval === "BIWEEKLY"
        ? 26
        : debt.interval === "WEEKLY"
          ? 52
          : debt.interval === "YEARLY"
            ? 1
            : 12;

  const annualRate = debt.interestRate / 100;
  const r = annualRate / periodsPerYear;

  if (r === 0) {
    if (p <= 0) return null;
    return Math.ceil(L / p);
  }

  // Payment too small to ever pay off (period interest exceeds payment)
  const minToPayOff = L * r;
  if (p <= minToPayOff) return null;

  const n = Math.log(p / (p - r * L)) / Math.log(1 + r);

  if (!Number.isFinite(n) || n <= 0) return null;

  return Math.ceil(n);
}

interface iDebtRemainder {
  payOffDate: Date;
  paymentsLeft: number;
}
export function calculatePayoffDate(
  debt: Payment,
  fromDate: Date = new Date(),
): iDebtRemainder | null {
  const paymentsLeft = calculateRemainingDebtPayments(debt);
  if (!paymentsLeft) return null;

  const interval = debt.interval ?? "MONTHLY";
  switch (interval) {
    case "MONTHLY":
      return { payOffDate: addMonths(fromDate, paymentsLeft), paymentsLeft };
    case "BIWEEKLY":
      return { payOffDate: addWeeks(fromDate, paymentsLeft * 2), paymentsLeft };
    case "WEEKLY":
      return { payOffDate: addWeeks(fromDate, paymentsLeft), paymentsLeft };
    case "YEARLY":
      return {
        payOffDate: addMonths(fromDate, paymentsLeft * 12),
        paymentsLeft,
      };
    default:
      return { payOffDate: addMonths(fromDate, paymentsLeft), paymentsLeft };
  }
}

/**
 * Periods per month for each interval (for snowball simulation).
 */
function periodsPerMonth(interval: Interval): number {
  switch (interval) {
    case "MONTHLY":
      return 1;
    case "BIWEEKLY":
      return 2;
    case "WEEKLY":
      return 4;
    case "YEARLY":
      return 1 / 12;
    default:
      return 1;
  }
}

/**
 * Simulates the debt snowball: minimums to all debts, snowball extra to target.
 * When a debt is paid off, its minimum rolls into the snowball and target moves to lowest balance.
 * Any unused snowball (remainder) from a payoff is applied to the next target in the same month,
 * recursively until spent or no debts remain.
 * Returns the date when the last debt would be paid off, or null if no debts / invalid.
 * @param extraMonthly - optional extra $/month toward the snowball target (e.g. 400 = $400 extra).
 */
export function calculateSnowballPayoffDate(
  debts: Payment[],
  snowball: number,
  snowballTargetId: string | null,
  fromDate: Date = new Date(),
  extraMonthly?: number,
): Date | null {
  if (debts.length === 0) return null;

  type DebtState = {
    id: string;
    balance: number;
    amount: number;
    interval: Interval;
  };
  const state: DebtState[] = debts
    .filter((d) => d.total != null && d.total > 0 && d.amount != null)
    .map((d) => ({
      id: d.id,
      balance: d.total!,
      amount: d.amount,
      interval: d.interval ?? "MONTHLY",
    }));
  if (state.length === 0) return null;

  const extra = extraMonthly != null ? Math.max(0, extraMonthly) : 0;
  let rollingSnowball = Math.max(0, snowball) + extra;
  let targetId =
    snowballTargetId && state.some((d) => d.id === snowballTargetId)
      ? snowballTargetId
      : ([...state].sort((a, b) => a.balance - b.balance)[0]?.id ?? null);

  let currentDate = startOfDay(fromDate);
  const maxMonths = 1200; // cap at ~100 years to avoid infinite loop
  let months = 0;

  while (state.length > 0 && months < maxMonths) {
    // One month of payments: each debt gets min, target gets + snowball
    let remainder = 0;
    for (const d of state) {
      const paymentPerPeriod =
        d.amount + (d.id === targetId ? rollingSnowball : 0);
      const periods = periodsPerMonth(d.interval);
      const payment = paymentPerPeriod * (periods > 0 ? periods : 1);
      const applied = Math.min(d.balance, payment);
      d.balance -= applied;
      if (d.id === targetId && applied > 0) {
        remainder = payment - applied;
      }
    }

    // Roll paid-off minimums into snowball and remove paid-off debts
    const paidOff = state.filter((d) => d.balance <= 0);
    for (const d of paidOff) {
      rollingSnowball += d.amount;
    }
    const remaining = state.filter((d) => d.balance > 0);
    state.length = 0;
    state.push(...remaining);

    if (state.length === 0) return currentDate;

    targetId = state.some((d) => d.id === targetId)
      ? targetId
      : ([...state].sort((a, b) => a.balance - b.balance)[0]?.id ?? null);

    // Apply remainder to next target(s) in the same month until spent or no debts
    while (remainder > 0 && state.length > 0 && targetId != null) {
      const target = state.find((d) => d.id === targetId);
      if (!target) break;
      const applied = Math.min(target.balance, remainder);
      target.balance -= applied;
      remainder -= applied;
      if (target.balance <= 0) {
        rollingSnowball += target.amount;
        remainder += target.amount;
        const idx = state.indexOf(target);
        if (idx !== -1) state.splice(idx, 1);
        if (state.length === 0) return currentDate;
        targetId =
          [...state].sort((a, b) => a.balance - b.balance)[0]?.id ?? null;
      } else {
        break;
      }
    }

    currentDate = addMonths(currentDate, 1);
    months++;
  }

  return months >= maxMonths ? currentDate : null;
}

/**
 * When a debt is paid off: compute next target (lowest remaining balance),
 * bake (snowball + paid-off amount) into that target's payment amount, and return updated payments.
 * Caller should set snowball to 0 after using this.
 */
export function applyPayoffRoll(
  payments: Payment[],
  paidOffPayment: Payment,
  snowball: number,
): { updatedPayments: Payment[]; nextTargetId: string | null } {
  const paidAmount = paidOffPayment.amount ?? 0;
  const newSnowball = snowball + paidAmount;
  const remainingDebts = payments.filter(
    (p) => p.type === "DEBT" && p.total != null && p.total > 0,
  );
  const nextTarget =
    remainingDebts.length > 0
      ? remainingDebts.sort((a, b) => (a.total ?? 0) - (b.total ?? 0))[0]
      : null;
  const nextId = nextTarget?.id ?? null;
  const updatedPayments =
    nextTarget != null
      ? payments.map((p) =>
          p.id === nextTarget.id
            ? { ...p, amount: (p.amount ?? 0) + newSnowball }
            : p,
        )
      : payments;
  return { updatedPayments, nextTargetId: nextId };
}

export function transformIntervalMidSentence(i: Interval) {
  switch (i) {
    case "WEEKLY":
      return "week";
    case "BIWEEKLY":
      return "other week";
    case "MONTHLY":
      return "month";
    case "YEARLY":
      return "year";
  }
}

/**
 * Removes undefined values from an object.
 * Firebase doesn't accept undefined values, so this cleans objects before saving.
 */
export function removeUndefinedValues<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned as Partial<T>;
}

/**
 * Cleans an array of payments by removing undefined values from each.
 * Used before sending to Firebase which doesn't accept undefined values.
 */
export function cleanPaymentsForFirebase(
  payments: Payment[],
): Record<string, unknown>[] {
  return payments.map((payment) =>
    removeUndefinedValues(payment as unknown as Record<string, unknown>),
  );
}

export const generateFreshPayment = () => {
  return {
    id: randomUUID(),
    name: "",
    type: undefined,
    amount: 0,
    paid: false,
    interval: undefined,
    dueDate: Timestamp.fromDate(new Date()),
  } as Payment;
};

/**
 * Adjusts a payment's dueDate to the current period, handling month cusp scenarios
 * Returns a new payment object without mutating the original
 */
export function adjustPaymentToCurrentPeriod(
  payment: Payment,
  payPeriodInterval: Interval,
  payDate: Timestamp,
): Payment {
  const today = startOfDay(new Date());
  const isOnCusp = isTodayCuspDate(payPeriodInterval, payDate);
  const { start: periodStart, end: periodEnd } = getCurrentIntervalDateRange(
    payPeriodInterval,
    payDate,
  );
  const payPeriodCrossesMonths =
    periodStart.getMonth() !== periodEnd.getMonth();
  const paymentDayNumber = payment.dueDate.toDate().getDate();
  const periodEndDayNumber = periodEnd.getDate();
  const shouldMoveToNextMonth =
    payPeriodCrossesMonths &&
    paymentDayNumber <= periodEndDayNumber &&
    isOnCusp;
  // console.log("current payperiod dates: ", { periodStart, periodEnd, payment: { ...payment, dueDate: payment.dueDate.toDate() }, payPeriodCrossesMonths, paymentDayNumber, periodEndDayNumber, shouldMoveToNextMonth, isOnCusp })

  // YEARLY: only show in the payment's due month (e.g. Jan 16 → Jan 16 of period year, not every month)
  let targetMonth: number;
  let targetYear: number;
  if (payment.interval === YEARLY) {
    targetMonth = payment.dueDate.toDate().getMonth();
    targetYear = periodStart.getFullYear();
  } else {
    targetMonth = shouldMoveToNextMonth
      ? today.getMonth() + 1
      : today.getMonth();
    targetYear = today.getFullYear();
  }
  const dayOfMonth = payment.dueDate.toDate().getDate();
  // Clamp to last day of month when day doesn't exist (e.g. 31st in February)
  const lastDay = lastDayOfMonth(new Date(targetYear, targetMonth, 1));
  const clampedDay = Math.min(dayOfMonth, lastDay.getDate());
  const adjustedDueDate = new Date(targetYear, targetMonth, clampedDay);

  return {
    ...payment,
    dueDate: Timestamp.fromDate(adjustedDueDate),
  };
}

/**
 * Checks if today is on a "cusp" where the current pay period extends into a different month.
 * Used to determine if monthly payments should be adjusted to show in the next month.
 * Returns true if the period end is in the future AND in a different month than today.
 */
export function isTodayCuspDate(payPeriod: Interval, payDate: Timestamp) {
  const today = startOfDay(new Date());
  const { end } = getCurrentIntervalDateRange(payPeriod, payDate);
  return isAfter(end, today) && end.getMonth() !== today.getMonth();
}

export function deriveIsPaid(payment: Payment, occurrenceDate?: Date): boolean {
  return (
    payment.paidDates?.some(
      (pd) =>
        startOfDay(pd.toDate()).getTime() ===
        startOfDay(occurrenceDate ?? payment.dueDate.toDate()).getTime(),
    ) ?? false
  );
}

/**
 * Generates virtual payment instances for weekly/biweekly payments within a date range.
 * Returns an array of payment objects, one for each occurrence within rangeStart to rangeEnd.
 * For monthly/yearly payments, returns array with single adjusted payment.
 */
export function getPaymentOccurrencesInRange(
  payment: Payment,
  payPeriodInterval: Interval,
  payDate: Timestamp,
  rangeStart: Date,
  rangeEnd: Date,
): Payment[] {
  // For monthly/yearly: only include if the (adjusted) due date falls within this pay period
  if (payment.interval === MONTHLY || payment.interval === YEARLY) {
    const adjusted = adjustPaymentToCurrentPeriod(
      payment,
      payPeriodInterval,
      payDate,
    );
    const dueDate = startOfDay(adjusted.dueDate.toDate());
    if (isWithinInterval(dueDate, { start: rangeStart, end: rangeEnd })) {
      return [adjusted];
    }
    return [];
  }

  // For SPLIT payments: divide monthly amount across user's pay periods
  if (payment.interval === "SPLIT") {
    return getSplitPaymentOccurrencesInRange(
      payment,
      payPeriodInterval,
      payDate,
      rangeStart,
      rangeEnd,
    );
  }

  // For weekly/biweekly, calculate all occurrences in the range
  const occurrences: Payment[] = [];

  // Find the first occurrence in or before the range
  let currentDate = calculateCurrentIntervalStart(
    payment.dueDate.toDate(),
    payment.interval,
  );

  // Walk forward and collect all occurrences in the range
  while (!isAfter(currentDate, rangeEnd)) {
    if (isWithinInterval(currentDate, { start: rangeStart, end: rangeEnd })) {
      occurrences.push({
        ...payment,
        id: `${payment.id}-${payment.interval}-${currentDate.getTime()}`, // Unique ID for each occurrence
        dueDate: Timestamp.fromDate(currentDate),
      });
    }

    currentDate =
      payment.interval === WEEKLY
        ? addWeeks(currentDate, 1)
        : addWeeks(currentDate, 2);
  }

  return occurrences;
}

/**
 * Generates virtual payment instances for the current pay period only.
 * Used for calculations that need just the current period's payments.
 */
export function getPaymentOccurrencesForPeriod(
  payment: Payment,
  payPeriodInterval: Interval,
  payDate: Timestamp,
): Payment[] {
  const { start: periodStart, end: periodEnd } = getCurrentIntervalDateRange(
    payPeriodInterval,
    payDate,
  );
  return getPaymentOccurrencesInRange(
    payment,
    payPeriodInterval,
    payDate,
    periodStart,
    periodEnd,
  );
}

/**
 * Generate virtual payment occurrences for SPLIT payments within a date range.
 *
 * Two modes:
 * - BILL with SPLIT interval - Monthly recurring like rent, splits across current month's pay periods
 * - FUND type - Planned expense, splits from today until target dueDate
 *
 * For example: $2000/month rent with weekly pay periods in a 4-week month = 4 payments of $500 each
 */
function getSplitPaymentOccurrencesInRange(
  payment: Payment,
  payPeriodInterval: Interval,
  payDate: Timestamp,
  displayRangeStart: Date,
  displayRangeEnd: Date,
): Payment[] {
  const occurrences: Payment[] = [];
  const today = startOfDay(new Date());

  // Determine mode: recurring (Bill with split) vs Fund (planned expense with target date)
  const isFund = payment.type === "FUND";

  let periodCount: number;

  if (!isFund) {
    // RECURRING MODE (Bill with split): Calculate split based on current month
    periodCount = getPayPeriodsInMonth(payDate, payPeriodInterval, today);
  } else {
    // FUND MODE: Calculate split amount using ALL periods until target date
    const targetDate = startOfDay(payment.dueDate.toDate());

    // If target date has passed, show nothing (will be handled by modal)
    if (targetDate < today) {
      return [];
    }

    periodCount = getPayPeriodsUntilDate(
      payDate,
      payPeriodInterval,
      targetDate,
    );
  }

  // Ensure periodCount is at least 1 to avoid division issues
  periodCount = Math.max(periodCount, 1);

  // Calculate the split amount per period
  const splitAmount = Number((payment.amount / periodCount).toFixed(2));

  // payDate is the user's pay date (could be recent or in the past)
  // We need to find ALL pay dates in the display range, so:
  // 1. Walk BACKWARD from payDate to find a pay date before the range start
  // 2. Then walk FORWARD to collect all pay dates in the range
  let currentPayDate = startOfDay(payDate.toDate());

  if (payPeriodInterval === WEEKLY || payPeriodInterval === BIWEEKLY) {
    // First, walk BACKWARD to find a pay date at or before displayRangeStart
    while (currentPayDate > displayRangeStart) {
      if (payPeriodInterval === WEEKLY) {
        currentPayDate = subWeeks(currentPayDate, 1);
      } else {
        currentPayDate = subWeeks(currentPayDate, 2);
      }
    }

    // Now walk FORWARD to find the first pay date that's within or after the range start
    while (currentPayDate < displayRangeStart) {
      if (payPeriodInterval === WEEKLY) {
        currentPayDate = addWeeks(currentPayDate, 1);
      } else {
        currentPayDate = addWeeks(currentPayDate, 2);
      }
    }
  } else {
    // For monthly payPeriodInterval, just use displayRangeStart
    currentPayDate = displayRangeStart;
  }

  // For Fund, cap the display at the target date
  const effectiveEnd = isFund
    ? payment.dueDate.toDate() < displayRangeEnd
      ? payment.dueDate.toDate()
      : displayRangeEnd
    : displayRangeEnd;

  // Generate virtual payments for each pay date in the display range
  while (currentPayDate <= effectiveEnd) {
    const occurrenceTime = startOfDay(currentPayDate).getTime();
    const isPaid =
      payment.paidDates?.some(
        (pd) => startOfDay(pd.toDate()).getTime() === occurrenceTime,
      ) ?? false;

    occurrences.push({
      ...payment,
      id: `${payment.id}-SPLIT-${currentPayDate.getTime()}`,
      amount: splitAmount,
      dueDate: Timestamp.fromDate(currentPayDate),
    });

    // Move to next pay period
    if (payPeriodInterval === WEEKLY) {
      currentPayDate = addWeeks(currentPayDate, 1);
    } else if (payPeriodInterval === BIWEEKLY) {
      currentPayDate = addWeeks(currentPayDate, 2);
    } else {
      // For monthly payPeriodInterval, only one occurrence
      break;
    }
  }

  // Ensure at least one occurrence (edge case - use calculated splitAmount, not full amount)
  if (occurrences.length === 0) {
    occurrences.push({
      ...payment,
      id: `${payment.id}-SPLIT-${displayRangeStart.getTime()}`,
      amount: splitAmount,
      dueDate: Timestamp.fromDate(displayRangeStart),
    });
  }

  return occurrences;
}

/**
 * Get all virtual payment occurrences for the current pay period only.
 * Used by MainView for display and paymentsTotal for calculations.
 * Aligns with getCurrentIntervalDateRange so we don't show dates outside the interval.
 * Automatically adds Snowball if > 0
 */
export function getVirtualPaymentsForCurrentPeriod(
  payments: Payment[],
  payPeriodInterval: Interval,
  payDate: Timestamp,
): Payment[] {
  const virtualPayments: Payment[] = [];
  const { start: periodStart, end: periodEnd } = getCurrentIntervalDateRange(
    payPeriodInterval,
    payDate,
  );

  for (const payment of payments) {
    const occurrences = getPaymentOccurrencesInRange(
      payment,
      payPeriodInterval,
      payDate,
      periodStart,
      periodEnd,
    );
    virtualPayments.push(...occurrences);
  }

  return virtualPayments.sort(
    (a, b) => a.dueDate.toMillis() - b.dueDate.toMillis(),
  );
}


/*
 * Helper to remove the added -INTERVAL- from a virtual Payment
 */
export function removeVirtualIdPortion(p: Payment) {
  return p.id.split(`-${p.interval}`)[0];
}

export function getBackupDataFromTimestampString(ts: string, backups: Backup) {
  return backups.data.find((b) => b.backupTimeStamp.toString() === ts);
}

/**
 * Calculate total number of pay periods in a given month.
 * Used for SPLIT payment calculations to divide monthly amounts across pay periods.
 *
 * @param payDate - User's pay date (used to align pay periods)
 * @param interval - User's pay period interval (WEEKLY, BIWEEKLY, MONTHLY)
 * @param targetMonth - Optional: the month to calculate for (defaults to current month)
 * @returns Number of pay periods in the month
 */
export function getPayPeriodsInMonth(
  payDate: Timestamp,
  interval: Interval,
  targetMonth: Date = new Date(),
): number {
  if (!interval || interval === "YEARLY" || interval === "SPLIT") {
    // YEARLY and SPLIT don't make sense here, MONTHLY is always 1
    return 1;
  }

  if (interval === "MONTHLY") {
    return 1;
  }

  const monthStart = startOfMonth(targetMonth);
  const monthEnd = endOfMonth(targetMonth);

  // payDate is the user's pay date (could be recent or in the past)
  // We need to find ALL pay dates in the month, so:
  // 1. Walk BACKWARD from payDate to find a pay date before the month start
  // 2. Then walk FORWARD to find the first pay date in the month
  let currentPayDate = startOfDay(payDate.toDate());

  // First, walk BACKWARD to find a pay date at or before monthStart
  while (currentPayDate > monthStart) {
    if (interval === "WEEKLY") {
      currentPayDate = subWeeks(currentPayDate, 1);
    } else if (interval === "BIWEEKLY") {
      currentPayDate = subWeeks(currentPayDate, 2);
    }
  }

  // Now walk FORWARD to find the first pay date that's within or after the month start
  while (currentPayDate < monthStart) {
    if (interval === "WEEKLY") {
      currentPayDate = addWeeks(currentPayDate, 1);
    } else if (interval === "BIWEEKLY") {
      currentPayDate = addWeeks(currentPayDate, 2);
    }
  }

  // Count all pay periods in the month
  let count = 0;
  while (currentPayDate <= monthEnd) {
    count++;
    if (interval === "WEEKLY") {
      currentPayDate = addWeeks(currentPayDate, 1);
    } else if (interval === "BIWEEKLY") {
      currentPayDate = addWeeks(currentPayDate, 2);
    }
  }

  // Ensure at least 1 period (edge case protection)
  return Math.max(count, 1);
}

/**
 * Calculate total number of pay periods from today until a target date.
 * Used for Fund (planned expense) mode to divide a target amount across remaining pay periods.
 *
 * @param payDate - User's pay date (used to align pay periods)
 * @param payPeriodInterval - User's pay period interval (WEEKLY, BIWEEKLY, MONTHLY)
 * @param targetDate - The target date for the planned expense
 * @returns Number of pay periods from today until target date
 */
export function getPayPeriodsUntilDate(
  payDate: Timestamp,
  payPeriodInterval: Interval,
  targetDate: Date,
): number {
  if (
    !payPeriodInterval ||
    payPeriodInterval === "YEARLY" ||
    payPeriodInterval === "SPLIT"
  ) {
    return 1;
  }

  if (payPeriodInterval === "MONTHLY") {
    // Count months from now until target
    const today = startOfDay(new Date());
    const target = startOfDay(targetDate);
    let count = 0;
    let current = today;
    while (current <= target) {
      count++;
      current = addMonths(current, 1);
    }
    return Math.max(count, 1);
  }

  const today = startOfDay(new Date());
  const target = startOfDay(targetDate);

  // payDate is the user's original/first paycheck date (always in the past)
  // Step forward from that anchor to find the first pay date on or after today
  let currentPayDate = startOfDay(payDate.toDate());

  while (currentPayDate < today) {
    if (payPeriodInterval === "WEEKLY") {
      currentPayDate = addWeeks(currentPayDate, 1);
    } else if (payPeriodInterval === "BIWEEKLY") {
      currentPayDate = addWeeks(currentPayDate, 2);
    }
  }

  // Count all pay periods from today until target date
  let count = 0;
  while (currentPayDate <= target) {
    count++;
    if (payPeriodInterval === "WEEKLY") {
      currentPayDate = addWeeks(currentPayDate, 1);
    } else if (payPeriodInterval === "BIWEEKLY") {
      currentPayDate = addWeeks(currentPayDate, 2);
    }
  }

  // Ensure at least 1 period
  return Math.max(count, 1);
}

export function createTransactionId(user: User) {
  return `${new Date().getTime()}-${user.uid.slice(0, 6)}-${Math.random().toString(36).slice(2, 8)}`;
}
