import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Category, Store, Item, ShoppingItem } from "./types";
import { DEFAULT_CATEGORIES, DEFAULT_STORES, DEFAULT_ITEMS } from "./defaultData";

export type SharedData = {
  categories: Category[];
  stores: Store[];
  items: Item[];
  shoppingList: ShoppingItem[];
};

const sharedRef = () => doc(db, "shared", "data");

/** 初回アクセス時にデフォルトデータを書き込む */
export async function initSharedData(): Promise<void> {
  const ref = sharedRef();
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      categories: DEFAULT_CATEGORIES,
      stores: DEFAULT_STORES,
      items: DEFAULT_ITEMS,
      shoppingList: [],
    });
  }
}

/** Firestore をリアルタイム監視。アンサブスクライブ関数を返す */
export function subscribeSharedData(
  onChange: (data: SharedData) => void,
): () => void {
  return onSnapshot(sharedRef(), (snap) => {
    if (snap.exists()) {
      onChange(snap.data() as SharedData);
    }
  });
}

/** 共有データの一部を更新する */
export async function updateSharedData(
  partial: Partial<SharedData>,
): Promise<void> {
  await setDoc(sharedRef(), partial, { merge: true });
}
