"use client";

import { useState, useEffect, useRef } from "react";
import {
  SunIcon,
  MoonIcon,
  Cog6ToothIcon,
  BuildingStorefrontIcon,
  PencilIcon,
  ArrowUpOnSquareIcon,
  ClipboardDocumentListIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Category, Store, Item, PriceEntry, ShoppingItem } from "@/lib/types";
import { CATEGORY_COLORS, EMOJI_OPTIONS, ICON_BTN } from "@/lib/constants";
import { DEFAULT_CATEGORIES, DEFAULT_STORES, DEFAULT_ITEMS } from "@/lib/defaultData";
import { uid, loadData } from "@/lib/utils";
import { APP_VERSION, CHANGELOG } from "@/lib/changelog";

// ===================== Main App =====================
export default function Home() {
  const [hydrated, setHydrated] = useState(false);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [stores, setStores]         = useState<Store[]>(DEFAULT_STORES);
  const [items, setItems]           = useState<Item[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("cat-food");
  const [editMode, setEditMode]     = useState(false);
  const [theme, setTheme]           = useState<"light" | "dark">("light");

  const [showAddDialog,    setShowAddDialog]    = useState(false);
  const [showAddCategory,  setShowAddCategory]  = useState(false);
  const [showStoreManager, setShowStoreManager] = useState(false);
  const [showSettings,     setShowSettings]     = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [selectedItem,     setSelectedItem]     = useState<Item | null>(null);
  const [shoppingList,     setShoppingList]     = useState<ShoppingItem[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    setCategories(  loadData("kaimono_categories",    DEFAULT_CATEGORIES));
    setStores(      loadData("kaimono_stores",        DEFAULT_STORES));
    setItems(       loadData("kaimono_items",         DEFAULT_ITEMS));
    setShoppingList(loadData("kaimono_shopping_list", []));
    const savedTheme = localStorage.getItem("kaimono_theme") as "light" | "dark" | null;
    const initial = savedTheme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("kaimono_theme", theme);
  }, [theme]);

  useEffect(() => { if (hydrated) localStorage.setItem("kaimono_categories",    JSON.stringify(categories));   }, [categories,   hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("kaimono_stores",        JSON.stringify(stores));       }, [stores,       hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("kaimono_items",         JSON.stringify(items));        }, [items,        hydrated]);
  useEffect(() => { if (hydrated) localStorage.setItem("kaimono_shopping_list", JSON.stringify(shoppingList)); }, [shoppingList, hydrated]);

  const filteredItems = items.filter((i) => i.categoryId === activeCategory);
  const activeCat    = categories.find((c) => c.id === activeCategory);
  const activeColors = CATEGORY_COLORS[(activeCat?.colorIndex ?? 0) % CATEGORY_COLORS.length];

  function handleItemDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const categoryItems = prev.filter((i) => i.categoryId === activeCategory);
      const oldIndex = categoryItems.findIndex((i) => i.id === active.id);
      const newIndex = categoryItems.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(categoryItems, oldIndex, newIndex);
      let catIdx = 0;
      return prev.map((item) =>
        item.categoryId === activeCategory ? reordered[catIdx++] : item
      );
    });
  }

  function handleAddSubmit(itemName: string, categoryId: string, storeId: string, price: number, memo: string) {
    const entry: PriceEntry = { id: uid(), storeId, price, memo, date: new Date().toISOString().split("T")[0] };
    setItems((prev) => {
      const target = prev.find((i) => i.name === itemName && i.categoryId === categoryId);
      if (!target) return [...prev, { id: uid(), categoryId, name: itemName, prices: [entry] }];
      return prev.map((i) => (i.id === target.id ? { ...i, prices: [...i.prices, entry] } : i));
    });
    setShowAddDialog(false);
  }

  function handleAddPriceForItem(itemId: string, storeId: string, price: number, memo: string) {
    const entry: PriceEntry = { id: uid(), storeId, price, memo, date: new Date().toISOString().split("T")[0] };
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, prices: [...i.prices, entry] } : i)));
    setSelectedItem((prev) => (prev?.id === itemId ? { ...prev, prices: [...prev.prices, entry] } : prev));
  }

  function handleDeleteEntry(itemId: string, entryId: string) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, prices: i.prices.filter((p) => p.id !== entryId) } : i)));
    setSelectedItem((prev) => (prev?.id === itemId ? { ...prev, prices: prev.prices.filter((p) => p.id !== entryId) } : prev));
  }

  function handleDeleteItem(itemId: string) {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setSelectedItem(null);
  }

  function handleDeleteStore(storeId: string) {
    setStores((prev) => prev.filter((s) => s.id !== storeId));
    setItems((prev) =>
      prev
        .map((item) => ({ ...item, prices: item.prices.filter((p) => p.storeId !== storeId) }))
        .filter((item) => item.prices.length > 0)
    );
  }

  const categoryNav = (
    <>
      {categories.map((cat) => {
        const colors   = CATEGORY_COLORS[cat.colorIndex % CATEGORY_COLORS.length];
        const isActive = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all w-full text-left ${
              isActive ? colors.activeTab + " shadow-sm" : colors.tab + " hover:opacity-80"
            }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.name}</span>
            {isActive && (
              <span className="ml-auto text-xs opacity-70">{filteredItems.length}</span>
            )}
          </button>
        );
      })}
      <button
        onClick={() => setShowAddCategory(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors w-full text-left"
      >
        <span className="w-5 h-5 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-xs">+</span>
        <span>カテゴリ追加</span>
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">

      {/* ── Header (full-width, all screens) ── */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:bg-slate-800/90 dark:border-slate-700">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">🐯</span>
            <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
              買い物メモ
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={ICON_BTN}
              aria-label="テーマ切り替え"
            >
              {theme === "dark"
                ? <SunIcon className="h-5 w-5" />
                : <MoonIcon className="h-5 w-5" />
              }
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className={ICON_BTN}
              aria-label="設定"
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setShowStoreManager(true)}
              className={ICON_BTN}
              aria-label="店舗管理"
            >
              <BuildingStorefrontIcon className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => setShowShoppingList(true)}
              className={`relative ${ICON_BTN}`}
              aria-label="買うものリスト"
            >
              <ClipboardDocumentListIcon className="h-6 w-6" />
              {shoppingList.filter((i) => !i.checked).length > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
                  {shoppingList.filter((i) => !i.checked).length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Category tabs (mobile only) ── */}
      <div className="md:hidden bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {categories.map((cat) => {
            const colors   = CATEGORY_COLORS[cat.colorIndex % CATEGORY_COLORS.length];
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive ? colors.activeTab + " shadow-sm scale-105" : colors.tab + " hover:opacity-80"
                }`}
              >
                {cat.emoji} {cat.name}
              </button>
            );
          })}
          <button
            onClick={() => setShowAddCategory(true)}
            className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 text-lg flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            +
          </button>
        </div>
      </div>

      <div className="md:flex">
        {/* ── Desktop sidebar ── */}
        <aside className="hidden md:flex md:flex-col md:w-56 md:min-h-[calc(100vh-53px)] md:sticky md:top-[53px] md:h-[calc(100vh-53px)] bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 shadow-sm flex-shrink-0">
          <nav className="flex-1 overflow-y-auto p-3 space-y-1 pt-4">{categoryNav}</nav>
        </aside>

        {/* ── Main content ── */}
        <div className="flex-1 min-h-screen">
          <div className="hidden md:flex items-center justify-between px-8 pt-6 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {activeCat?.emoji} {activeCat?.name}
              </h2>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{filteredItems.length}件のアイテム</p>
            </div>
            {filteredItems.length > 0 && (
              <button
                onClick={() => setEditMode((v) => !v)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                  editMode
                    ? "bg-amber-400 text-white shadow-sm hover:bg-amber-300"
                    : "bg-[#22C55E] text-white shadow-sm hover:bg-green-400"
                }`}
              >
                {editMode ? (
                  <><span>✓</span> 編集完了</>
                ) : (
                  <><PencilIcon className="h-3.5 w-3.5" /> 並び替え</>
                )}
              </button>
            )}
          </div>

          <main className="px-4 py-4 pb-28 md:px-8 md:pb-12">
            {!hydrated ? (
              <div className="text-center py-20 text-slate-300 dark:text-slate-600 text-sm">読み込み中...</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">📦</div>
                <p className="text-slate-400 dark:text-slate-500 text-sm">アイテムがありません</p>
                <p className="text-slate-300 dark:text-slate-600 text-xs mt-1">右下の＋ボタンから追加してください</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleItemDragEnd}
              >
                <SortableContext
                  items={filteredItems.map((i) => i.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredItems.map((item) => (
                      <SortableItemCard
                        key={item.id}
                        item={item}
                        stores={stores}
                        activeColors={activeColors}
                        editMode={editMode}
                        onClick={() => { if (!editMode) setSelectedItem(item); }}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </main>
        </div>
      </div>

      {/* ── FAB (add) ── */}
      <button
        onClick={() => setShowAddDialog(true)}
        className="fixed bottom-6 right-6 w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-full shadow-xl text-2xl md:text-3xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-20"
      >
        ＋
      </button>

      {/* ── Edit mode toggle (mobile, bottom-left) ── */}
      {filteredItems.length > 0 && (
        <button
          onClick={() => setEditMode((v) => !v)}
          className={`md:hidden fixed bottom-6 left-6 z-20 flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg active:scale-95 transition-all ${
            editMode
              ? "bg-amber-400 text-white hover:bg-amber-300"
              : "bg-[#22C55E] text-white hover:bg-green-400"
          }`}
        >
          {editMode ? (
            <><span>✓</span> 編集完了</>
          ) : (
            <><PencilIcon className="h-3.5 w-3.5" /> 並び替え</>
          )}
        </button>
      )}

      {/* ── Dialogs ── */}
      {selectedItem && (
        <PriceDetailSheet
          item={selectedItem}
          items={items}
          stores={stores}
          activeColors={activeColors}
          onClose={() => setSelectedItem(null)}
          onAddPrice={(storeId, price, memo) => handleAddPriceForItem(selectedItem.id, storeId, price, memo)}
          onDeleteEntry={(entryId) => handleDeleteEntry(selectedItem.id, entryId)}
          onDeleteItem={() => handleDeleteItem(selectedItem.id)}
        />
      )}
      {showAddDialog && (
        <AddDialog
          categories={categories}
          stores={stores}
          defaultCategoryId={activeCategory}
          onClose={() => setShowAddDialog(false)}
          onSubmit={handleAddSubmit}
        />
      )}
      {showAddCategory && (
        <AddCategoryDialog
          existingCount={categories.length}
          onClose={() => setShowAddCategory(false)}
          onSubmit={(name, emoji) => {
            setCategories((prev) => [...prev, { id: uid(), name, emoji, colorIndex: prev.length % CATEGORY_COLORS.length }]);
            setShowAddCategory(false);
          }}
        />
      )}
      {showStoreManager && (
        <StoreManagerDialog
          stores={stores}
          onClose={() => setShowStoreManager(false)}
          onAdd={(name) => setStores((prev) => [...prev, { id: uid(), name }])}
          onDelete={handleDeleteStore}
        />
      )}
      {showSettings && (
        <SettingsDialog onClose={() => setShowSettings(false)} />
      )}
      {showShoppingList && (
        <ShoppingListSheet
          list={shoppingList}
          onClose={() => setShowShoppingList(false)}
          onAdd={(label: string) =>
            setShoppingList((prev) => [...prev, { id: `todo-${Date.now()}`, label, checked: false }])
          }
          onToggle={(id: string) =>
            setShoppingList((prev) =>
              prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))
            )
          }
          onDelete={(id: string) =>
            setShoppingList((prev) => prev.filter((i) => i.id !== id))
          }
          onClearDone={() =>
            setShoppingList((prev) => prev.filter((i) => !i.checked))
          }
        />
      )}
    </div>
  );
}

// ===================== SortableItemCard =====================
function SortableItemCard({
  item, stores, activeColors, editMode, onClick,
}: {
  item: Item;
  stores: Store[];
  activeColors: (typeof CATEGORY_COLORS)[number];
  editMode: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !editMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const minPrice = item.prices.length > 0 ? Math.min(...item.prices.map((p) => p.price)) : null;
  const minEntry = minPrice !== null ? item.prices.find((p) => p.price === minPrice) : null;
  const minStore = minEntry ? stores.find((s) => s.id === minEntry.storeId) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-l-4 ${activeColors.accent} ${
        isDragging ? "opacity-50 shadow-lg scale-105" : "hover:shadow-md dark:hover:shadow-slate-900/50"
      } transition-all`}
    >
      <button
        onClick={onClick}
        disabled={editMode}
        className="w-full text-left px-3 py-2 pr-9 active:scale-95 transition-transform disabled:active:scale-100"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate flex-1">{item.name}</span>
          {minPrice !== null ? (
            <span className={`text-sm font-bold flex-shrink-0 ${activeColors.price}`}>
              ¥{minPrice.toLocaleString()}
            </span>
          ) : (
            <span className="text-xs text-slate-300 dark:text-slate-600 flex-shrink-0">未登録</span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-slate-300 dark:text-slate-600">
            {item.prices.length > 0 ? `${item.prices.length}件 →` : "価格を追加"}
          </span>
          {minStore && (
            <span className="text-xs text-slate-400 dark:text-slate-500">{minStore.name}</span>
          )}
        </div>
      </button>
      {editMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing touch-none"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current">
            <circle cx="7"  cy="5"  r="1.5"/>
            <circle cx="13" cy="5"  r="1.5"/>
            <circle cx="7"  cy="10" r="1.5"/>
            <circle cx="13" cy="10" r="1.5"/>
            <circle cx="7"  cy="15" r="1.5"/>
            <circle cx="13" cy="15" r="1.5"/>
          </svg>
        </div>
      )}
    </div>
  );
}

// ===================== PriceDetailSheet =====================
function PriceDetailSheet({
  item, items, stores, activeColors, onClose, onAddPrice, onDeleteEntry, onDeleteItem,
}: {
  item: Item;
  items: Item[];
  stores: Store[];
  activeColors: (typeof CATEGORY_COLORS)[number];
  onClose: () => void;
  onAddPrice: (storeId: string, price: number, memo: string) => void;
  onDeleteEntry: (entryId: string) => void;
  onDeleteItem: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [storeId, setStoreId]   = useState(stores[0]?.id ?? "");
  const [price,   setPrice]     = useState("");
  const [memo,    setMemo]      = useState("");

  const currentItem  = items.find((i) => i.id === item.id) ?? item;
  const sortedPrices = [...currentItem.prices].sort((a, b) => a.price - b.price);

  function handleAdd(e: React.SyntheticEvent) {
    e.preventDefault();
    const p = parseInt(price);
    if (!p || !storeId) return;
    onAddPrice(storeId, p, memo);
    setPrice(""); setMemo(""); setShowForm(false);
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end md:items-center md:justify-center md:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-t-3xl md:rounded-3xl max-h-[85vh] flex flex-col z-10 shadow-2xl w-full md:max-w-lg">
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-600 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{currentItem.name}</h2>
          <div className="flex items-center gap-2">
            <button onClick={onDeleteItem} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              削除
            </button>
            <button onClick={onClose} className="text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 text-xl p-1">✕</button>
          </div>
        </div>

        {/* ショッピングリンク */}
        <div className="flex items-center gap-2 px-5 pb-3">
          {[
            {
              label: "Amazon",
              url: `https://www.amazon.co.jp/s?k=${encodeURIComponent(currentItem.name)}`,
              bg: "bg-[#FF9900]",
              text: "text-white",
            },
            {
              label: "Yahoo!",
              url: `https://shopping.yahoo.co.jp/search?p=${encodeURIComponent(currentItem.name)}`,
              bg: "bg-[#FF0033]",
              text: "text-white",
            },
            {
              label: "楽天",
              url: `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(currentItem.name)}/`,
              bg: "bg-[#BF0000]",
              text: "text-white",
            },
          ].map(({ label, url, bg, text }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${bg} ${text} hover:opacity-85 transition-opacity`}
            >
              {label}
              <svg className="h-3 w-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-5">
          {sortedPrices.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">価格情報がありません</div>
          ) : (
            <div className="space-y-2 pb-2">
              {sortedPrices.map((entry, i) => {
                const store      = stores.find((s) => s.id === entry.storeId);
                const isCheapest = i === 0;
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-3 rounded-xl ${
                      isCheapest
                        ? "bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600"
                        : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700 dark:text-slate-200">{store?.name ?? "不明"}</span>
                        {isCheapest && (
                          <span className="text-xs bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full font-medium">最安</span>
                        )}
                      </div>
                      {entry.memo && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{entry.memo}</div>}
                      <div className="text-xs text-slate-300 dark:text-slate-600 mt-0.5">{entry.date}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${isCheapest ? activeColors.price : "text-slate-500 dark:text-slate-400"}`}>
                        ¥{entry.price.toLocaleString()}
                      </span>
                      <button onClick={() => onDeleteEntry(entry.id)} className="text-slate-200 dark:text-slate-600 hover:text-red-400 transition-colors p-1">✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showForm && (
            <form onSubmit={handleAdd} className="mt-3 bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 space-y-3 mb-2">
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">店舗</label>
                <select value={storeId} onChange={(e) => setStoreId(e.target.value)}
                  className="w-full mt-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">金額（円）</label>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="例: 198" min="0" required
                  className="w-full mt-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">メモ（任意）</label>
                <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="例: 500ml × 6本"
                  className="w-full mt-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  キャンセル
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold">
                  追加
                </button>
              </div>
            </form>
          )}
        </div>

        {!showForm && (
          <div className="px-5 py-4">
            <button onClick={() => setShowForm(true)}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500 text-sm hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-500 dark:hover:text-violet-400 transition-colors">
              ＋ 価格を追加
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== AddDialog =====================
function AddDialog({
  categories, stores, defaultCategoryId, onClose, onSubmit,
}: {
  categories: Category[];
  stores: Store[];
  defaultCategoryId: string;
  onClose: () => void;
  onSubmit: (itemName: string, categoryId: string, storeId: string, price: number, memo: string) => void;
}) {
  const [categoryId,  setCategoryId]  = useState(defaultCategoryId);
  const [itemName,    setItemName]    = useState("");
  const [storeId,     setStoreId]     = useState(stores[0]?.id ?? "");
  const [price,       setPrice]       = useState("");
  const [memo,        setMemo]        = useState("");

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    const p = parseInt(price);
    if (!itemName.trim() || !storeId || !p) return;
    onSubmit(itemName.trim(), categoryId, storeId, p, memo);
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end md:items-center md:justify-center md:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-t-3xl md:rounded-3xl z-10 shadow-2xl w-full md:max-w-lg">
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-600 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">価格を記録</h2>
          <button onClick={onClose} className="text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 text-xl p-1">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 pb-8 space-y-4">
          {/* カテゴリを先頭に */}
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">カテゴリ</label>
            <div className="flex gap-2 flex-wrap mt-1.5">
              {categories.map((cat) => {
                const colors = CATEGORY_COLORS[cat.colorIndex % CATEGORY_COLORS.length];
                return (
                  <button key={cat.id} type="button" onClick={() => setCategoryId(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${categoryId === cat.id ? colors.activeTab + " shadow-sm" : colors.tab + " hover:opacity-80"}`}>
                    {cat.emoji} {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">商品名</label>
            <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="例: 牛乳" required autoFocus
              className="w-full mt-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500" />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">店舗</label>
            <select value={storeId} onChange={(e) => setStoreId(e.target.value)} required
              className="w-full mt-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">金額（円）</label>
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="例: 198" required min="0"
              className="w-full mt-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500" />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">メモ（任意）</label>
            <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="例: 1L、特売品"
              className="w-full mt-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500" />
          </div>
          <button type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold text-base shadow-md hover:shadow-lg transition-shadow">
            追加する
          </button>
        </form>
      </div>
    </div>
  );
}

// ===================== AddCategoryDialog =====================
function AddCategoryDialog({
  existingCount, onClose, onSubmit,
}: {
  existingCount: number;
  onClose: () => void;
  onSubmit: (name: string, emoji: string) => void;
}) {
  const [name,  setName]  = useState("");
  const [emoji, setEmoji] = useState("🏷️");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus({ preventScroll: true });
  }, []);

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), emoji);
  }

  const previewColor = CATEGORY_COLORS[existingCount % CATEGORY_COLORS.length];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm z-10 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">カテゴリを追加</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">絵文字を選ぶ</label>
            <div className="grid grid-cols-8 gap-1.5 mt-1.5">
              {EMOJI_OPTIONS.map((e) => (
                <button key={e} type="button" onClick={() => setEmoji(e)}
                  className={`text-xl p-1.5 rounded-xl transition-all ${emoji === e ? "bg-violet-100 dark:bg-violet-900/40 scale-110 shadow-sm" : "hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
                  {e}
                </button>
              ))}
            </div>
            <input type="text" value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="カスタム絵文字" maxLength={2}
              className="w-full mt-2 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">カテゴリ名</label>
            <input ref={nameRef} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 冷凍食品" required
              className="w-full mt-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500" />
          </div>
          {name && (
            <div className="flex justify-center">
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${previewColor.activeTab}`}>{emoji} {name}</span>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              キャンセル
            </button>
            <button type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold">
              追加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===================== SettingsDialog =====================
function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [isIOS,       setIsIOS]       = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> } | null>(null);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setIsInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
      !!(navigator as unknown as { standalone?: boolean }).standalone
    );
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> });
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm z-10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">設定</h2>
          <button onClick={onClose} className="text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 text-xl p-1">✕</button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* アップデート情報 */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800 dark:text-white">アップデート情報</span>
              <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                v{APP_VERSION}
              </span>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {CHANGELOG.map((entry, i) => (
                <div key={entry.version}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      i === 0
                        ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    }`}>
                      v{entry.version}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{entry.title}</span>
                    <span className="ml-auto text-[10px] text-slate-400">{entry.date}</span>
                  </div>
                  <ul className="space-y-0.5 pl-2">
                    {entry.changes.map((c, j) => (
                      <li key={j} className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600" />
                        {c}
                      </li>
                    ))}
                  </ul>
                  {i < CHANGELOG.length - 1 && (
                    <div className="mt-3 border-b border-slate-100 dark:border-slate-700" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ホーム画面に追加 */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpOnSquareIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              <span className="text-sm font-bold text-slate-800 dark:text-white">ホーム画面に追加</span>
            </div>
            {isInstalled ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">すでにホーム画面に追加されています。</p>
            ) : isIOS ? (
              <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">1</span>
                  <span>画面下部の共有ボタン（<ArrowUpOnSquareIcon className="h-3.5 w-3.5 inline" />）をタップ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">2</span>
                  <span>「ホーム画面に追加」を選択</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">3</span>
                  <span>「追加」をタップして完了</span>
                </li>
              </ol>
            ) : deferredPrompt ? (
              <button
                onClick={handleInstall}
                className="w-full rounded-xl bg-[#22C55E] py-2.5 text-sm font-semibold text-white transition hover:bg-green-400"
              >
                ホーム画面にインストール
              </button>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                ブラウザのメニューから「ホーム画面に追加」を選択してください。
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== StoreManagerDialog =====================
function StoreManagerDialog({
  stores, onClose, onAdd, onDelete,
}: {
  stores: Store[];
  onClose: () => void;
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function handleAdd(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName("");
  }

  const confirmStore = stores.find((s) => s.id === confirmDeleteId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm z-10 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">店舗管理</h2>
          <button onClick={onClose} className="text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 text-xl p-1">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 space-y-2 mb-4">
          {stores.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">店舗がありません</p>
          ) : (
            stores.map((store) => (
              <div key={store.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-xl px-4 py-2.5">
                <span className="text-sm text-slate-700 dark:text-slate-200">{store.name}</span>
                <button
                  onClick={() => setConfirmDeleteId(store.id)}
                  className="text-slate-300 dark:text-slate-500 hover:text-red-400 transition-colors p-1"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="新しい店舗名"
            className="flex-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500" />
          <button type="submit"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold">
            追加
          </button>
        </form>

        {/* Confirmation overlay */}
        {confirmDeleteId && (
          <div className="absolute inset-0 bg-white dark:bg-slate-800 rounded-3xl flex flex-col items-center justify-center p-6 gap-4">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 text-center">
              「{confirmStore?.name}」を削除してよろしいですか？
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
              店舗に紐づくすべての商品が削除されます。
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => { onDelete(confirmDeleteId); setConfirmDeleteId(null); }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                削除
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== ShoppingListSheet =====================
function ShoppingListSheet({
  list, onClose, onAdd, onToggle, onDelete, onClearDone,
}: {
  list: ShoppingItem[];
  onClose: () => void;
  onAdd: (label: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onClearDone: () => void;
}) {
  const [input, setInput] = useState("");

  function handleAdd() {
    if (!input.trim()) return;
    onAdd(input.trim());
    setInput("");
  }

  const total = list.length;
  const done  = list.filter((i) => i.checked).length;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end md:items-center md:justify-center md:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-t-3xl md:rounded-3xl max-h-[85vh] flex flex-col z-10 shadow-2xl w-full md:max-w-lg">
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-600 rounded-full" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">買うものリスト</h2>
          <div className="flex items-center gap-2">
            {done > 0 && (
              <button
                onClick={onClearDone}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                完了をクリア
              </button>
            )}
            <button onClick={onClose} className="text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 text-xl p-1">✕</button>
          </div>
        </div>

        {/* input */}
        <div className="flex gap-2 px-5 pb-3">
          <input
            className="flex-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例）牛乳、卵、シャンプー..."
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          />
          <button
            type="button"
            onClick={handleAdd}
            className="flex shrink-0 items-center gap-1 rounded-xl bg-[#22C55E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-400 active:scale-95"
          >
            追加
          </button>
        </div>

        {/* list */}
        <div className="overflow-y-auto flex-1 px-5">
          {list.length === 0 ? (
            <p className="text-center py-10 text-sm text-slate-400 dark:text-slate-500">
              買うものを追加してください
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700 pb-2">
              {list.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onToggle(item.id)}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      item.checked
                        ? "border-[#22C55E] bg-[#22C55E] text-white"
                        : "border-slate-300 dark:border-slate-600 hover:border-violet-400"
                    }`}
                  >
                    {item.checked && (
                      <svg viewBox="0 0 12 10" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="1,5 4,8 11,1" />
                      </svg>
                    )}
                  </button>
                  <span className={`flex-1 text-sm ${
                    item.checked
                      ? "text-slate-400 dark:text-slate-500 line-through"
                      : "text-slate-700 dark:text-slate-200"
                  }`}>
                    {item.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="rounded-full p-1 text-slate-300 dark:text-slate-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-400 transition-colors"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* progress */}
        {total > 0 && (
          <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-3">
            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{done} / {total} 完了</span>
              <span>{Math.round((done / total) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-[#22C55E] transition-all"
                style={{ width: `${(done / total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
