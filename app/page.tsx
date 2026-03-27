"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  SunIcon,
  MoonIcon,
  Cog6ToothIcon,
  BuildingStorefrontIcon,
  PencilIcon,
  ArrowUpOnSquareIcon,
  ClipboardDocumentListIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  LinkIcon,
  Bars3Icon,
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
import { DEFAULT_CATEGORIES, DEFAULT_STORES } from "@/lib/defaultData";
import { uid, calcUnitPrice, loadHistory, updateHistory } from "@/lib/utils";
import { initSharedData, subscribeSharedData, updateSharedData, setCurrentRoom } from "@/lib/firestore";
import {
  getOrCreateRoomId, getRoomShareUrl,
  getStoredPassphrase, storePassphrase, buildFirestoreKey, isFirstJoin,
} from "@/lib/room";
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

  const [showAddDialog,       setShowAddDialog]       = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showStoreManager,    setShowStoreManager]    = useState(false);
  const [showSettings,     setShowSettings]     = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [selectedItem,     setSelectedItem]     = useState<Item | null>(null);
  const [shoppingList,     setShoppingList]     = useState<ShoppingItem[]>([]);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [showSearch,   setShowSearch]   = useState(false);
  const [memoHistory,  setMemoHistory]  = useState<string[]>([]);
  const [roomId,              setRoomId]              = useState("");
  const [firestoreKey,        setFirestoreKey]        = useState<string | null>(null);
  const [selectedItemDefaultStore, setSelectedItemDefaultStore] = useState("");
  const [showPassphraseJoin,  setShowPassphraseJoin]  = useState(false);
  const roomIdRef = useRef("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ① 起動時: テーマ・ルームID・合言葉チェック
  useEffect(() => {
    setMemoHistory(loadHistory("kaimono_memo_history"));
    const savedTheme = localStorage.getItem("kaimono_theme") as "light" | "dark" | null;
    setTheme(savedTheme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

    const id = getOrCreateRoomId();
    roomIdRef.current = id;
    setRoomId(id);

    // 初回参加（URLからルームIDが来たが合言葉未保存）→ 合言葉ダイアログへ
    if (isFirstJoin(id)) {
      setShowPassphraseJoin(true);
    } else {
      const pass = getStoredPassphrase(id) ?? "";
      setFirestoreKey(buildFirestoreKey(id, pass));
    }
  }, []);

  // ② firestoreKey が確定したら Firestore 初期化 & 購読
  useEffect(() => {
    if (!firestoreKey) return;
    setCurrentRoom(firestoreKey);
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomIdRef.current);
    window.history.replaceState({}, "", url.toString());

    let unsub: (() => void) | undefined;
    initSharedData().then(() => {
      unsub = subscribeSharedData((data) => {
        setCategories(data.categories);
        setStores(data.stores);
        setItems(data.items);
        setShoppingList(data.shoppingList ?? []);
        setSelectedItem((prev) =>
          prev ? (data.items.find((i) => i.id === prev.id) ?? null) : null,
        );
        setHydrated(true);
      });
    });
    return () => { unsub?.(); };
  }, [firestoreKey]);

  // 合言葉入力して参加
  function handleJoinWithPassphrase(pass: string) {
    storePassphrase(roomIdRef.current, pass);
    setFirestoreKey(buildFirestoreKey(roomIdRef.current, pass));
    setShowPassphraseJoin(false);
  }

  // 合言葉を変更（ルームキーが変わるので Firestore も切り替わる）
  function handleChangePassphrase(newPass: string) {
    storePassphrase(roomIdRef.current, newPass);
    setFirestoreKey(buildFirestoreKey(roomIdRef.current, newPass));
  }

  function addToMemoHistory(value: string) {
    if (value.trim()) setMemoHistory(updateHistory("kaimono_memo_history", value));
  }

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("kaimono_theme", theme);
  }, [theme]);


  const filteredItems = items.filter((i) => i.categoryId === activeCategory);
  const activeCat    = categories.find((c) => c.id === activeCategory);
  const activeColors = CATEGORY_COLORS[(activeCat?.colorIndex ?? 0) % CATEGORY_COLORS.length];

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, searchQuery]);

  function handleItemDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const categoryItems = items.filter((i) => i.categoryId === activeCategory);
    const oldIndex = categoryItems.findIndex((i) => i.id === active.id);
    const newIndex = categoryItems.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(categoryItems, oldIndex, newIndex);
    let catIdx = 0;
    const newItems = items.map((item) =>
      item.categoryId === activeCategory ? reordered[catIdx++] : item,
    );
    updateSharedData({ items: newItems });
  }

  function handleAddSubmit(itemName: string, categoryId: string) {
    const target = items.find((i) => i.name === itemName && i.categoryId === categoryId);
    const finalItem = target ?? { id: uid(), categoryId, name: itemName, prices: [] };
    if (!target) updateSharedData({ items: [...items, finalItem] });
    setActiveCategory(categoryId);
    setSelectedItemDefaultStore(stores[0]?.id ?? "");
    setSelectedItem(finalItem);
    setShowAddDialog(false);
  }

  function handleAddPriceForItem(itemId: string, storeId: string, price: number, memo: string, quantity?: number, unit?: string, discountPct?: number) {
    const entry: PriceEntry = { id: uid(), storeId, price, memo, date: new Date().toISOString().split("T")[0], ...(quantity && unit ? { quantity, unit } : {}), ...(discountPct ? { discountPct } : {}) };
    const newItems = items.map((i) => (i.id === itemId ? { ...i, prices: [...i.prices, entry] } : i));
    updateSharedData({ items: newItems });
    addToMemoHistory(memo);
  }

  function handleDeleteEntry(itemId: string, entryId: string) {
    const newItems = items.map((i) => (i.id === itemId ? { ...i, prices: i.prices.filter((p) => p.id !== entryId) } : i));
    updateSharedData({ items: newItems });
  }

  function handleDeleteItem(itemId: string) {
    updateSharedData({ items: items.filter((i) => i.id !== itemId) });
    setSelectedItem(null);
  }

  function handleEditEntry(
    itemId: string,
    entryId: string,
    updates: { storeId: string; price: number; memo: string; quantity?: number; unit?: string; discountPct?: number },
  ) {
    const date = new Date().toISOString().split("T")[0];
    const newItems = items.map((i) =>
      i.id === itemId
        ? { ...i, prices: i.prices.map((p) => (p.id === entryId ? { ...p, ...updates, date } : p)) }
        : i,
    );
    updateSharedData({ items: newItems });
  }

  function handleChangeItemCategory(itemId: string, newCategoryId: string) {
    updateSharedData({ items: items.map((i) => i.id === itemId ? { ...i, categoryId: newCategoryId } : i) });
  }

  function handleRenameItem(itemId: string, newName: string, newCategoryId: string) {
    updateSharedData({ items: items.map((i) => i.id === itemId ? { ...i, name: newName, categoryId: newCategoryId } : i) });
  }

  function handleDeleteStore(storeId: string) {
    const newStores = stores.filter((s) => s.id !== storeId);
    const newItems = items
      .map((item) => ({ ...item, prices: item.prices.filter((p) => p.storeId !== storeId) }))
      .filter((item) => item.prices.length > 0);
    updateSharedData({ stores: newStores, items: newItems });
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
              isActive ? colors.activeTab + " shadow-sm" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:opacity-80"
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
        onClick={() => setShowCategoryManager(true)}
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
              {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
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
              <BuildingStorefrontIcon className="h-5 w-5" />
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
            <button
              type="button"
              onClick={() => {
                setShowSearch((v) => !v);
                setSearchQuery("");
              }}
              className={`hidden md:flex ${ICON_BTN} ${showSearch ? "text-violet-500 dark:text-violet-400" : ""}`}
              aria-label="検索"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Search bar (desktop only) ── */}
      {showSearch && (
        <div className="hidden md:block bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 py-2">
          <div className="mx-auto max-w-5xl relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="商品名を検索..."
              autoFocus
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-slate-500 dark:hover:text-slate-300"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Category tabs / Search (mobile only) ── */}
      <div className="md:hidden bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-3 py-2">
        <div className="flex items-center gap-2">
          {showSearch ? (
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="商品名を検索..."
                autoFocus
                className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-slate-500 dark:hover:text-slate-300">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 items-center flex-1">
              {categories.map((cat) => {
                const colors   = CATEGORY_COLORS[cat.colorIndex % CATEGORY_COLORS.length];
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    title={cat.name}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium transition-all ${
                      isActive ? colors.activeTab + " shadow-sm" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:opacity-80"
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    {isActive && <span className="text-xs">{cat.name}</span>}
                  </button>
                );
              })}
              <button
                onClick={() => setShowCategoryManager(true)}
                className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 text-base flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                +
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => { setShowSearch((v) => !v); setSearchQuery(""); }}
            className={`shrink-0 rounded-full p-1.5 transition-colors ${showSearch ? "text-violet-500 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}
            aria-label="検索"
          >
            <MagnifyingGlassIcon className="h-5 w-5" />
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
            {searchQuery.trim() ? (
              <div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                  「{searchQuery}」の検索結果 {searchResults.length}件
                </p>
                {searchResults.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-5xl mb-3">🔍</div>
                    <p className="text-slate-400 dark:text-slate-500 text-sm">該当する商品が見つかりません</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.map((item) => {
                      const cat = categories.find((c) => c.id === item.categoryId);
                      const colors = CATEGORY_COLORS[(cat?.colorIndex ?? 0) % CATEGORY_COLORS.length];
                      const minPrice = item.prices.length > 0 ? Math.min(...item.prices.map((p) => p.price)) : null;
                      const minEntry = minPrice !== null ? item.prices.find((p) => p.price === minPrice) : null;
                      const minStore = minEntry ? stores.find((s) => s.id === minEntry.storeId) : null;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveCategory(item.categoryId);
                            setSelectedItem(item);
                          }}
                          className="w-full text-left bg-white dark:bg-slate-800 rounded-2xl shadow-sm border-l-4 px-3 py-2 hover:shadow-md transition-all"
                          style={{ borderColor: colors.accent.replace("border-l-", "") }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{item.name}</span>
                              {cat && (
                                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${colors.activeTab}`}>
                                  {cat.emoji} {cat.name}
                                </span>
                              )}
                            </div>
                            {minPrice !== null ? (
                              <span className={`text-sm font-bold flex-shrink-0 ${colors.price}`}>¥{minPrice.toLocaleString()}</span>
                            ) : (
                              <span className="text-xs text-slate-300 dark:text-slate-600">未登録</span>
                            )}
                          </div>
                          {minStore && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{minStore.name}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : !hydrated ? (
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
        className="fixed bottom-6 right-6 w-14 h-14 md:w-16 md:h-16 bg-[#22C55E] hover:bg-green-400 text-white rounded-full shadow-xl text-2xl md:text-3xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-20"
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
          categories={categories}
          memoHistory={memoHistory}
          defaultStoreId={selectedItemDefaultStore || undefined}
          initialShowForm={!!selectedItemDefaultStore}
          onClose={() => { setSelectedItem(null); setSelectedItemDefaultStore(""); }}
          onAddPrice={(storeId, price, memo, quantity, unit, discountPct) => handleAddPriceForItem(selectedItem.id, storeId, price, memo, quantity, unit, discountPct)}
          onDeleteEntry={(entryId) => handleDeleteEntry(selectedItem.id, entryId)}
          onEditEntry={(entryId, updates) => handleEditEntry(selectedItem.id, entryId, updates)}
          onDeleteItem={() => handleDeleteItem(selectedItem.id)}
          onChangeCategory={(catId) => handleChangeItemCategory(selectedItem.id, catId)}
          onRenameItem={(name, catId) => handleRenameItem(selectedItem.id, name, catId)}
        />
      )}
      {showAddDialog && (
        <AddDialog
          defaultCategoryId={activeCategory}
          onClose={() => setShowAddDialog(false)}
          onSubmit={handleAddSubmit}
        />
      )}
      {showCategoryManager && (
        <CategoryManagerDialog
          categories={categories}
          items={items}
          onClose={() => setShowCategoryManager(false)}
          onAdd={(name: string, emoji: string) => {
            const newCats = [...categories, { id: uid(), name, emoji, colorIndex: categories.length % CATEGORY_COLORS.length }];
            updateSharedData({ categories: newCats });
          }}
          onEdit={(id: string, name: string, emoji: string) => {
            const newCats = categories.map((c) => (c.id === id ? { ...c, name, emoji } : c));
            updateSharedData({ categories: newCats });
          }}
          onDelete={(id: string) => {
            const newCats = categories.filter((c) => c.id !== id);
            if (activeCategory === id) setActiveCategory(newCats[0]?.id ?? "");
            updateSharedData({ categories: newCats, items: items.filter((i) => i.categoryId !== id) });
          }}
          onReorder={(reordered) => updateSharedData({ categories: reordered })}
        />
      )}
      {showStoreManager && (
        <StoreManagerDialog
          stores={stores}
          onClose={() => setShowStoreManager(false)}
          onAdd={(name) => updateSharedData({ stores: [...stores, { id: uid(), name }] })}
          onDelete={handleDeleteStore}
          onReorder={(reordered) => updateSharedData({ stores: reordered })}
          onUpdateMemo={(id, memo) => updateSharedData({ stores: stores.map((s) => s.id === id ? { ...s, memo } : s) })}
        />
      )}
      {showSettings && (
        <SettingsDialog
          onClose={() => setShowSettings(false)}
          roomId={roomId}
          passphrase={getStoredPassphrase(roomId) ?? ""}
          onPassphraseSave={handleChangePassphrase}
        />
      )}
      {showPassphraseJoin && (
        <PassphraseJoinDialog roomId={roomId} onJoin={handleJoinWithPassphrase} />
      )}
      {showShoppingList && (
        <ShoppingListSheet
          list={shoppingList}
          onClose={() => setShowShoppingList(false)}
          onAdd={(label: string) =>
            updateSharedData({ shoppingList: [...shoppingList, { id: `todo-${Date.now()}`, label, checked: false }] })
          }
          onToggle={(id: string) =>
            updateSharedData({ shoppingList: shoppingList.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)) })
          }
          onDelete={(id: string) =>
            updateSharedData({ shoppingList: shoppingList.filter((i) => i.id !== id) })
          }
          onClearDone={() =>
            updateSharedData({ shoppingList: shoppingList.filter((i) => !i.checked) })
          }
        />
      )}
    </div>
  );
}

