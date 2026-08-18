import { apiFetch } from "./client";

export async function getBalance(query = "") {
  const path = query ? `/api/wallet/balance?${query}` : "/api/wallet/balance";
  return apiFetch(path, { method: "GET" });
}

export async function addFunds(body) {
  return apiFetch("/api/wallet/add", { method: "POST", body });
}

export async function getTransactions(query = "") {
  const path = query ? `/api/wallet/transactions?${query}` : "/api/wallet/transactions";
  return apiFetch(path, { method: "GET" });
}

export default { getBalance, addFunds, getTransactions };
