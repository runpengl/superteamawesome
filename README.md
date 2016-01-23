# superteamawesome
MIT ATS Mystery Hunt Puzzle Organizer

There are two parts to this app: One is the web site (Node/React/Firebase, inside `web-app/`), and one is the Chrome Extension (inside `chrome-extension/`) that will hook into the same firebase.

## Web Application

Before you can do anything, you'll need a config.js file with Google Auth and your Firebase information. Look at `config.js.example` or email styu314@gmail.com for a sample. You'll also need to enable the Google Drive, URL Shortener, and Google+ APIs in your [Project console](https://console.developers.google.com/project).

**Quick setup**

Run the following commands:

```
./setup.sh
./run.sh
```

For debug mode, add the `--debug` flag when running `run.sh`.

**Extended setup**

1. First run:
   ```
   npm install -g gulp
   npm install -g nodemon
   npm install
   ```

2. `gulp &` will compile the scss files and start a watcher to recompile scss on change
3. `npm start` will auto compile the jsx and bundle all the js into a bundle.js in public/js  
OR `npm run debug` will run a debug version that you can use node-inspector to debug; having the `DEBUG` environment variable set will cause debug statements to be logged as well.
4. Navigate to http://localhost:8080/

**Development**

We recommend using Sublime to develop, along with the following plugins:
- [Sublime CSS Comb](https://github.com/csscomb/sublime-csscomb) (orders your CSS rules for you!)
- [Babel Sublime](https://github.com/babel/babel-sublime) (React/JSX syntax highlighting)

**File Structure**

```
server.js               // Node server/routes/auth specified here
app.js                  // Main *frontend* JavaScript file
auth.js                 // Login functions for Passport (using Google OAuth)
config.js               // Configurations
gulpfile.js             // compiles SCSS files for you
package.json            // tasks/dependencies/devDependencies
run.sh                  // Convenience scripts
setup.sh
views/                  // Handlebars views
   layouts/             // Common layouts (login and main)
routes/                 // Route definitions
public/
   fonts/
   img/
   js/
   stylesheets/
     common/            // Common stylings, e.g. navigation, forms, tables
     includes/          // Variables, fonts, mixins
     pages/             // Specific page CSS
     defaults.scss      // Basically a reset.css
     main.scss          // Puts everything together
components/             // React components
```

**To Contribute**

Please either fork this repository and then make a pull request, or create a new feature branch in the format `feature/your-feature-name`, and then create a pull request when you're ready to merge.

Maybe some day we'll write tests too. But probably not.