// ===================== PassphraseJoinDialog =====================
function PassphraseJoinDialog({
  roomId, onJoin,
}: {
  roomId: string;
  onJoin: (pass: string) => void;
}) {
  const [pass, setPass] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-xs shadow-2xl p-6 space-y-4">
        <div className="text-center space-y-1">
          <div className="text-3xl mb-2">🔑</div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">合言葉を入力</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">ルームID: <span className="font-mono font-bold">{roomId}</span></p>
        </div>
        <input
          type="text"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onJoin(pass); }}
          placeholder="例: toyama（なければ空のまま）"
          autoFocus
          className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500"
        />
        <button
          onClick={() => onJoin(pass)}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold text-sm"
        >
          参加する
        </button>
      </div>
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
  const maxPrice = item.prices.length > 0 ? Math.max(...item.prices.map((p) => p.price)) : null;

  // 単価が最良（最小）の店舗を表示。単価情報がない場合は最安値の店舗
  const bestEntry = (() => {
    if (item.prices.length === 0) return null;
    const withUnit = item.prices.filter((p) => p.quantity && p.unit);
    if (withUnit.length > 0) {
      let best = withUnit[0];
      let bestVal = Infinity;
      for (const p of withUnit) {
        const up = calcUnitPrice(p.price, p.quantity!, p.unit!);
        if (up) {
          const v = parseFloat(up.value);
          if (v < bestVal) { bestVal = v; best = p; }
        }
      }
      return best;
    }
    const mp = Math.min(...item.prices.map((p) => p.price));
    return item.prices.find((p) => p.price === mp) ?? null;
  })();
  const minStore = bestEntry ? stores.find((s) => s.id === bestEntry.storeId) : null;
  const bestUnitPrice = bestEntry?.quantity && bestEntry?.unit
    ? calcUnitPrice(bestEntry.price, bestEntry.quantity, bestEntry.unit)
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-sm ${
        isDragging ? "opacity-50 shadow-lg scale-105" : "hover:shadow-md dark:hover:shadow-slate-900/50"
      } transition-all`}
    >
      <button
        onClick={onClick}
        disabled={editMode}
        className={`w-full text-left px-3 py-2 ${editMode ? "pr-12" : "pr-3"} active:scale-95 transition-transform disabled:active:scale-100`}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${activeColors.dot}`} />
          <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate flex-1">{item.name}</span>
          {minPrice !== null ? (
            <span className={`text-sm font-bold flex-shrink-0 ${activeColors.price}`}>
              ¥{minPrice.toLocaleString()}{maxPrice !== minPrice ? `〜¥${maxPrice!.toLocaleString()}` : ""}
            </span>
          ) : (
            <span className="text-xs text-slate-300 dark:text-slate-600 flex-shrink-0">未登録</span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5 pl-4">
          <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
            {minStore
              ? <>{minStore.name}{item.prices.length > 1 && <span className="ml-1 text-slate-300 dark:text-slate-600">+{item.prices.length - 1}</span>}</>
              : item.prices.length === 0 ? "価格を追加" : ""}
          </span>
          {bestUnitPrice && (
            <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">¥{bestUnitPrice.value}/{bestUnitPrice.per}</span>
          )}
        </div>
      </button>
      {editMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing touch-none"
        >
          <Bars3Icon className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}

// ===================== PriceDetailSheet =====================
type EntryUpdates = { storeId: string; price: number; memo: string; quantity?: number; unit?: string; discountPct?: number };

function applyModifiers(base: string, discount: number | null, tax: number | null): string {
  const p = parseInt(base);
  if (!p || isNaN(p)) return base;
  const d = discount != null ? (1 - discount / 100) : 1;
  const t = tax != null ? (1 + tax / 100) : 1;
  return String(Math.round(p * d * t));
}

function PriceDetailSheet({
  item, items, stores, categories, memoHistory, defaultStoreId, initialShowForm, onClose, onAddPrice, onDeleteEntry, onEditEntry, onDeleteItem, onChangeCategory, onRenameItem,
}: {
  item: Item;
  items: Item[];
  stores: Store[];
  categories: Category[];
  memoHistory: string[];
  defaultStoreId?: string;
  initialShowForm?: boolean;
  onClose: () => void;
  onAddPrice: (storeId: string, price: number, memo: string, quantity?: number, unit?: string, discountPct?: number) => void;
  onDeleteEntry: (entryId: string) => void;
  onEditEntry: (entryId: string, updates: EntryUpdates) => void;
  onDeleteItem: () => void;
  onChangeCategory: (categoryId: string) => void;
  onRenameItem: (name: string, categoryId: string) => void;
}) {
  const [showForm,     setShowForm]     = useState(initialShowForm ?? false);
  const [storeId,      setStoreId]      = useState(defaultStoreId ?? (stores[0]?.id ?? ""));
  const [basePrice,    setBasePrice]    = useState("");
  const [memo,         setMemo]         = useState("");
  const [quantity,     setQuantity]     = useState("");
  const [unit,         setUnit]         = useState("");
  const [discountPct,  setDiscountPct]  = useState<number | null>(null);
  const [taxPct,       setTaxPct]       = useState<number | null>(null);

  // 編集中エントリの state
  const [editingId,       setEditingId]       = useState<string | null>(null);
  const [editStore,       setEditStore]       = useState("");
  const [editBasePrice,   setEditBasePrice]   = useState("");
  const [editMemo,        setEditMemo]        = useState("");
  const [editQty,         setEditQty]         = useState("");
  const [editUnit,        setEditUnit]        = useState("");
  const [editDiscountPct, setEditDiscountPct] = useState<number | null>(null);
  const [editTaxPct,      setEditTaxPct]      = useState<number | null>(null);

  const price     = applyModifiers(basePrice,     discountPct, taxPct);
  const editPrice = applyModifiers(editBasePrice, editDiscountPct, editTaxPct);

  // アイテム削除確認フラグ
  const [confirmDelete, setConfirmDelete] = useState(false);

  // カテゴリ変更の保留（確認前は適用しない）
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
  const [confirmCatChange,  setConfirmCatChange]  = useState(false);

  // アイテム名・カテゴリ編集
  const [editingItem,        setEditingItem]        = useState(false);
  const [editItemName,       setEditItemName]       = useState("");
  const [editItemCategoryId, setEditItemCategoryId] = useState("");
  const [confirmSave,        setConfirmSave]        = useState(false);
  const [sortOrder,          setSortOrder]          = useState<"price" | "date" | "store">("price");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const currentItem = items.find((i) => i.id === item.id) ?? item;

  const sortedPrices = useMemo(() => {
    const prices = [...currentItem.prices];
    if (sortOrder === "price") return prices.sort((a, b) => a.price - b.price);
    if (sortOrder === "date")  return prices.sort((a, b) => b.date.localeCompare(a.date));
    return prices.sort((a, b) => {
      const sa = stores.find((s) => s.id === a.storeId)?.name ?? "";
      const sb = stores.find((s) => s.id === b.storeId)?.name ?? "";
      return sa.localeCompare(sb, "ja");
    });
  }, [currentItem.prices, sortOrder, stores]);

  // 単価ベースで最良エントリを判定（単価なければ最安値）
  const bestEntryId = useMemo(() => {
    if (currentItem.prices.length === 0) return null;
    const withUnit = currentItem.prices.filter((p) => p.quantity && p.unit);
    if (withUnit.length > 0) {
      let best = withUnit[0], bestVal = Infinity;
      for (const p of withUnit) {
        const up = calcUnitPrice(p.price, p.quantity!, p.unit!);
        if (up) { const v = parseFloat(up.value); if (v < bestVal) { bestVal = v; best = p; } }
      }
      return best.id;
    }
    return currentItem.prices.reduce((a, b) => a.price <= b.price ? a : b).id;
  }, [currentItem.prices]);

  // 閉じる前にカテゴリ変更が保留中なら確認ダイアログを出す
  function handleClose() {
    if (pendingCategoryId !== null && pendingCategoryId !== currentItem.categoryId) {
      setConfirmCatChange(true);
    } else {
      onClose();
    }
  }

  function handleAdd(e: React.SyntheticEvent) {
    e.preventDefault();
    const p = parseInt(price);
    if (!p || !storeId) return;
    const qty = quantity ? parseFloat(quantity) : undefined;
    onAddPrice(storeId, p, memo, qty, unit || undefined, discountPct ?? undefined);
    setBasePrice(""); setMemo(""); setQuantity(""); setUnit(""); setDiscountPct(null); setTaxPct(null); setShowForm(false);
  }

  function startEdit(entry: PriceEntry) {
    setEditingId(entry.id);
    setEditStore(entry.storeId);
    // 保存時に割引が適用されていた場合、元の価格を逆算して復元する
    const base = entry.discountPct
      ? Math.round(entry.price / (1 - entry.discountPct / 100))
      : entry.price;
    setEditBasePrice(String(base));
    setEditMemo(entry.memo ?? "");
    setEditQty(entry.quantity ? String(entry.quantity) : "");
    setEditUnit(entry.unit ?? "");
    setEditDiscountPct(entry.discountPct ?? null);
    setEditTaxPct(null);
    setShowForm(false);
  }

  function saveEdit() {
    if (!editingId) return;
    const p = parseInt(editPrice);
    if (!p) return;
    const qty = editQty ? parseFloat(editQty) : undefined;
    onEditEntry(editingId, { storeId: editStore, price: p, memo: editMemo, quantity: qty, unit: editUnit || undefined, discountPct: editDiscountPct ?? undefined });
    setEditingId(null);
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end md:items-center md:justify-center md:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-t-3xl md:rounded-3xl max-h-[85vh] flex flex-col z-10 shadow-2xl w-full md:max-w-lg">
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-600 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 pt-3 pb-2 gap-2">
          {editingItem ? (
            <input type="text" value={editItemName} onChange={(e) => setEditItemName(e.target.value)} autoFocus
              className="flex-1 text-lg font-bold bg-transparent border-b-2 border-violet-400 dark:border-violet-500 focus:outline-none text-slate-800 dark:text-slate-100 min-w-0" />
          ) : (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{currentItem.name}</h2>
              {(() => {
                const cat = categories.find((c) => c.id === currentItem.categoryId);
                if (!cat) return null;
                const colors = CATEGORY_COLORS[cat.colorIndex % CATEGORY_COLORS.length];
                return (
                  <span className={`flex-shrink-0 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors.activeTab}`}>
                    {cat.emoji} {cat.name}
                  </span>
                );
              })()}
            </div>
          )}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => { if (!editingItem) { setEditItemName(currentItem.name); setEditItemCategoryId(currentItem.categoryId); } setEditingItem((v) => !v); }}
              className={`p-1.5 transition-colors ${editingItem ? "text-violet-500 dark:text-violet-400" : "text-slate-300 dark:text-slate-600 hover:text-violet-400 dark:hover:text-violet-400"}`}>
              <PencilIcon className="h-4 w-4" />
            </button>
            <button onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-400 transition-colors">
              <TrashIcon className="h-4 w-4" />
            </button>
            <button onClick={handleClose} className="p-1.5 text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 text-xl leading-none">✕</button>
          </div>
        </div>
        {editingItem && (
          <div className="px-5 pb-4 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const colors = CATEGORY_COLORS[cat.colorIndex % CATEGORY_COLORS.length];
                const isActive = editItemCategoryId === cat.id;
                return (
                  <button key={cat.id} type="button" onClick={() => setEditItemCategoryId(cat.id)}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${isActive ? colors.activeTab + " shadow-sm" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:opacity-80"}`}>
                    <span>{cat.emoji}</span>
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditingItem(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                キャンセル
              </button>
              <button type="button" onClick={() => { if (!editItemName.trim()) return; if (editItemCategoryId !== currentItem.categoryId) { setConfirmSave(true); } else { onRenameItem(editItemName.trim(), editItemCategoryId); setEditingItem(false); } }}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold">
                保存
              </button>
            </div>
          </div>
        )}
        {!editingItem && !showForm && !editingId && (
          <>
            {/* ショッピングリンク */}
            <div className="flex items-center gap-2 px-5 py-3">
              {[
                { label: "Amazon", url: `https://www.amazon.co.jp/s?k=${encodeURIComponent(currentItem.name)}`, bg: "bg-[#FF9900]", text: "text-white" },
                { label: "Yahoo!", url: `https://shopping.yahoo.co.jp/search?p=${encodeURIComponent(currentItem.name)}`, bg: "bg-[#FF0033]", text: "text-white" },
                { label: "楽天", url: `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(currentItem.name)}/`, bg: "bg-[#BF0000]", text: "text-white" },
              ].map(({ label, url, bg, text }) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${bg} ${text} hover:opacity-85 transition-opacity`}>
                  {label}
                  <svg className="h-3 w-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              ))}
            </div>
          </>
        )}

        <div className="overflow-y-auto flex-1 px-5">
          {!showForm && sortedPrices.length > 1 && !editingId && (
            <div className="flex gap-1 pt-2 pb-1">
              {(["price", "date", "store"] as const).map((order) => {
                const label = order === "price" ? "価格順" : order === "date" ? "日付順" : "店舗順";
                return (
                  <button key={order} onClick={() => setSortOrder(order)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${sortOrder === order ? "bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-800" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"}`}>
                    {label}
                  </button>
                );
              })}
            </div>
          )}
          {!showForm && sortedPrices.length === 0 ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">価格情報がありません</div>
          ) : !showForm ? (
            <div className="space-y-2 pb-2">
              {sortedPrices.map((entry) => {
                const store    = stores.find((s) => s.id === entry.storeId);
                const isBest   = entry.id === bestEntryId;
                const isEditing = editingId === entry.id;

                if (editingId && !isEditing) return null;

                if (isEditing) {
                  const previewUp = editQty && editUnit
                    ? calcUnitPrice(parseInt(editPrice) || 0, parseFloat(editQty), editUnit)
                    : null;
                  return (
                    <div key={entry.id} className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 p-3 space-y-2">
                      <select value={editStore} onChange={(e) => setEditStore(e.target.value)}
                        className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600">
                        {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">金額（円）<span className="ml-1.5 font-normal text-slate-400 dark:text-slate-500">※税込み価格を入力</span></label>
                        <input type="number" value={editPrice} onChange={(e) => { setEditBasePrice(e.target.value); setEditDiscountPct(null); setEditTaxPct(null); }} placeholder="金額（円）" min="0"
                          className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 placeholder:text-slate-300 dark:placeholder:text-slate-500" />
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {[5, 10, 15].map((pct) => (
                            <button key={pct} type="button"
                              onClick={() => setEditDiscountPct(editDiscountPct === pct ? null : pct)}
                              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${editDiscountPct === pct ? "bg-orange-500 text-white border-orange-500" : "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30"}`}>
                              -{pct}%
                            </button>
                          ))}
                          <span className="text-slate-300 dark:text-slate-600 text-xs self-center">|</span>
                          {[8, 10].map((pct) => (
                            <button key={pct} type="button"
                              onClick={() => setEditTaxPct(editTaxPct === pct ? null : pct)}
                              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${editTaxPct === pct ? "bg-blue-500 text-white border-blue-500" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30"}`}>
                              +{pct}%税
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <input type="number" value={editQty} onChange={(e) => setEditQty(e.target.value)} placeholder="数量" min="0" step="any"
                            className="w-20 border border-slate-200 dark:border-slate-600 rounded-xl px-2.5 py-2 text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 placeholder:text-slate-300 dark:placeholder:text-slate-500" />
                          <div className="flex flex-wrap gap-1">
                            {["個","枚","本","袋","g","kg","ml","L"].map((u) => (
                              <button key={u} type="button" onClick={() => setEditUnit(editUnit === u ? "" : u)}
                                className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all ${editUnit === u ? "bg-violet-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
                                {u}
                              </button>
                            ))}
                          </div>
                        </div>
                        {previewUp && <p className="text-xs text-violet-500 dark:text-violet-400 mt-1">→ 単価 ¥{previewUp.value}/{previewUp.per}</p>}
                      </div>
                      <input type="text" value={editMemo} onChange={(e) => setEditMemo(e.target.value)} placeholder="メモ（任意）" list="memo-history-edit"
                        className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 placeholder:text-slate-300 dark:placeholder:text-slate-500" />
                      <datalist id="memo-history-edit">
                        {memoHistory.map((h) => <option key={h} value={h} />)}
                      </datalist>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setEditingId(null)}
                          className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                          キャンセル
                        </button>
                        <button type="button" onClick={saveEdit}
                          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold">
                          保存
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-3 rounded-xl ${
                      isBest
                        ? "bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600"
                        : "bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-700 dark:text-slate-200">{store?.name ?? "不明"}</span>
                        {entry.discountPct && (
                          <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                            -{entry.discountPct}%
                          </span>
                        )}
                      </div>
                      {entry.memo && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{entry.memo}</div>}
                      <div className="text-xs text-slate-300 dark:text-slate-600 mt-0.5">{entry.date}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="text-right mr-1">
                        <div className={`text-lg font-bold ${isBest ? "text-amber-400 dark:text-amber-300" : "text-slate-500 dark:text-slate-400"}`}>
                          ¥{entry.price.toLocaleString()}
                        </div>
                        {entry.quantity && entry.unit && (() => {
                          const up = calcUnitPrice(entry.price, entry.quantity, entry.unit);
                          return up ? (
                            <div className="text-xs text-slate-400 dark:text-slate-500">¥{up.value}/{up.per}</div>
                          ) : null;
                        })()}
                      </div>
                      <button onClick={() => startEdit(entry)} className="text-slate-300 dark:text-slate-600 hover:text-violet-400 transition-colors p-1">
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => onDeleteEntry(entry.id)} className="text-slate-300 dark:text-slate-600 hover:text-red-400 transition-colors p-1">
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

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
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">金額（円）<span className="ml-1.5 font-normal text-slate-400 dark:text-slate-500">※税込み価格を入力</span></label>
                <input type="number" value={price} onChange={(e) => { setBasePrice(e.target.value); setDiscountPct(null); setTaxPct(null); }} placeholder="例: 198" min="0" required
                  className="w-full mt-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500" />
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {[5, 10, 15].map((pct) => (
                    <button key={pct} type="button"
                      onClick={() => setDiscountPct(discountPct === pct ? null : pct)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${discountPct === pct ? "bg-orange-500 text-white border-orange-500" : "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30"}`}>
                      -{pct}%
                    </button>
                  ))}
                  <span className="text-slate-300 dark:text-slate-600 text-xs self-center">|</span>
                  {[8, 10].map((pct) => (
                    <button key={pct} type="button"
                      onClick={() => setTaxPct(taxPct === pct ? null : pct)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${taxPct === pct ? "bg-blue-500 text-white border-blue-500" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30"}`}>
                      +{pct}%税
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">数量・単位（任意）</label>
                <div className="flex items-center gap-2 mt-1">
                  <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="例: 500" min="0" step="any"
                    className="w-24 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500" />
                  <div className="flex flex-wrap gap-1.5">
                    {["個", "枚", "本", "袋", "g", "kg", "ml", "L"].map((u) => (
                      <button key={u} type="button" onClick={() => setUnit(unit === u ? "" : u)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${unit === u ? "bg-violet-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"}`}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                {quantity && unit && (() => {
                  const p = parseInt(price);
                  const q = parseFloat(quantity);
                  if (!p || !q) return null;
                  const up = calcUnitPrice(p, q, unit);
                  return up ? (
                    <p className="text-xs text-violet-500 dark:text-violet-400 mt-1">→ 単価 ¥{up.value}/{up.per}</p>
                  ) : null;
                })()}
              </div>
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">メモ（任意）</label>
                <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="例: 特売品" list="memo-history-add"
                  className="w-full mt-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500" />
                <datalist id="memo-history-add">
                  {memoHistory.map((h) => <option key={h} value={h} />)}
                </datalist>
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

        {confirmSave && (() => {
          const catChanged  = editItemCategoryId !== currentItem.categoryId;
          const newCat      = categories.find((c) => c.id === editItemCategoryId);
          return (
            <div className="absolute inset-0 bg-white dark:bg-slate-800 rounded-t-3xl md:rounded-3xl flex flex-col items-center justify-center p-6 gap-4 z-10">
              {catChanged && newCat && (
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 text-center">
                  カテゴリを「{newCat.emoji} {newCat.name}」に変更しますか？
                </p>
              )}
              <div className="flex gap-3 w-full max-w-xs">
                <button onClick={() => setConfirmSave(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  キャンセル
                </button>
                <button onClick={() => { onRenameItem(editItemName.trim(), editItemCategoryId); setConfirmSave(false); setEditingItem(false); }}
                  className="flex-1 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 transition-colors">
                  変更する
                </button>
              </div>
            </div>
          );
        })()}

        {/* アイテム削除確認オーバーレイ */}
        {confirmDelete && (
          <div className="absolute inset-0 bg-white dark:bg-slate-800 rounded-t-3xl md:rounded-3xl flex flex-col items-center justify-center p-6 gap-4 z-10">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 text-center">
              「{currentItem.name}」を削除してよろしいですか？
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
              この操作は元に戻せません。
            </p>
            <div className="flex gap-3 w-full max-w-xs">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                キャンセル
              </button>
              <button onClick={onDeleteItem}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                削除
              </button>
            </div>
          </div>
        )}

        {/* カテゴリ変更確認 */}
        {confirmCatChange && pendingCategoryId && (() => {
          const newCat = categories.find((c) => c.id === pendingCategoryId);
          return (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-t-3xl md:rounded-3xl bg-white/95 dark:bg-slate-800/95 px-8 text-center">
              <div className="text-3xl">{newCat?.emoji}</div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                カテゴリを「{newCat?.name}」に変更しますか？
              </p>
              <div className="flex gap-3 w-full max-w-xs">
                <button onClick={() => { setConfirmCatChange(false); setPendingCategoryId(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  変更しない
                </button>
                <button onClick={() => { onChangeCategory(pendingCategoryId); onClose(); }}
                  className="flex-1 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 transition-colors">
                  変更する
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ===================== AddDialog =====================
function AddDialog({
  defaultCategoryId, onClose, onSubmit,
}: {
  defaultCategoryId: string;
  onClose: () => void;
  onSubmit: (itemName: string, categoryId: string) => void;
}) {
  const [itemName,  setItemName]  = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!itemName.trim()) { setFormError("商品名を入力してください。"); return; }
    setFormError("");
    onSubmit(itemName.trim(), defaultCategoryId);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-3xl z-10 shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">アイテムを追加</h2>
          <button onClick={onClose} className="text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 text-xl p-1">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-3">
          <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="商品名を入力…" autoFocus
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500" />
          {formError && (
            <p className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2">
              {formError}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              キャンセル
            </button>
            <button type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-shadow">
              追加する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===================== CategoryManagerDialog =====================
function SortableCategoryRow({ cat, colors, itemCount, onEdit, onDelete }: {
  cat: Category;
  colors: (typeof CATEGORY_COLORS)[number];
  itemCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={`flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2.5 ${isDragging ? "opacity-50 shadow-lg" : ""}`}>
      <div className="flex items-center gap-2 min-w-0">
        <button {...attributes} {...listeners} className="text-slate-300 dark:text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none p-0.5 shrink-0">
          <Bars3Icon className="h-4 w-4" />
        </button>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${colors.activeTab}`}>{cat.emoji} {cat.name}</span>
        <span className="text-xs text-slate-400 dark:text-slate-500">{itemCount}件</span>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
          <PencilIcon className="h-3.5 w-3.5" />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function CategoryManagerDialog({
  categories, items, onClose, onAdd, onEdit, onDelete, onReorder,
}: {
  categories: Category[];
  items: Item[];
  onClose: () => void;
  onAdd: (name: string, emoji: string) => void;
  onEdit: (id: string, name: string, emoji: string) => void;
  onDelete: (id: string) => void;
  onReorder: (categories: Category[]) => void;
}) {
  const [editingId,       setEditingId]       = useState<string | null>(null);
  const [editName,        setEditName]        = useState("");
  const [editEmoji,       setEditEmoji]       = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showAddForm,     setShowAddForm]     = useState(false);
  const [newName,         setNewName]         = useState("");
  const [newEmoji,        setNewEmoji]        = useState("🏷️");
  const newNameRef  = useRef<HTMLInputElement>(null);
  const editNameRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    onReorder(arrayMove(categories, oldIndex, newIndex));
  }


  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditEmoji(cat.emoji);
  }

  function saveEdit() {
    if (!editName.trim() || !editingId) return;
    onEdit(editingId, editName.trim(), editEmoji);
    setEditingId(null);
  }

  function handleAdd() {
    if (!newName.trim()) return;
    onAdd(newName.trim(), newEmoji);
    setNewName("");
    setNewEmoji("🏷️");
    setShowAddForm(false);
  }

  const confirmCat = categories.find((c) => c.id === confirmDeleteId);
  const itemCount  = (id: string) => items.filter((i) => i.categoryId === id).length;

  const EmojiGrid = ({ value, onChange }: { value: string; onChange: (e: string) => void }) => (
    <div className="grid grid-cols-8 gap-1">
      {EMOJI_OPTIONS.map((e) => (
        <button key={e} type="button" onClick={() => onChange(e)}
          className={`text-lg p-1 rounded-lg transition-all ${value === e ? "bg-violet-100 dark:bg-violet-900/40 scale-110 shadow-sm" : "hover:bg-slate-100 dark:hover:bg-slate-700"}`}>
          {e}
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm z-10 shadow-2xl max-h-[85vh] flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">カテゴリ管理</h2>
          <button onClick={onClose} className="text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 text-xl p-1">✕</button>
        </div>

        {/* list */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={categories.map((c) => c.id)} strategy={rectSortingStrategy}>
              {categories.map((cat) => {
                const colors = CATEGORY_COLORS[cat.colorIndex % CATEGORY_COLORS.length];
                if (editingId === cat.id) {
                  return (
                    <div key={cat.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-3 space-y-3">
                      <EmojiGrid value={editEmoji} onChange={setEditEmoji} />
                      <input ref={editNameRef} type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="カテゴリ名"
                        className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200" />
                      <div className="flex gap-2">
                        <button onClick={() => setEditingId(null)} className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">キャンセル</button>
                        <button onClick={saveEdit} className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold">保存</button>
                      </div>
                    </div>
                  );
                }
                return (
                  <SortableCategoryRow key={cat.id} cat={cat} colors={colors} itemCount={itemCount(cat.id)}
                    onEdit={() => startEdit(cat)} onDelete={() => setConfirmDeleteId(cat.id)} />
                );
              })}
            </SortableContext>
          </DndContext>
        </div>

        {/* add section */}
        <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3">
          {showAddForm ? (
            <div className="space-y-3">
              <EmojiGrid value={newEmoji} onChange={setNewEmoji} />
              <input
                ref={newNameRef}
                type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="カテゴリ名"
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500"
              />
              <div className="flex gap-2">
                <button onClick={() => { setShowAddForm(false); setNewName(""); setNewEmoji("🏷️"); }}
                  className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  キャンセル
                </button>
                <button onClick={handleAdd}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold">
                  追加
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 text-sm text-slate-400 dark:text-slate-500 hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-500 dark:hover:text-violet-400 transition-colors">
              ＋ カテゴリを追加
            </button>
          )}
        </div>

        {/* delete confirmation overlay */}
        {confirmDeleteId && (
          <div className="absolute inset-0 bg-white dark:bg-slate-800 rounded-3xl flex flex-col items-center justify-center p-6 gap-4">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 text-center">
              「{confirmCat?.emoji} {confirmCat?.name}」を削除しますか？
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
              このカテゴリに登録されたすべての商品（{itemCount(confirmDeleteId)}件）も削除されます。
            </p>
            <div className="flex gap-3 w-full">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                キャンセル
              </button>
              <button
                onClick={() => { onDelete(confirmDeleteId); setConfirmDeleteId(null); }}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                削除
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== SettingsDialog =====================
function SettingsDialog({
  onClose, roomId, passphrase, onPassphraseSave,
}: {
  onClose: () => void;
  roomId: string;
  passphrase: string;
  onPassphraseSave: (pass: string) => void;
}) {
  const [passInput,    setPassInput]    = useState(passphrase);
  const [copied,       setCopied]       = useState(false);
  const [isIOS,        setIsIOS]        = useState(false);
  const [isInstalled,  setIsInstalled]  = useState(false);
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

          {/* ホーム画面に追加（未インストール＆対応端末のみ表示） */}
          {!isInstalled && (isIOS || deferredPrompt) && (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ArrowUpOnSquareIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">ホーム画面に追加</span>
              </div>
              {isIOS ? (
                <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">1</span>
                    <span>画面下部の共有ボタン（<ArrowUpOnSquareIcon className="h-3.5 w-3.5 inline" />）をタップ</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">2</span>
                    <span>「ホーム画面に追加」を選択</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">3</span>
                    <span>「追加」をタップして完了</span>
                  </li>
                </ol>
              ) : (
                <button onClick={handleInstall} className="w-full rounded-xl bg-[#22C55E] py-2.5 text-sm font-semibold text-white transition hover:bg-green-400">
                  ホーム画面にインストール
                </button>
              )}
            </div>
          )}

          {/* グループ設定 */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800 dark:text-white">グループ設定</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(getRoomShareUrl(roomId));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors ${copied ? "text-violet-500 dark:text-violet-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}
                title="共有リンクをコピー"
              >
                <LinkIcon className="h-4 w-4" />
                {copied && <span>コピー済！</span>}
              </button>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">ルームID</p>
              <span className="block font-mono text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2">{roomId}</span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">合言葉（任意）</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={passInput}
                  onChange={(e) => setPassInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") onPassphraseSave(passInput); }}
                  placeholder="例: toyama（なければ空欄）"
                  className="flex-1 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500"
                />
                <button
                  onClick={() => onPassphraseSave(passInput)}
                  className="px-3 py-2 rounded-xl bg-violet-500 text-white text-xs font-semibold hover:bg-violet-600 transition-colors"
                >
                  保存
                </button>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">友人には URL と合言葉を別々に伝えてください</p>
            </div>
          </div>

          {/* アップデート情報 */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800 dark:text-white">アップデート情報</span>
              <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                v{APP_VERSION}
              </span>
            </div>
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {CHANGELOG.map((entry, i) => (
                <div key={entry.version}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      i === 0
                        ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    }`}>v{entry.version}</span>
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
                  {i < CHANGELOG.length - 1 && <div className="mt-3 border-b border-slate-100 dark:border-slate-700" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== StoreManagerDialog =====================
function SortableStoreRow({ store, isEditing, editMemo, onEditMemoChange, onSaveMemo, onCancelEdit, onStartEdit, onDelete }: {
  store: Store;
  isEditing: boolean;
  editMemo: string;
  onEditMemoChange: (v: string) => void;
  onSaveMemo: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: store.id, disabled: isEditing });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={`bg-slate-50 dark:bg-slate-700/50 rounded-xl px-3 py-2.5 ${isDragging ? "opacity-50 shadow-lg" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button {...attributes} {...listeners} className="text-slate-300 dark:text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing touch-none p-0.5 shrink-0">
            <Bars3Icon className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <span className="text-sm text-slate-700 dark:text-slate-200">{store.name}</span>
            {!isEditing && store.memo && (
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{store.memo}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onStartEdit} className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-violet-400 transition-colors">
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-400 transition-colors">✕</button>
        </div>
      </div>
      {isEditing && (
        <div className="mt-2 flex gap-2">
          <input
            type="text" value={editMemo} onChange={(e) => onEditMemoChange(e.target.value)}
            placeholder="例: 毎週水曜ポイント5倍"
            onKeyDown={(e) => { if (e.key === "Enter") onSaveMemo(); if (e.key === "Escape") onCancelEdit(); }}
            className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300 dark:focus:ring-violet-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-500"
          />
          <button onClick={onSaveMemo} className="px-2.5 py-1.5 rounded-lg bg-violet-500 text-white text-xs font-semibold">保存</button>
          <button onClick={onCancelEdit} className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs text-slate-500 dark:text-slate-400">✕</button>
        </div>
      )}
    </div>
  );
}

function StoreManagerDialog({
  stores, onClose, onAdd, onDelete, onReorder, onUpdateMemo,
}: {
  stores: Store[];
  onClose: () => void;
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
  onReorder: (stores: Store[]) => void;
  onUpdateMemo: (id: string, memo: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editMemoText, setEditMemoText] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  function handleAdd(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    onAdd(newName.trim());
    setNewName("");
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stores.findIndex((s) => s.id === active.id);
    const newIndex = stores.findIndex((s) => s.id === over.id);
    onReorder(arrayMove(stores, oldIndex, newIndex));
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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={stores.map((s) => s.id)} strategy={rectSortingStrategy}>
                {stores.map((store) => (
                  <SortableStoreRow
                    key={store.id}
                    store={store}
                    isEditing={editingMemoId === store.id}
                    editMemo={editingMemoId === store.id ? editMemoText : (store.memo ?? "")}
                    onEditMemoChange={setEditMemoText}
                    onStartEdit={() => { setEditingMemoId(store.id); setEditMemoText(store.memo ?? ""); }}
                    onSaveMemo={() => { onUpdateMemo(store.id, editMemoText); setEditingMemoId(null); }}
                    onCancelEdit={() => setEditingMemoId(null)}
                    onDelete={() => setConfirmDeleteId(store.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
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
