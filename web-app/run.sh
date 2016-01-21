#!/bin/bash

export NODE_ENV=development
gulp &
if [[ $* == *--debug* ]]; then
  export DEBUG=superteamawesome:*
  npm run debug
else
  npm start
fi
