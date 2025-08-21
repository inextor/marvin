var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import * as readline from "node:readline";
import { stdin, stdout } from "node:process";
import * as net from 'net';
// --- TCP Client for Browser Host ---
let requestIdCounter = 0;
function sendRequestToHost(requestBody) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        const requestId = `req_${requestIdCounter++}`;
        const request = Object.assign(Object.assign({}, requestBody), { id: requestId });
        client.connect(8888, '127.0.0.1', () => {
            client.write(JSON.stringify(request));
        });
        client.on('data', (data) => {
            try {
                const response = JSON.parse(data.toString());
                if (response.id === requestId) {
                    if (response.error) {
                        reject(new Error(response.error));
                    }
                    else {
                        resolve(response.data);
                    }
                    client.destroy(); // Request is done, close connection.
                }
            }
            catch (e) {
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
        description: "A latte is a coffee drink made with espresso and steamed milk.",
    },
];
const resources = [
    {
        uri: "menu://app",
        name: "menu",
        get: () => __awaiter(void 0, void 0, void 0, function* () {
            return {
                contents: [
                    {
                        uri: "menu://app",
                        text: JSON.stringify(drinks),
                    },
                ],
            };
        }),
    },
];
const rl = readline.createInterface({
    input: stdin,
    output: stdout,
});
function sendResponse(id, result) {
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
        execute: (args) => __awaiter(void 0, void 0, void 0, function* () {
            const browserResponse = yield sendRequestToHost({ action: 'getTitles' });
            return { content: [{ type: "text", text: JSON.stringify(browserResponse) }] };
        }),
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
        execute: (args) => __awaiter(void 0, void 0, void 0, function* () {
            const { tabId, selector } = args;
            const browserResponse = yield sendRequestToHost({ action: 'getContent', params: { tabId, selector } });
            return { content: [{ type: "text", text: JSON.stringify(browserResponse) }] };
        }),
    },
    {
        name: "getDrinkNames",
        description: "Get the names of the drinks in the shop",
        inputSchema: { type: "object", properties: {} },
        execute: (args) => __awaiter(void 0, void 0, void 0, function* () {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ names: drinks.map((drink) => drink.name) }),
                    },
                ],
            };
        }),
    },
];
(function main() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        try {
            for (var _d = true, rl_1 = __asyncValues(rl), rl_1_1; rl_1_1 = yield rl_1.next(), _a = rl_1_1.done, !_a; _d = true) {
                _c = rl_1_1.value;
                _d = false;
                const line = _c;
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
                            const toolResponse = yield tool.execute(json.params.arguments);
                            sendResponse(json.id, toolResponse);
                        }
                        else {
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
                            sendResponse(json.id, yield resource.get());
                        }
                        else {
                            sendResponse(json.id, {
                                error: { code: -32602, message: "Resource not found" },
                            });
                        }
                    }
                    if (json.method === "ping") {
                        sendResponse(json.id, {});
                    }
                }
                catch (error) {
                    console.error(error);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = rl_1.return)) yield _b.call(rl_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    });
})();
