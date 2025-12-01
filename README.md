# Document Chatbot

NotebookLMスタイルのドキュメントチャットボットアプリケーション。複数のドキュメントをアップロードして、その内容に基づいた質問応答ができます。

## 機能

- **ワークスペース管理**: 複数のワークスペースを作成して、プロジェクトごとにドキュメントを整理
- **ドキュメント管理**: PDF、Word、Excel、PowerPointなどのドキュメントをアップロード
- **テキスト抽出**: MarkItDownを使用してドキュメントから自動的にテキストを抽出
- **会話履歴**: 各ワークスペースで複数の会話を保存・管理
- **AI チャット**: LLMを使用してドキュメントの内容に基づいた質問応答

## 技術スタック

- **フロントエンド**: React 19 + Tailwind CSS 4 + shadcn/ui
- **バックエンド**: Express 4 + tRPC 11
- **データベース**: MySQL / TiDB (Drizzle ORM)
- **認証**: Manus OAuth
- **AI**: LLM統合（Manus Forge API）
- **ドキュメント処理**: MarkItDown (Python)

## セットアップ

詳細なセットアップ手順は [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) を参照してください。

### クイックスタート

```bash
# 依存関係のインストール
pnpm install

# Python依存関係
sudo pip3 install 'markitdown[all]'

# 環境変数の設定
cp .env.example .env
# .envファイルを編集して必要な環境変数を設定

# データベースマイグレーション
pnpm db:push

# 開発サーバーの起動
pnpm dev
```

## 環境変数

必要な環境変数の詳細は `.env.example` を参照してください。

主な環境変数:
- `DATABASE_URL`: データベース接続文字列
- `JWT_SECRET`: JWT認証用のシークレットキー
- `VITE_APP_ID`: Manus OAuth アプリケーションID
- `BUILT_IN_FORGE_API_KEY`: Manus Forge API キー

## プロジェクト構成

```
Document_Chatbot/
├── client/              # フロントエンドコード
│   ├── src/
│   │   ├── pages/      # ページコンポーネント
│   │   ├── components/ # UIコンポーネント
│   │   └── lib/        # ユーティリティ
├── server/              # バックエンドコード
│   ├── _core/          # フレームワークコア
│   ├── routers.ts      # tRPCルーター
│   └── db.ts           # データベースヘルパー
├── drizzle/             # データベーススキーマ
└── shared/              # 共有型定義
```

## ライセンス

MIT

## サポート

問題が発生した場合は、[Issues](https://github.com/tomorrow56/Document_Chatbot/issues) を作成してください。
