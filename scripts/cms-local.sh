#!/usr/bin/env bash
# 로컬 글쓰기: Decap CMS 로컬 백엔드(:8081)와 Gatsby 개발 서버(:8000)를 함께 띄운다. 사용법은 WRITING.md.
# Gatsby 2 빌드는 Node 10에서만 돌고, decap-server는 최신 문법을 써서 Node 14 이상이 필요해
# 두 프로세스의 Node 버전을 나눠 실행한다.
set -euo pipefail
cd "$(dirname "$0")/.."

# yarn run은 현재 Node의 node 래퍼(/tmp/yarn--*)를 PATH 맨 앞에 넣는다.
# 이게 남아 있으면 nvm으로 버전을 바꿔도 래퍼의 Node가 잡히므로 뺀다.
PATH="$(printf '%s' "$PATH" | tr ':' '\n' | grep -v '/yarn--' | paste -sd: -)"
export PATH

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  echo "nvm이 필요합니다 (Node 10: 블로그 개발 서버, Node 14 이상: 편집기 저장 서버)." >&2
  exit 1
fi
# shellcheck disable=SC1090,SC1091
. "$NVM_DIR/nvm.sh"

PROXY_NODE="${CMS_PROXY_NODE:-default}" # Node 14 이상이어야 한다
SITE_NODE="${CMS_SITE_NODE:-10}"

# 종료(Ctrl+C) 시 저장 서버까지 같이 내린다
trap 'trap - EXIT INT TERM; kill 0' EXIT INT TERM

nvm exec --silent "$PROXY_NODE" npx --yes decap-server@3.11.3 &

nvm use --silent "$SITE_NODE"
echo "글쓰기 편집기: http://localhost:8000/admin/ (개발 서버가 뜬 뒤 열기)"
yarn develop
