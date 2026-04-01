export type Category = {
  id: string;
  name: string;
  emoji: string;
  colorIndex: number;
};

export type Store = {
  id: string;
  name: string;
  memo?: string;
  favorite?: boolean;
};

export type PriceEntry = {
  id: string;
  storeId: string;
  price: number;
  memo: string;
  date: string;
  quantity?: number;
  unit?: string;
  discountPct?: number;
};

export type Item = {
  id: string;
  categoryId: string;
  name: string;
  prices: PriceEntry[];
};

export type ShoppingItem = {
  id: string;
  label: string;
  checked: boolean;
};
