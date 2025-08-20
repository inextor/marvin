#!/usr/bin/env node

const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');

// --- Basic Logging ---
const LOG_FILE = path.join(os.homedir(), 'mcp-server-debug.log');
fs.writeFileSync(LOG_FILE, ''); // Clear log on start
function debugLog(message) {
  fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${message}\n`);
}

debugLog('--- MCP Server started ---');

// --- Service Discovery for Browser Host ---
const MCP_DIR = path.join(os.homedir(), '.mcp', 'services');
const SERVICE_NAME = 'com.my.native_host';
const SERVICE_FILE = path.join(MCP_DIR, `${SERVICE_NAME}.json`);

let browserSocket; // This will be the socket connection to browser-host.js
const pendingRequests = new Map();

// --- TCP Server for the Browser Host ---
const tcpServer = net.createServer((socket) => {
  debugLog('Browser host connected via TCP.');
  browserSocket = socket;

  browserSocket.on('data', (data) => {
    const message = JSON.parse(data.toString());
    debugLog(`Received message from browser host: ${JSON.stringify(message)}`);

    // Forward response from browser to Gemini CLI
    const originalId = pendingRequests.get(message.id);
    if (originalId) {
      sendToGemini({
        jsonrpc: '2.0',
        id: originalId,
        result: message.data
      });
      pendingRequests.delete(originalId);
    }
  });

  browserSocket.on('close', () => {
    debugLog('Browser host disconnected.');
    browserSocket = null;
  });

  browserSocket.on('error', (err) => {
    debugLog(`Browser host socket error: ${err}`);
  });
});

tcpServer.listen(0, '127.0.0.1', () => {
  const port = tcpServer.address().port;
  debugLog(`TCP server listening for browser host on port ${port}`);

  // Create the service file for the browser host to find
  if (!fs.existsSync(MCP_DIR)) {
    fs.mkdirSync(MCP_DIR, { recursive: true });
  }
  const serviceInfo = { name: SERVICE_NAME, port: port };
  fs.writeFileSync(SERVICE_FILE, JSON.stringify(serviceInfo, null, 2));
});

// --- Gemini CLI Communication (stdio) ---
let inputBuffer = '';
process.stdin.on('data', (chunk) => {
  inputBuffer += chunk.toString();
  // Assuming messages are newline-delimited JSON
  const messages = inputBuffer.split('\n');
  inputBuffer = messages.pop(); // Keep last partial message

  for (const message of messages) {
    if (message) {
      handleGeminiMessage(JSON.parse(message));
    }
  }
});

function handleGeminiMessage(message) {
  debugLog(`Received message from Gemini CLI: ${JSON.stringify(message)}`);

  if (message.method === 'mcp.getBrowserContent') {
    if (browserSocket) {
      const id = message.id;
      pendingRequests.set(id, id);
      const msgToBrowser = {
        action: 'getBrowserContent',
        id: id
      };
      browserSocket.write(JSON.stringify(msgToBrowser) + '\n');
      debugLog(`Forwarded getBrowserContent request to browser host.`);
    } else {
      sendToGemini({
        jsonrpc: '2.0',
        id: message.id,
        error: { code: -32000, message: 'Browser host not connected.' }
      });
    }
  }
}

function sendToGemini(message) {
  const response = JSON.stringify(message) + '\n';
  process.stdout.write(response);
  debugLog(`Sent message to Gemini CLI: ${response.trim()}`);
}

// --- Cleanup ---
process.on('exit', () => {
  if (fs.existsSync(SERVICE_FILE)) {
    fs.unlinkSync(SERVICE_FILE);
  }
  debugLog('--- MCP Server shutting down ---');
});
