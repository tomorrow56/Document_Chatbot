# NotebookLM Chatbot デプロイメントガイド

このドキュメントは、NotebookLM Chatbotを別のサーバーにデプロイするための手順を説明します。

## 必要な環境

- Node.js 22.x以上
- pnpm 9.x以上
- MySQL 8.0以上（またはTiDB互換データベース）
- Python 3.11以上（ドキュメントテキスト抽出用）

## セットアップ手順

### 1. プロジェクトファイルの展開

```bash
unzip notebooklm-chatbot.zip
cd notebooklm-chatbot
```

### 2. 依存関係のインストール

```bash
# Node.js依存関係
pnpm install

# Python依存関係（ドキュメントテキスト抽出用）
sudo pip3 install 'markitdown[all]'
```

### 3. 環境変数の設定

プロジェクトルートに`.env`ファイルを作成し、以下の環境変数を設定してください:

```env
# データベース接続
DATABASE_URL=mysql://user:password@host:port/database

# JWT認証
JWT_SECRET=your-random-secret-key-here

# OAuth設定（Manus OAuth使用時）
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# アプリケーション設定
VITE_APP_TITLE=Document Chatbot
VITE_APP_LOGO=https://your-logo-url.com/logo.png

# オーナー情報（オプション）
OWNER_OPEN_ID=owner-open-id
OWNER_NAME=Owner Name

# Manus内部API（使用する場合）
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-api-key

# フロントエンド用API設定
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your-frontend-api-key

# アナリティクス（オプション）
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=your-website-id
```

### 4. データベースマイグレーション

```bash
pnpm db:push
```

### 5. ビルド

```bash
pnpm build
```

### 6. 起動

#### 開発モード
```bash
pnpm dev
```

#### 本番モード
```bash
pnpm start
```

## 重要な注意事項

### MarkItDownのインストール

ドキュメントからテキストを抽出するために、MarkItDownが必要です:

```bash
sudo pip3 install 'markitdown[all]'
```

インストール後、サーバーを再起動してください。

### データベーステーブルの作成

初回起動時に、必ず`pnpm db:push`を実行してデータベーステーブルを作成してください。

### 環境変数の確認

- `DATABASE_URL`: データベース接続文字列が正しいことを確認
- `JWT_SECRET`: ランダムな文字列を設定（セキュリティ重要）
- `VITE_APP_ID`: OAuth認証を使用する場合は必須

## トラブルシューティング

### ドキュメントのテキスト抽出が失敗する

1. MarkItDownがインストールされているか確認:
   ```bash
   python3 -c "import markitdown; print(markitdown.__file__)"
   ```

2. Pythonのパスを確認:
   ```bash
   which python3
   ```

3. サーバーを再起動

### データベース接続エラー

1. `DATABASE_URL`が正しいか確認
2. データベースサーバーが起動しているか確認
3. ファイアウォール設定を確認

### OAuth認証エラー

1. `VITE_APP_ID`と`OAUTH_SERVER_URL`が正しいか確認
2. OAuth設定がManusポータルで正しく設定されているか確認

## ディレクトリ構成

```
notebooklm-chatbot/
├── client/              # フロントエンドコード
│   ├── src/
│   │   ├── pages/      # ページコンポーネント
│   │   ├── components/ # 再利用可能なコンポーネント
│   │   └── lib/        # ユーティリティ
├── server/              # バックエンドコード
│   ├── _core/          # フレームワークコア
│   ├── routers.ts      # tRPCルーター
│   ├── db.ts           # データベースヘルパー
│   └── pdfUtils.ts     # PDF処理ユーティリティ
├── drizzle/             # データベーススキーマ
│   └── schema.ts       # テーブル定義
└── shared/              # 共有型定義

```

## サポート

問題が発生した場合は、以下を確認してください:

1. Node.jsとpnpmのバージョン
2. データベース接続
3. 環境変数の設定
4. サーバーログ

詳細なサポートが必要な場合は、プロジェクトのREADME.mdを参照してください。
