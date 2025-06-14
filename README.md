# Hello World MCP Server

「Hello, World」を返すシンプルなローカルMCPサーバーの実装です。標準入出力（stdio）トランスポートを使用します。

## 機能

- **helloツール**: 「Hello, World」メッセージを返すシンプルなツール
- **Stdioトランスポート**: 標準入出力を使用したローカル実行

## インストール

```bash
npm install
```

## 使用方法

```bash
npm start
```

このサーバーは標準入出力で動作するため、直接実行しても対話的な出力は表示されません。MCPクライアント（Claude Code など）から呼び出されることを想定しています。

## Claude Code設定

Claude Codeの設定ファイル（`claude_desktop_config.json`）に以下の設定を追加してください：

```json
{
  "mcpServers": {
    "helloworld-mcp": {
      "command": "node",
      "args": ["/path/to/your/helloworld-mcp/server.js"]
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

## 開発

このサーバーは Model Context Protocol (MCP) の仕様に準拠したローカルサーバーの実装例です。Claude CodeやClaude Desktopなどのローカル開発環境で使用できます。

### ファイル構成

- `server.js` - Stdio ベースのMCPサーバー
- `package.json` - プロジェクト設定と依存関係

### 拡張方法

新しいツールを追加するには、`setupToolHandlers()` メソッドで `ListToolsRequestSchema` と `CallToolRequestSchema` のハンドラーを更新してください。