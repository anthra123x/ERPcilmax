#!/usr/bin/env bash
# Ejecuta un comando con un Node real en el PATH.
#
# Por qué: en esta máquina `node` del PATH es Bun (~/.local/bin/node), y Bun no
# puede cargar `next.config.ts` — Next.js transpila ese archivo y lo evalúa como
# CommonJS, así que Bun lo parsea como JS crudo y revienta con
#   "Failed to load next.config.ts … Unexpected keyword 'export'"
#
# Uso:
#   scripts/with-node.sh npm run dev
#   scripts/with-node.sh npm run build
#   scripts/with-node.sh node -v
set -euo pipefail

is_real_node() {
  local bin="$1/node"
  [ -x "$bin" ] || return 1
  # Node real responde `node --version` con "v24.21.0". Bun no: avisa de que le
  # falta un script, así que el patrón v<major> lo distingue sin depender del
  # nombre del binario (que puede ser un symlink a bun).
  "$bin" --version 2>/dev/null | grep -qE '^v[0-9]+\.'
}

NODE_BIN_DIR=""
for dir in \
  ${NVM_DIR:-$HOME/.nvm}/versions/node/*/bin \
  "$HOME/.volta/bin" \
  "$HOME/.asdf/shims" \
  "$HOME/.config/opencode/runtime/node/bin" \
  /usr/local/bin \
  /usr/bin
do
  if is_real_node "$dir"; then
    NODE_BIN_DIR="$dir"
    break
  fi
done

if [ -z "$NODE_BIN_DIR" ]; then
  echo "with-node: no encontré un Node real (solo Bun) en el PATH." >&2
  echo "Instala Node con nvm o deja un Node en ~/.config/opencode/runtime/node/bin." >&2
  exit 1
fi

PATH="$NODE_BIN_DIR:$PATH"
export PATH

if [ "$1" = "--print" ]; then
  echo "$NODE_BIN_DIR"
  exit 0
fi

exec "$@"
