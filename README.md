# 買い物メモ 🐯

食品・日用品の価格を店舗ごとに記録・比較できるPWAアプリです。
Firebase Firestore によりリアルタイムでデータを共有できます。

## 機能

- **カテゴリ別商品管理** — 食品・日用品などカテゴリを自由に追加・編集・削除
- **店舗別価格記録** — 複数店舗の価格を登録して最安値を自動表示
- **単価計算** — g/kg/ml/L 入力で100g・100ml単位の単価を自動計算
- **価格編集** — 登録済み価格のインライン編集
- **検索** — 全カテゴリを横断して商品名で検索
- **ショッピングリンク** — Amazon / Yahoo!ショッピング / 楽天市場へワンタップで移動
- **買うものリスト** — チェックリスト形式の買い物メモ
- **ドラッグ&ドロップ並び替え** — 編集モードで商品の順序を変更
- **リアルタイム共有** — 同じサイトにアクセスした全員がデータを共有・同期
- **ダークモード対応**
- **PWA対応** — ホーム画面に追加してアプリとして使用可能

## 技術スタック

- [Next.js 16](https://nextjs.org/) (App Router)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [Firebase Firestore](https://firebase.google.com/docs/firestore) — リアルタイムデータ同期
- [@dnd-kit](https://dndkit.com/) — ドラッグ&ドロップ
- [@heroicons/react](https://heroicons.com/) — アイコン

## ローカル開発

```bash
npm install
cp .env.local.example .env.local
# .env.local に Firebase の設定を記入する
npm run dev
```

[http://localhost:3000](http://localhost:3000) で起動します。

## Firebase セットアップ

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. **Firestore Database** を作成（本番モード or テストモード）
3. プロジェクトの「ウェブアプリを追加」から設定値を取得
4. `.env.local` に設定値を記入

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

### Firestore セキュリティルール

テスト用（全員が読み書き可能）:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> 公開範囲を限定したい場合は IP 制限や認証を追加してください。

## Vercel へのデプロイ

1. [Vercel](https://vercel.com) にリポジトリをインポート
2. 環境変数に `.env.local` の内容を設定
3. デプロイ完了 — `main` ブランチへの push で自動デプロイ

## データ共有について

同じ Firebase プロジェクトに接続したユーザー全員が **同じデータをリアルタイムで共有** します。
一人が価格を登録すると、他の端末にも即座に反映されます。
