import type { Category, Store, Item } from "./types";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-food",      name: "食品",   emoji: "🥩", colorIndex: 0 },
  { id: "cat-seasoning", name: "調味料", emoji: "🧂", colorIndex: 1 },
  { id: "cat-daily",     name: "日用品", emoji: "🧴", colorIndex: 2 },
  { id: "cat-drink",     name: "飲料",   emoji: "🥤", colorIndex: 3 },
  { id: "cat-snack",     name: "お菓子", emoji: "🍬", colorIndex: 4 },
];

export const DEFAULT_STORES: Store[] = [
  { id: "store-1", name: "スーパー" },
  { id: "store-2", name: "ドラッグストア" },
  { id: "store-3", name: "コンビニ" },
  { id: "store-4", name: "Amazon" },
  { id: "store-5", name: "楽天" },
];

export const DEFAULT_ITEMS: Item[] = [
  {
    id: "item-milk", categoryId: "cat-food", name: "牛乳",
    prices: [
      { id: "p1", storeId: "store-1", price: 198, memo: "1L", date: "2026-03-10" },
      { id: "p2", storeId: "store-3", price: 230, memo: "1L", date: "2026-03-10" },
    ],
  },
  {
    id: "item-egg", categoryId: "cat-food", name: "卵",
    prices: [
      { id: "p3", storeId: "store-1", price: 178, memo: "10個入り", date: "2026-03-11" },
      { id: "p4", storeId: "store-2", price: 148, memo: "10個入り", date: "2026-03-12" },
    ],
  },
  {
    id: "item-bread", categoryId: "cat-food", name: "食パン",
    prices: [
      { id: "p5", storeId: "store-1", price: 148, memo: "6枚切り", date: "2026-03-13" },
      { id: "p6", storeId: "store-3", price: 198, memo: "6枚切り", date: "2026-03-11" },
    ],
  },
  {
    id: "item-soy", categoryId: "cat-seasoning", name: "醤油",
    prices: [
      { id: "p7",  storeId: "store-1", price: 198, memo: "1L",              date: "2026-03-10" },
      { id: "p8",  storeId: "store-4", price: 175, memo: "1L × 2本セット相当", date: "2026-03-09" },
    ],
  },
  {
    id: "item-miso", categoryId: "cat-seasoning", name: "味噌",
    prices: [
      { id: "p9",  storeId: "store-1", price: 298, memo: "750g", date: "2026-03-08" },
      { id: "p10", storeId: "store-5", price: 260, memo: "750g", date: "2026-03-10" },
    ],
  },
  {
    id: "item-shampoo", categoryId: "cat-daily", name: "シャンプー",
    prices: [
      { id: "p11", storeId: "store-1", price: 398, memo: "450ml", date: "2026-03-08" },
      { id: "p12", storeId: "store-2", price: 348, memo: "450ml", date: "2026-03-10" },
      { id: "p13", storeId: "store-4", price: 320, memo: "450ml", date: "2026-03-11" },
    ],
  },
  {
    id: "item-tissue", categoryId: "cat-daily", name: "ティッシュ",
    prices: [
      { id: "p14", storeId: "store-1", price: 398, memo: "5箱セット", date: "2026-03-09" },
      { id: "p15", storeId: "store-2", price: 368, memo: "5箱セット", date: "2026-03-10" },
    ],
  },
  {
    id: "item-tea", categoryId: "cat-drink", name: "お茶",
    prices: [
      { id: "p16", storeId: "store-3", price: 160, memo: "500ml", date: "2026-03-12" },
      { id: "p17", storeId: "store-1", price:  88, memo: "500ml", date: "2026-03-10" },
    ],
  },
  {
    id: "item-coffee", categoryId: "cat-drink", name: "缶コーヒー",
    prices: [
      { id: "p18", storeId: "store-3", price: 160, memo: "185g", date: "2026-03-11" },
      { id: "p19", storeId: "store-1", price: 110, memo: "185g", date: "2026-03-10" },
    ],
  },
  {
    id: "item-chips", categoryId: "cat-snack", name: "ポテトチップス",
    prices: [
      { id: "p20", storeId: "store-3", price: 160, memo: "60g", date: "2026-03-11" },
      { id: "p21", storeId: "store-1", price: 138, memo: "60g", date: "2026-03-09" },
    ],
  },
];
