export const APP_VERSION = "1.2.1";

export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  changes: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.2.1",
    date: "2026-04-01",
    title: "入力UXの改善",
    changes: [
      "店舗選択をボタン式に変更",
      "お気に入り店舗機能の追加（店舗管理から設定）",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-03-25",
    title: "データの共有",
    changes: [
      "Firebase Firestoreによるデータ共有",
      "ルームIDで家族や友人とデータ共有",
      "合言葉によるルーム保護（設定画面から変更可）",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-03-24",
    title: "機能強化",
    changes: [
      "商品名の全カテゴリ横断検索",
      "メモ入力の履歴候補表示",
      "単価計算（g/kg/ml/L対応）",
      "価格エントリのインライン編集",
      "アイテム・カテゴリ・店舗の削除確認ダイアログ",
      "買うものリスト追加",
      "カテゴリの編集・削除",
      "Amazon / Yahoo! / 楽天へのショッピングリンク",
    ],
  },
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
