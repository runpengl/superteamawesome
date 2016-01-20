# superteamawesome
MIT ATS Mystery Hunt Puzzle Organizer

There are two parts to this app: One is the web site (Node/React/Firebase, inside `web-app/`), and one is the Chrome Extension (inside `chrome-extension/`) that will hook into the same firebase.

## Web Application

Before you can do anything, you'll need a config.js file with Google Auth and your database connection information. Look at `config.js.example` or email styu314@gmail.com for a sample. You'll also need to enable the Google Drive, URL Shortener, and Google+ APIs in your [Project console](https://console.developers.google.com/project).

**Quick setup for those with a Mac and MAMP installed:**

Run the following commands:

```
./setup.sh
./run.sh
```

For debug mode, add the `--debug` flag when running `run.sh`.

**Extended setup or for those with non macs or non MAMP-installers:**

1. First run:
   ```
   npm install -g gulp
   npm install -g nodemon
   npm install
   ```

2. `npm run migrate` will run necessary database migrations
3. `gulp &` will compile the scss files and start a watcher to recompile scss on change
4. `npm start` will auto compile the jsx and bundle all the js into a bundle.js in public/js  
OR `npm run debug` will run a debug version that you can use node-inspector to debug; having the `DEBUG` environment variable set will cause debug statements to be logged as well.
5. Navigate to http://localhost:8080/

**To Contribute**

Please either fork this repository and then make a pull request, or create a new feature branch in the format `feature/your-feature-name`, and then create a pull request when you're ready to merge.

Maybe some day we'll write tests too. But probably not.
