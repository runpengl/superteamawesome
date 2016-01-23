<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [superteamawesome](#superteamawesome)
  - [Web Application](#web-application)
    - [Quick setup](#quick-setup)
    - [Extended setup](#extended-setup)
    - [Environment](#environment)
    - [File Structure](#file-structure)
  - [To Contribute](#to-contribute)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# superteamawesome
MIT ATS Mystery Hunt Puzzle Organizer

There are two parts to this app: One is the web site (Node/React/Firebase, inside `web-app/`), and one is the Chrome Extension (inside `chrome-extension/`) that will hook into the same firebase.

## Web Application

Before you can do anything, you'll need a config.js file with Google Auth and your Firebase information. Look at `config.js.example` or email styu314@gmail.com for a sample. You'll also need to enable the Google Drive, URL Shortener, and Google+ APIs in your [Project console](https://console.developers.google.com/project).

### Quick setup

Run the following commands:

```
./setup.sh
./run.sh
```

For debug mode, add the `--debug` flag when running `run.sh`.

### Extended setup

1. First run:
   ```
   npm install -g gulp
   npm install -g nodemon
   npm install -g doctoc
   npm install
   ```
   `gulp` will run watch tasks to auto-compile SCSS files to CSS, `nodemon` will watch your node js files for changes and automatically restart the server upon detecting a change, and `doctoc` auto-creates table of contents in the github markdown files.
2. `gulp &` will compile the scss files and start a watcher to recompile scss on change
3. `npm start` will auto compile the jsx and bundle all the js into a bundle.js in public/js  
OR `npm run debug` will run a debug version that you can use node-inspector to debug; having the `DEBUG` environment variable set will cause debug statements to be logged as well.
4. Navigate to http://localhost:8080/

### Environment

We recommend using Sublime to develop, along with the following plugins:
- [Sublime CSS Comb](https://github.com/csscomb/sublime-csscomb) (orders your CSS rules for you!)
- [Babel Sublime](https://github.com/babel/babel-sublime) (React/JSX syntax highlighting)

### File Structure

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
     bundle.js          // This is the only JavaScript file on the front end*
   stylesheets/
     common/            // Common stylings, e.g. navigation, forms, tables
     includes/          // Variables, fonts, mixins
     pages/             // Specific page CSS
     defaults.scss      // Basically a reset.css
     main.scss          // Puts everything together
components/             // React components
```

*Note that bundle.js is built by browserify, which takes `app.js`, looks at the NPM modules it requires and then pulls it all in to bundle.js, basically allowing any node module to be used in the front end :)

## To Contribute

Please either fork this repository and then make a pull request, or create a new feature branch in the format `feature/your-feature-name`, and then create a pull request when you're ready to merge.

Maybe some day we'll write tests too. But probably not.

### Code Style

Yes this is kind of a hacky project, but there are some standards we'd hopefully like to maintain...

- CSS / SCSS
  - 2 spaces for indentation (not tabs!)
  - Alphabetize rules
  - Variables before declarations
  - Mixins before variables
  - Pseudo selectors before selectors
  - New line between blocks
  - Use classes when possible
  - Use variables when possible (or make one if you're repeating yourself, in `public/stylesheets/includes/_variables.scss`)
  - If you use !important I will hunt you down
  - Most of these can be auto-applied if you install [Sublime CSS Comb](https://github.com/csscomb/sublime-csscomb) and press <kbd>ctrl</kbd>+<kbd>shift</kbd>+<kbd>c</kbd> on the file.
