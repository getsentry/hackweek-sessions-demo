// A pool of fake users to stand in for whoever "logged in" on this pageload.
// The shapes vary on purpose: id only, id + email, id + name + email, email only.

export type DemoUser = {
  id?: string;
  username?: string;
  email?: string;
};

export const DEMO_USERS: DemoUser[] = [
  { id: "u_1001" },
  { id: "u_1002" },
  { id: "u_1003" },
  { id: "u_1004", email: "ada@example.com" },
  { id: "u_1005", email: "grace@example.com" },
  { id: "u_1006", email: "linus@example.com" },
  { id: "u_1007", email: "margaret@example.com" },
  { id: "u_1008", username: "Alan Turing", email: "alan@example.com" },
  { id: "u_1009", username: "Barbara Liskov", email: "barbara@example.com" },
  { id: "u_1010", username: "Ken Thompson", email: "ken@example.com" },
  { id: "u_1011", username: "Radia Perlman", email: "radia@example.com" },
  { id: "u_1012", username: "Donald Knuth", email: "donald@example.com" },
  { email: "anon-1@example.com" },
  { email: "anon-2@example.com" },
  { email: "anon-3@example.com" },
];

export function pickRandomDemoUser(): DemoUser {
  return DEMO_USERS[Math.floor(Math.random() * DEMO_USERS.length)];
}
