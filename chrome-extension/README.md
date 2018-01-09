# Chrome Extension

The Chrome Extension has three major components: the popup, the background script, and the content script.

* The popup is accessed from the main Chrome toolbar and manages Google authentication.
* The background script listens to authentication changes, and is responsible for fetching Firebase data.
* The content script queries the background script and injects a toolbar into the current document when appropriate.

## Development

### Config

You'll need a `config.js` in the `dist` directory that declares a `config` variable with the following properties:


```js
var config = {
    firebase: {
        apiKey: "EXAMPLE",
        authDomain: "EXAMPLE.firebaseapp.com",
        databaseURL: "https://EXAMPLE.firebaseio.com",
        storageBucket: "EXAMPLE.appspot.com"
    },
    slack: {
        clientId: "EXAMPLE",
        clientSecret: "EXAMPLE"
    }
};
````

Do not check this file into version control; make sure that it is gitignored.

### Build

Run `npm install`, which should install the required dependencies for development and bundling.

Next, run `webpack`, which reads configuration from `webpack.config.js` and `.babelrc` to preprocess and bundle the JavaScript source before outputting `*.bundle.js` files in `dist`.

### Load


Finally, to load the extension into Chrome, go to the [Extensions tab](chrome://extensions/),
click "Load unpacked extension...", and select the directory `chrome-extension/dist`.
