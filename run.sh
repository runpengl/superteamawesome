#!/bin/bash

export NODE_ENV=development
/bin/bash /Applications/MAMP/bin/start.sh
gulp &
if [[ $* == *--debug* ]]; then
  export DEBUG=superteamawesome:*
  npm run debug
else
  npm start
fi
