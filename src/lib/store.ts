import "server-only";
import * as Sentry from "@sentry/nextjs";
import type { Order } from "@/lib/orders";

export type { Order, OrderStatus } from "@/lib/orders";

const CUSTOMERS = ["ada", "grace", "linus", "margaret", "alan", "barbara"];
const ITEMS = [
  "Widget",
  "Sprocket",
  "Flux capacitor",
  "Rubber duck",
  "Yak shears",
  "Bikeshed paint",
];

type Store = {
  orders: Order[];
  seq: number;
};

// Survive HMR in dev so the list doesn't reset on every file save.
const globalStore = globalThis as typeof globalThis & {
  __demoStore?: Store;
};

function seed(): Store {
  const store: Store = { orders: [], seq: 0 };
  for (let i = 0; i < 4; i++) {
    store.seq += 1;
    store.orders.push({
      id: `ORD-${String(1000 + store.seq)}`,
      customer: CUSTOMERS[i % CUSTOMERS.length],
      item: ITEMS[i % ITEMS.length],
      amountCents: 1499 + i * 2600,
      status: i === 0 ? "shipped" : "pending",
      // Fixed offsets keep server and client markup in agreement.
      createdAt: new Date(Date.UTC(2026, 7, 10 + i, 9, 30)).toISOString(),
    });
  }
  return store;
}

function store(): Store {
  globalStore.__demoStore ??= seed();
  return globalStore.__demoStore;
}

/** Pretend to talk to a database, as a child span of the current request. */
function query<T>(name: string, ms: number, run: () => T): Promise<T> {
  return Sentry.startSpan(
    { name, op: "db.query", attributes: { "db.system": "in-memory" } },
    async () => {
      await new Promise((resolve) => setTimeout(resolve, ms));
      return run();
    },
  );
}

export function listOrders(): Promise<Order[]> {
  return query("SELECT * FROM orders", 40 + Math.random() * 120, () =>
    [...store().orders].reverse(),
  );
}

export function createOrder(input?: Partial<Order>): Promise<Order> {
  return query("INSERT INTO orders", 60 + Math.random() * 180, () => {
    const s = store();
    s.seq += 1;
    const order: Order = {
      id: `ORD-${String(1000 + s.seq)}`,
      customer: input?.customer ?? pick(CUSTOMERS),
      item: input?.item ?? pick(ITEMS),
      amountCents: input?.amountCents ?? 500 + Math.floor(Math.random() * 9500),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    s.orders.push(order);
    return order;
  });
}

export function countOrders() {
  const orders = store().orders;
  return {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    revenueCents: orders.reduce((sum, o) => sum + o.amountCents, 0),
  };
}

function pick<T>(xs: T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}
