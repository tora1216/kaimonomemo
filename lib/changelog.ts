export const APP_VERSION = "1.0.0";

export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  changes: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0.0",
    date: "2026-03-19",
    title: "初回リリース 🎉",
    changes: [
      "カテゴリ別商品管理",
      "店舗別価格記録・最安値表示",
      "ドラッグアンドドロップで並び替え",
      "ダークモード対応",
      "PWA対応（ホーム画面に追加可能）",
    ],
  },
];
