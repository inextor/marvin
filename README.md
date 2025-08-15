# Chrome Native Messaging Example

This is a simple Chrome extension that demonstrates how to use the native messaging API to communicate with a local application.

## How it works

The extension consists of a popup with a button. When the button is clicked, it sends a message "Hello" to a native application running on the user's computer. The native application responds with "There", and the extension displays the response in the popup.

This example uses a Node.js script as the native application.

## Setup Instructions

1.  **Load the extension in Chrome:**
    *   Open Chrome and navigate to `chrome://extensions`.
    *   Enable "Developer mode".
    *   Click on "Load unpacked" and select the directory containing these files.
    *   Once the extension is loaded, you will see its ID. Copy it.

2.  **Update the native host manifest:**
    *   Open the file `com.my.native_host.json`.
    *   Replace `knldjmfmopnpolahpmmgbagdohdnhkik` with the actual extension ID you copied in the previous step.

3.  **Install the native messaging host:**
    *   Make the `native-host.js` script executable:
        ```bash
        chmod +x native-host.js
        ```
    *   The `com.google.chrome.example.echo.json` file needs to be placed in a specific location on your system. For Linux, this is:
        ```bash
        mkdir -p ~/.config/google-chrome/NativeMessagingHosts/
        cp com.my.native_host.json ~/.config/google-chrome/NativeMessagingHosts/
        ```

4.  **Run the extension:**
    *   Click on the extension icon in the Chrome toolbar.
    *   Click the "Send Message" button.
    *   The text "There" should appear below the button.
