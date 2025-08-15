#!/usr/bin/env node

const net = require('net');
const fs = require('fs');
const path = require('path');

const MCP_DIR = path.join(process.env.HOME, '.mcp', 'services');
const SERVICE_NAME = 'com.my.native_host';
const SERVICE_FILE = path.join(MCP_DIR, `${SERVICE_NAME}.json`);

let extensionPort;
let mcpSocket;
const pendingRequests = new Map();

// --- Service Discovery ---

function registerService(port) {
  if (!fs.existsSync(MCP_DIR)) {
    fs.mkdirSync(MCP_DIR, { recursive: true });
  }

  const serviceInfo = {
    name: SERVICE_NAME,
    port: port
  };

  fs.writeFileSync(SERVICE_FILE, JSON.stringify(serviceInfo, null, 2));
}

function unregisterService() {
  if (fs.existsSync(SERVICE_FILE)) {
    fs.unlinkSync(SERVICE_FILE);
  }
}

// --- MCP Server Implementation ---

const server = net.createServer((socket) => {
  console.log('MCP client connected');
  mcpSocket = socket;
  sendExtensionStatus('connected');

  mcpSocket.on('data', (data) => {
    const messages = data.toString().split('\n').filter(Boolean);
    for (const message of messages) {
      try {
        const mcpMessage = JSON.parse(message);
        handleMcpMessage(mcpMessage);
      } catch (e) {
        sendMcpError('Invalid JSON');
      }
    }
  });

  mcpSocket.on('close', () => {
    console.log('MCP client disconnected');
    mcpSocket = null;
    sendExtensionStatus('disconnected');
  });

  mcpSocket.on('error', (err) => {
    console.error('MCP socket error:', err);
  });
});

server.listen(0, '127.0.0.1', () => {
  const port = server.address().port;
  registerService(port);
});

process.on('exit', unregisterService);

function handleMcpMessage(message) {
  if (message.jsonrpc !== '2.0') {
    sendMcpError('Invalid JSON-RPC version');
    return;
  }

  if (message.method) {
    // This is a request from gemini-cli
    switch (message.method) {
      case 'mcp.ping':
        sendMcpResponse(message.id, 'pong');
        break;
      case 'mcp.getBrowserContent':
        if (extensionPort) {
          pendingRequests.set(message.id, message.id);
          const msg = {
            action: 'getBrowserContent',
            id: message.id
          };
          const buffer = Buffer.from(JSON.stringify(msg));
          const header = Buffer.alloc(4);
          header.writeUInt32LE(buffer.length, 0);
          extensionPort.stdout.write(header);
          extensionPort.stdout.write(buffer);
        }
        break;
      default:
        sendMcpError(`Method not found: ${message.method}`, message.id);
    }
  } else if (message.result) {
    // This is a response from the extension
    const originalId = pendingRequests.get(message.id);
    if (originalId) {
      sendMcpResponse(originalId, message.result);
      pendingRequests.delete(originalId);
    }
  }
}

function sendMcpResponse(id, result) {
  const response = {
    jsonrpc: '2.0',
    id: id,
    result: result
  };
  if (mcpSocket) {
    mcpSocket.write(JSON.stringify(response) + '\n');
  }
}

function sendMcpError(errorMessage, id = null) {
  const response = {
    jsonrpc: '2.0',
    id: id,
    error: {
      code: -32600,
      message: errorMessage
    }
  };
  if (mcpSocket) {
    mcpSocket.write(JSON.stringify(response) + '\n');
  }
}

function sendExtensionStatus(status) {
  if (extensionPort) {
    const msg = {
      action: 'mcpStatus',
      status: status
    };
    const buffer = Buffer.from(JSON.stringify(msg));
    const header = Buffer.alloc(4);
    header.writeUInt32LE(buffer.length, 0);
    extensionPort.stdout.write(header);
    extensionPort.stdout.write(buffer);
  }
}

// --- Chrome Extension Communication ---

process.stdin.on('data', (chunk) => {
  if (!extensionPort) {
    extensionPort = process;
  }

  const length = chunk.readUInt32LE(0);
  const message = chunk.slice(4).toString();
  const parsedMessage = JSON.parse(message);

  // Message from extension
  if (parsedMessage.action === 'response') {
    const originalId = pendingRequests.get(parsedMessage.id);
    if (originalId) {
      sendMcpResponse(originalId, parsedMessage.data);
      pendingRequests.delete(originalId);
    }
  } else {
    // Forward message from extension to gemini-cli as a notification
    if (mcpSocket) {
      const notification = {
        jsonrpc: '2.0',
        method: 'extension.message',
        params: parsedMessage
      };
      mcpSocket.write(JSON.stringify(notification) + '\n');
    }
  }
});