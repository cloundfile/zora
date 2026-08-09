#!/bin/bash
set -e

cat > /etc/profile.d/zora.sh <<'EOF'
export ZORA_BIN=/usr/bin/zora
export ZORA_INSTALLED=1
EOF

chmod 644 /etc/profile.d/zora.sh

exit 0