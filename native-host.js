#!/usr/bin/env node

const net = require('net');

let extensionPort;
let mcpSocket;

// --- MCP Server Implementation ---

const server = net.createServer((socket) => {
  mcpSocket = socket;

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
    mcpSocket = null;
  });

  mcpSocket.on('error', (err) => {
    // In a real implementation, you would want to log this
  });
});

server.listen(8080, '127.0.0.1');

function handleMcpMessage(message) {
  if (message.jsonrpc !== '2.0') {
    sendMcpError('Invalid JSON-RPC version');
    return;
  }

  if (message.method) {
    // This is a request from gemini-cli
    switch (message.method) {
      case 'mcp.echo':
        if (extensionPort) {
          const msg = {
            text: message.params
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
    // This is a response from gemini-cli, forward to extension
    if (extensionPort) {
      const msg = {
        text: message.result
      };
      const buffer = Buffer.from(JSON.stringify(msg));
      const header = Buffer.alloc(4);
      header.writeUInt32LE(buffer.length, 0);
      extensionPort.stdout.write(header);
      extensionPort.stdout.write(buffer);
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

// --- Chrome Extension Communication ---

process.stdin.on('data', (chunk) => {
  if (!extensionPort) {
    extensionPort = process;
  }

  const length = chunk.readUInt32LE(0);
  const message = chunk.slice(4).toString();
  const parsedMessage = JSON.parse(message);

  // Forward message from extension to gemini-cli as a notification
  if (mcpSocket) {
    const notification = {
      jsonrpc: '2.0',
      method: 'extension.message',
      params: parsedMessage
    };
    mcpSocket.write(JSON.stringify(notification) + '\n');
  }
});