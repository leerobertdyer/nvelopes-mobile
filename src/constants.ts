/** Single doc id under budgets/{budgetId}/data (holds envelopes, payments, etc.) */
export const BUDGET_DATA_DOC_ID = "main";

export const WEEKLY = "WEEKLY";
export const BIWEEKLY = "BIWEEKLY";
export const MONTHLY = "MONTHLY";
export const YEARLY = "YEARLY";
export const SPLIT = "SPLIT"; // Monthly amount split across pay periods (e.g., rent/mortgage)
export const FIXED = "FIXED";
export const BILL = "BILL";
export const DEBT = "DEBT";

/** id of the synthetic "payment" that tracks accumulated snowball funds. */
export const SNOWBALL_PAYMENT_ID = "SNOWBALL";
/** display name for the snowball row; kept for legacy rows that only have a name match. */
export const SNOWBALL_PAYMENT_NAME = "❄️Snowball❄️";