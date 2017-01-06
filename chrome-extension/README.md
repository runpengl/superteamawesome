# Chrome Extension

The Chrome Extension has three major components: the popup, the background script, and the content script.

* The popup is accessed from the main Chrome toolbar and manages Google authentication.
* The background script listens to authentication changes, and is responsible for fetching Firebase data.
* The content script queries the background script and injects a toolbar into the current document when appropriate.

## Development

You'll need a `config.js` in the root directory that declares a `config` variable with a `firebase` key,
similar to the config needed for the `web-app`.

Then, to load the extension into Chrome, go to the [Extensions tab](chrome://extensions/),
click "Load unpacked extension...", and select this directory (`chrome-extension`).
