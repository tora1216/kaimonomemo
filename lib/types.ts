export type Category = {
  id: string;
  name: string;
  emoji: string;
  colorIndex: number;
};

export type Store = {
  id: string;
  name: string;
};

export type PriceEntry = {
  id: string;
  storeId: string;
  price: number;
  memo: string;
  date: string;
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
