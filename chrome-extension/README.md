# Chrome Extension

The Chrome Extension has three major components: the popup, the background script, and the content script.

* The popup is accessed from the main Chrome toolbar and manages Google authentication.
* The background script listens to authentication changes, and is responsible for fetching Firebase data.
* The content script queries the background script and injects a toolbar into the current document when appropriate.

## Development

### Config

You'll need a `config.js` in the `src/background` directory that declares an object with the following properties:


```js
export default {
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

Next, run `npm run dist` (or `yarn dist` if you have yarn), which reads configuration from `webpack.config.js` and `.babelrc` to preprocess and bundle the JavaScript source before outputting `*.bundle.js` files in `dist`.

To have webpack watch your changes while you develop, run `npm run watch` or `yarn watch`.

### Load

Finally, to load the extension into Chrome, go to the [Extensions tab](chrome://extensions/),
click "Load unpacked extension...", and select the directory `chrome-extension/dist`.

To find the extensions tab click on the three dots on the top right > More tools > Extensions