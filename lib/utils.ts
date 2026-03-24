export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function loadData<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

/** 単価を計算して表示文字列を返す */
export function calcUnitPrice(
  price: number,
  quantity: number,
  unit: string,
): { value: string; per: string } | null {
  if (!quantity || quantity <= 0) return null;
  const u = unit.toLowerCase();
  let perValue: number;
  let perLabel: string;
  if (u === "ml") {
    perValue = (price / quantity) * 100;
    perLabel = "100ml";
  } else if (u === "l") {
    perValue = (price / (quantity * 1000)) * 100;
    perLabel = "100ml";
  } else if (u === "g") {
    perValue = (price / quantity) * 100;
    perLabel = "100g";
  } else if (u === "kg") {
    perValue = (price / (quantity * 1000)) * 100;
    perLabel = "100g";
  } else {
    perValue = price / quantity;
    perLabel = `1${unit}`;
  }
  const formatted = perValue < 10
    ? perValue.toFixed(1)
    : Math.round(perValue).toString();
  return { value: formatted, per: perLabel };
}
