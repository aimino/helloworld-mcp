#!/usr/bin/env node

import express from "express";
import cors from "cors";
import { networkInterfaces } from "os";

const app = express();
const port = process.env.PORT || 8787;

// Get local IP addresses
function getLocalIpAddresses() {
  const interfaces = networkInterfaces();
  const addresses = [];
  
  for (const interfaceName in interfaces) {
    const networkInterface = interfaces[interfaceName];
    for (const network of networkInterface) {
      if (!network.internal && network.family === 'IPv4') {
        addresses.push(network.address);
      }
    }
  }
  
  return addresses;
}

// Setup middleware
app.use(cors());
app.use(express.json());

// Global storage for SSE connections
global.sseConnections = new Map();

// MCP SSE endpoint - server-to-client message stream
app.get("/sse", (req, res) => {
  console.log("MCP SSE connection from:", req.ip);
  console.log("User-Agent:", req.get('User-Agent'));
  
  // Set proper SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  console.log("SSE headers set successfully");
  
  // Generate session ID for this connection
  const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`Generated session ID: ${sessionId}`);
  
  // Send initial response
  res.status(200);
  
  // CRITICAL: Send endpoint event immediately (required by MCP SDK)
  try {
    const endpointUrl = `/messages?sessionId=${sessionId}`;
    res.write(`event: endpoint\ndata: ${endpointUrl}\n\n`);
    console.log(`✓ Sent endpoint event: ${endpointUrl}`);
  } catch (error) {
    console.error("Failed to send endpoint event:", error);
    return;
  }

  // Store connection for session management
  global.sseConnections.set(sessionId, res);
  console.log(`✓ Stored SSE connection for session ${sessionId}`);
  
  // Keep connection alive with heartbeat
  const keepAlive = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
      console.log(`Heartbeat sent for session ${sessionId}`);
    } catch (error) {
      console.log("SSE write error:", error.message);
      clearInterval(keepAlive);
      global.sseConnections.delete(sessionId);
    }
  }, 30000);
  
  console.log("✓ Heartbeat interval started");

  req.on('close', () => {
    console.log(`SSE connection closed for session ${sessionId}`);
    clearInterval(keepAlive);
    global.sseConnections.delete(sessionId);
  });

  req.on('error', (err) => {
    console.log(`SSE request error for session ${sessionId}:`, err.message);
    clearInterval(keepAlive);
    global.sseConnections.delete(sessionId);
  });
});

// Handle messages endpoint (client-to-server messages via POST)
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  console.log(`POST /messages received from session ${sessionId}:`, req.body);
  console.log(`Request from IP: ${req.ip}`);
  
  if (!sessionId) {
    return res.status(400).json({ error: "Missing sessionId parameter" });
  }
  
  try {
    const message = req.body;
    const response = await handleMcpMessage(message, sessionId);
    
    if (response) {
      // Send response back via SSE
      const sseConnection = global.sseConnections.get(sessionId);
      if (sseConnection) {
        try {
          sseConnection.write(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
          console.log(`✓ Sent response via SSE to session ${sessionId}:`, response);
        } catch (error) {
          console.error(`Failed to send SSE response to session ${sessionId}:`, error);
        }
      } else {
        console.warn(`No SSE connection found for session ${sessionId}`);
      }
    }
    
    // Always respond with 202 Accepted for POST messages
    res.status(202).json({});
  } catch (error) {
    console.error(`Error handling message for session ${sessionId}:`, error);
    res.status(500).json({
      jsonrpc: "2.0",
      id: req.body?.id || null,
      error: {
        code: -32603,
        message: "Internal error"
      }
    });
  }
});

// Message handler function
async function handleMcpMessage(message, sessionId) {
  console.log(`Processing MCP message for session ${sessionId}:`, message);
  
  try {
    if (message.method === "initialize") {
      console.log("Processing initialize request with ID:", message.id);
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
            resources: {},
            prompts: {}
          },
          serverInfo: {
            name: "helloworld-mcp-remote",
            version: "1.0.0"
          }
        }
      };
      console.log("Sending initialize response:", response);
      return response;
    } else if (message.method === "tools/list") {
      console.log("Processing tools/list request with ID:", message.id);
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
      console.log("Sending tools/list response:", response);
      return response;
    } else if (message.method === "tools/call") {
      console.log("Processing tools/call request with ID:", message.id);
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
      console.log("Sending tools/call response:", response);
      return response;
    } else if (message.method === "resources/list") {
      console.log("Processing resources/list request with ID:", message.id);
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          resources: []
        }
      };
      console.log("Sending resources/list response:", response);
      return response;
    } else if (message.method === "prompts/list") {
      console.log("Processing prompts/list request with ID:", message.id);
      const response = {
        jsonrpc: "2.0",
        id: message.id,
        result: {
          prompts: []
        }
      };
      console.log("Sending prompts/list response:", response);
      return response;
    } else if (message.method === "notifications/initialized") {
      console.log("✓ Received initialized notification - MCP handshake complete");
      return null; // No response needed for notifications
    } else if (message.method && message.method.startsWith("notifications/")) {
      console.log("Received notification:", message.method);
      return null; // No response needed for notifications
    } else {
      console.log("Unknown method:", message.method);
      return {
        jsonrpc: "2.0",
        id: message.id || null,
        error: {
          code: -32601,
          message: "Method not found"
        }
      };
    }
  } catch (error) {
    console.error(`Error handling message for session ${sessionId}:`, error);
    return {
      jsonrpc: "2.0",
      id: message?.id || null,
      error: {
        code: -32603,
        message: "Internal error"
      }
    };
  }
}

app.get("/health", (_, res) => {
  res.json({ status: "ok", server: "helloworld-mcp-remote" });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  const localIps = getLocalIpAddresses();
  
  console.log(`✓ Remote MCP server listening on port ${port}`);
  console.log(`✓ Health check: http://localhost:${port}/health`);
  console.log(`✓ SSE endpoint: http://localhost:${port}/sse`);
  
  // Display IP addresses
  if (localIps.length > 0) {
    console.log('\nAlso accessible via IP addresses:');
    localIps.forEach(ip => {
      console.log(`  Health check: http://${ip}:${port}/health`);
      console.log(`  SSE endpoint: http://${ip}:${port}/sse`);
    });
  }
  
  console.log('\n🚀 MCP Server ready! Key features:');
  console.log('  - Proper SSE endpoint event handling');
  console.log('  - Session-based message routing');
  console.log('  - Full MCP protocol support');
});