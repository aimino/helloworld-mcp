# Hello World Remote MCP Server

「Hello, World」を返すシンプルなリモートMCPサーバーの実装です。HTTP + Server-Sent Events (SSE) トランスポートを使用します。

## 機能

- **helloツール**: 「Hello, World」メッセージを返すシンプルなツール
- **HTTPトランスポート**: Server-Sent Events (SSE) を使用したリモート通信
- **MCP SDK準拠**: Model Context Protocol の正式なSSE仕様に完全対応
- **セッション管理**: 接続ごとのセッションベースルーティング
- **CORS対応**: クロスオリジンリクエストをサポート
- **IPアドレス表示**: 起動時にローカルIPアドレスも表示

## インストール

```bash
npm install
```

## 使用方法

```bash
npm start
```

サーバーは `http://localhost:8787` で起動します。

- Health check: `http://localhost:8787/health`
- SSE endpoint: `http://localhost:8787/sse`
- Messages endpoint: `http://localhost:8787/messages?sessionId=xxx`

サーバーは起動時に利用可能なIPアドレスも表示します。

## 環境変数

- `PORT`: サーバーのポート番号（デフォルト: 8787）

## Claude Desktop設定

Claude Desktopの設定ファイル（`claude_desktop_config.json`）に以下のいずれかの設定を追加してください：

### 方法1: mcp-remoteパッケージを使用（推奨）

**ローカル実行の場合:**
```json
{
  "mcpServers": {
    "helloworld-mcp-remote": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:8787/sse",
        "--allow-http"
      ]
    }
  }
}
```

**WSLから接続する場合（Windows環境）:**
```json
{
  "mcpServers": {
    "helloworld-mcp-remote": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://172.17.244.162:8787/sse",
        "--allow-http"
      ]
    }
  }
}
```

> **注意**: WSLのIPアドレスは再起動時に変更される可能性があります。`ip addr show eth0` で現在のIPアドレスを確認してください。

### 方法2: 直接SSE接続を使用

**ローカル実行の場合:**
```json
{
  "mcpServers": {
    "helloworld-mcp-remote": {
      "transport": {
        "type": "sse",
        "url": "http://localhost:8787/sse"
      }
    }
  }
}
```

**WSLから接続する場合（Windows環境）:**
```json
{
  "mcpServers": {
    "helloworld-mcp-remote": {
      "transport": {
        "type": "sse",
        "url": "http://172.17.244.162:8787/sse"
      }
    }
  }
}
```

## 設定ファイルの場所

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%/Claude/claude_desktop_config.json
```

## API

### Hello Tool

MCPクライアントから `hello` ツールを呼び出すと、以下のレスポンスが返されます：

```json
{
  "content": [
    {
      "type": "text",
      "text": "Hello, World"
    }
  ]
}
```

### エンドポイント

- `GET /health` - サーバーの状態確認
- `GET /sse` - SSE接続の確立（endpointイベントでmessagesエンドポイントURLを通知）
- `POST /messages?sessionId=xxx` - MCPメッセージの処理（SSE経由でレスポンス返送）

## 開発

このサーバーは Model Context Protocol (MCP) の仕様に準拠したリモートサーバーの実装例です。Claude DesktopやClaude Codeなどのリモート環境で使用できます。

### 技術的詳細

- **SSE仕様準拠**: MCP SDK の要求に従い、接続時に `endpoint` イベントでメッセージングエンドポイントを通知
- **セッション管理**: 各SSE接続にユニークなsessionIdを生成し、メッセージルーティングに使用
- **双方向通信**: SSEで server→client、HTTP POSTで client→server の通信を実現
- **MCP対応メソッド**: initialize, tools/list, tools/call, resources/list, prompts/list, notifications

### ファイル構成

- `server.js` - HTTP + SSE ベースのリモートMCPサーバー
- `package.json` - プロジェクト設定と依存関係

### 拡張方法

新しいツールを追加するには、`handleMcpMessage()` 関数で新しいメソッドのハンドラーを追加してください。