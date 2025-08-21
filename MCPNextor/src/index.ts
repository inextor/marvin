import * as readline from "node:readline";
import { stdin, stdout } from "node:process";
import * as net from 'net';

// --- TCP Client for Browser Host ---
let requestIdCounter = 0;

function sendRequestToHost(requestBody: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const requestId = `req_${requestIdCounter++}`;
    const request = { ...requestBody, id: requestId };

    client.connect(8888, '127.0.0.1', () => {
      client.write(JSON.stringify(request));
    });

    client.on('data', (data) => {
      try {
        const response = JSON.parse(data.toString());
        if (response.id === requestId) {
            if (response.error) {
                reject(new Error(response.error));
            } else {
                resolve(response.data);
            }
            client.destroy(); // Request is done, close connection.
        }
      } catch (e) {
        reject(e);
        client.destroy();
      }
    });

    client.on('error', (err) => {
      reject(err);
      client.destroy();
    });

    client.on('close', () => {
        // Can be used for cleanup if needed
    });

    // Safety timeout
    setTimeout(() => {
        reject(new Error('Request to browser host timed out'));
        client.destroy();
    }, 15000);
  });
}


const serverInfo = {
  name: "Coffee Shop & Browser Server",
  version: "1.1.0",
};

const drinks = [
  {
    name: "Latte",
    price: 5,
    description:
      "A latte is a coffee drink made with espresso and steamed milk.",
  },
];

const resources = [
  {
    uri: "menu://app",
    name: "menu",
    get: async () => {
      return {
        contents: [
          {
            uri: "menu://app",
            text: JSON.stringify(drinks),
          },
        ],
      };
    },
  },
];

const rl = readline.createInterface({
  input: stdin,
  output: stdout,
});

function sendResponse(id: number, result: object) {
  const response = {
    result,
    jsonrpc: "2.0",
    id,
  };
  console.log(JSON.stringify(response));
}

const tools = [
  {
    name: "getTitles",
    description: "Get the titles and IDs of all open browser tabs",
    inputSchema: { type: "object", properties: {} },
    execute: async (args: any) => {
        const browserResponse = await sendRequestToHost({ action: 'getTitles' });
        return { content: [{ type: "text", text: JSON.stringify(browserResponse) }] };
    },
  },
  {
    name: "getContent",
    description: "Get the innerHTML of an element in a specific tab using a CSS selector",
    inputSchema: {
        type: "object",
        properties: {
            tabId: { type: "number" },
            selector: { type: "string" },
        },
        required: ["tabId", "selector"],
    },
    execute: async (args: any) => {
        const { tabId, selector } = args;
        const browserResponse = await sendRequestToHost({ action: 'getContent', params: { tabId, selector } });
        return { content: [{ type: "text", text: JSON.stringify(browserResponse) }] };
    },
  },
  /*  {
    name: "getDrinkNames",
    description: "Get the names of the drinks in the shop",
    inputSchema: { type: "object", properties: {} },
    execute: async (args: any) => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ names: drinks.map((drink) => drink.name) }),
          },
        ],
      };
    },
  }, */
];

(async function main() {
  for await (const line of rl) {
    try {
      const json = JSON.parse(line);
      if (json.jsonrpc === "2.0") {
        if (json.method === "initialize") {
          sendResponse(json.id, {
            protocolVersion: "2025-03-26",
            capabilities: {
              tools: { listChanged: true },
              resources: { listChanged: true },
            },
            serverInfo,
          });
        }
      }
      if (json.method === "tools/list") {
        sendResponse(json.id, {
          tools: tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          })),
        });
      }
      if (json.method === "tools/call") {
        const tool = tools.find((tool) => tool.name === json.params.name);
        if (tool) {
          const toolResponse = await tool.execute(json.params.arguments);
          sendResponse(json.id, toolResponse);
        } else {
          sendResponse(json.id, {
            error: {
              code: -32602,
              message: `MCP error -32602: Tool ${json.params.name} not found`,
            },
          });
        }
      }
      if (json.method === "resources/list") {
        sendResponse(json.id, {
          resources: resources.map((resource) => ({
            uri: resource.uri,
            name: resource.name,
          })),
        });
      }
      if (json.method === "resources/read") {
        const uri = json.params.uri;
        const resource = resources.find((resource) => resource.uri === uri);
        if (resource) {
          sendResponse(json.id, await resource.get());
        } else {
          sendResponse(json.id, {
            error: { code: -32602, message: "Resource not found" },
          });
        }
      }
      if (json.method === "ping") {
        sendResponse(json.id, {});
      }
    } catch (error) {
      console.error(error);
    }
  }
})();