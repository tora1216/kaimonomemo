# 買い物メモ 🐯

食品・日用品の価格を店舗ごとに記録・比較できるPWAアプリです。

## 機能

- **カテゴリ別商品管理** — 食品・日用品などカテゴリを自由に追加・編集・削除
- **店舗別価格記録** — 複数店舗の価格を登録して最安値を自動表示
- **単価計算** — g/kg/ml/L 入力で100g・100ml単位の単価を自動計算
- **価格編集** — 登録済み価格のインライン編集
- **検索** — 全カテゴリを横断して商品名で検索
- **ショッピングリンク** — Amazon / Yahoo!ショッピング / 楽天市場へワンタップで移動
- **買うものリスト** — チェックリスト形式の買い物メモ
- **ドラッグ&ドロップ並び替え** — 編集モードで商品の順序を変更
- **ダークモード対応**
- **PWA対応** — ホーム画面に追加してアプリとして使用可能

## 技術スタック

- [Next.js 16](https://nextjs.org/) (App Router, Static Export)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [@dnd-kit](https://dndkit.com/) — ドラッグ&ドロップ
- [@heroicons/react](https://heroicons.com/) — アイコン
- localStorage — データ永続化

## ローカル開発

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) で起動します。

## デプロイ

### GitHub Pages

`main` ブランチへの push で自動デプロイされます（`.github/workflows/deploy.yml`）。

### Vercel

1. [Vercel](https://vercel.com) にリポジトリをインポート
2. `next.config.ts` の `output: "export"` を削除（またはコメントアウト）
3. 環境変数 `NEXT_PUBLIC_BASE_PATH` は不要になるので削除

## データについて

現在はすべてのデータを **localStorage** に保存しているため、端末間での共有はできません。Firebase 連携により複数端末・友人との共有が可能になります（将来対応予定）。
