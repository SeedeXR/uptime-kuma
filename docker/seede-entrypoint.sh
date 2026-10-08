#!/bin/sh
# Start as root only to hand /app/data to the unprivileged "node" user (volumes written by
# earlier root-run releases are root-owned), then run the app without root privileges.
set -e
if [ "$(id -u)" = "0" ]; then
    find /app/data ! -user node -exec chown node:node {} +
    exec setpriv --reuid=node --regid=node --init-groups "$@"
fi
exec "$@"
