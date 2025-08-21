# Project Overview

This project is a TypeScript-based server that implements the Model-Context-Protocol (MCP). It provides a set of tools for interacting with a "coffee shop" menu. The server communicates over standard I/O using the JSON-RPC 2.0 protocol.

## Building and Running

*   **Build:** `pnpm build` (compiles TypeScript to JavaScript in the `dist` directory)
*   **Run:** `pnpm start` (executes the server using `ts-node`)
*   **Test:** `pnpm test` (currently no tests are implemented)
*   **Inspector:** `pnpm inspector` (runs the MCP inspector on the compiled server)

## Development Conventions

*   **Language:** TypeScript
*   **Module System:** ES Modules (`"type": "module"` in `package.json`)
*   **Compiler Target:** ES2016
*   **Strict Type-Checking:** Enabled
*   **Code Style:** The existing code should be used as a reference for style.
