#!/bin/sh
# Arranque de la tienda dentro del contenedor (ver `Dockerfile`).
#
# La primera vez que arranca un contenedor nuevo compila la tienda con el entorno real (el back
# tiene que estar respondiendo: `next build` lee el catálogo) y deja una marca. En los reinicios
# siguientes del mismo contenedor la marca ya está y solo levanta el servidor.
set -eu

cd /app
marker="apps/store/.next/.galpon-compilada"

if [ ! -f "$marker" ]; then
  echo "Compilando la tienda (primer arranque de esta versión: tarda unos minutos)..."
  # Si la primera compilación se corta, se reintenta una vez antes de darla por fallida.
  npm run build -w @galpon/store || {
    echo "La compilación falló: se reintenta una vez..."
    npm run build -w @galpon/store
  }
  touch "$marker"
  echo "Tienda compilada."
fi

exec npm run start -w @galpon/store
