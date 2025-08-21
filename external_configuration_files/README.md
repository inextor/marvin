# External Configuration for Native Messaging

This document explains how to set up the necessary configuration file for the browser to communicate with the native host script (`native-host.js`).

## 1. The Manifest File

The browser needs a manifest file to know how to launch and communicate with the native application. The content of this file is provided below.

**`com.my.native_host.json`**
```json
{
  "name": "com.my.native_host",
  "description": "Chrome Native Messaging API Example Host 2",
  "path": "/home/nextor/Projects/MarvinExtension/native-host.js",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://pdldfnckgdlcniaelobmlgblngkoiloc/"
  ]
}
```
**Important:** The `"path"` value in the JSON above must be an **absolute path** pointing to the `native-host.js` script on your system. Make sure to update it if you move the project directory.

## 2. Installation

You must copy the `com.my.native_host.json` file into the browser's configuration directory. The location depends on your browser and operating system.

### For Linux:

*   **Google Chrome / Chromium:**
    ```bash
    mkdir -p ~/.config/google-chrome/NativeMessagingHosts/
    cp com.my.native_host.json ~/.config/google-chrome/NativeMessagingHosts/
    ```

*   **Mozilla Firefox:**
    ```bash
    mkdir -p ~/.mozilla/native-messaging-hosts/
    cp com.my.native_host.json ~/.mozilla/native-messaging-hosts/
    ```

After copying the file, you may need to restart your browser for the changes to take effect.
