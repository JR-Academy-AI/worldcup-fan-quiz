#!/bin/bash
# 部署到 GitHub Pages（gh-pages 分支模式，token 无需 workflow scope）
# 用法：bash scripts/deploy-pages.sh
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build
cd dist
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.name="JR Deploy" -c user.email="dev@jiangren.com.au" commit -q -m "deploy $(date '+%Y-%m-%d %H:%M')"
git push --force https://github.com/JR-Academy-AI/worldcup-fan-quiz.git gh-pages
rm -rf .git
echo "✅ deployed → https://jr-academy-ai.github.io/worldcup-fan-quiz/"
