# superteamawesome
MIT ATS Mystery Hunt Puzzle Organizer

Before you can do anything, you'll need a config.js file with Google Auth and your database connection information. Email styu314@gmail.com for a sample.

**For the lazy with a Mac and MAMP installed:**

Run the following commands:

```
./setup.sh
./run.sh
```

**For the non lazy or non macs or non MAMP-installers:**

To run, first run `npm install` (may need `sudo`), and then run `npm start`.
You might need to install nodemon (`npm install --global nodemon`) first.

To dev, you'll need to install gulp (`npm install --global gulp`) and run `gulp` to compile the scss files

`npm start` will auto compile the jsx and bundle all the js into a bundle.js in public/js
