// Types and helpers shared by client and server. Keep this file free of
// server-only imports so it can be pulled into client bundles cheaply.

export type OrderStatus = "pending" | "shipped" | "cancelled";

export type Order = {
  id: string;
  customer: string;
  item: string;
  amountCents: number;
  status: OrderStatus;
  createdAt: string;
};

export function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}
