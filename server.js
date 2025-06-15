#!/usr/bin/env node

import express from "express";
import cors from "cors";

const app = express();
const port = process.env.PORT || 8787;

// Setup middleware
app.use(cors());
app.use(express.json());

// Manual SSE implementation
app.get("/sse", (req, res) => {
  console.log("SSE connection from:", req.ip);
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  // Don't end the response
  res.status(200);

  // Send initialization message after a brief delay
  setTimeout(() => {
    const initMessage = {
      jsonrpc: "2.0",
      method: "initialized",
      params: {}
    };
    res.write(`data: ${JSON.stringify(initMessage)}\n\n`);
  }, 100);

  // Keep connection alive with shorter interval
  const keepAlive = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (error) {
      console.log("SSE write error:", error.message);
      clearInterval(keepAlive);
    }
  }, 15000);

  req.on('close', () => {
    console.log("SSE connection closed");
    clearInterval(keepAlive);
  });

  req.on('error', (err) => {
    console.log("SSE request error:", err.message);
    clearInterval(keepAlive);
  });
});

// Message handler function
function handleMcpMessage(req, res, endpoint) {
  console.log(`${endpoint} received:`, req.body);
  
  try {
    const message = req.body;
    
    if (message.method === "initialize") {
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "helloworld-mcp-remote",
            version: "1.0.0"
          }
        }
      };
      res.json(response);
    } else if (message.method === "tools/list") {
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          tools: [
            {
              name: "hello",
              description: "Returns a simple 'Hello, World' message",
              inputSchema: {
                type: "object",
                properties: {},
                required: []
              }
            }
          ]
        }
      };
      res.json(response);
    } else if (message.method === "tools/call") {
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          content: [
            {
              type: "text",
              text: "Hello, World"
            }
          ]
        }
      };
      res.json(response);
    } else if (message.method === "notifications/initialized") {
      console.log("Received initialized notification");
      res.status(200).json({});
    } else if (message.method && message.method.startsWith("notifications/")) {
      console.log("Received notification:", message.method);
      res.status(200).json({});
    } else {
      console.log("Unknown method:", message.method);
      res.status(400).json({
        jsonrpc: "2.0",
        id: message.id || null,
        error: {
          code: -32601,
          message: "Method not found"
        }
      });
    }
  } catch (error) {
    console.error(`Error handling ${endpoint}:`, error);
    res.status(500).json({
      jsonrpc: "2.0",
      id: req.body?.id || null,
      error: {
        code: -32603,
        message: "Internal error"
      }
    });
  }
}

app.post("/sse", async (req, res) => {
  handleMcpMessage(req, res, "POST /sse");
});

app.post("/message", async (req, res) => {
  handleMcpMessage(req, res, "POST /message");
});

app.get("/health", (_, res) => {
  res.json({ status: "ok", server: "helloworld-mcp-remote" });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Remote MCP server listening on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`SSE endpoint: http://localhost:${port}/sse`);
});