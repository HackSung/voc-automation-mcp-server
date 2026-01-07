#!/bin/bash

# GitHub 업로드 준비 스크립트
# 이 스크립트는 GitHub에 프로젝트를 업로드하기 전에 필요한 모든 검사를 수행합니다.

set -e

echo "🚀 GitHub 업로드 준비 시작..."
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 성공 카운터
SUCCESS_COUNT=0
TOTAL_CHECKS=8

# 1. .gitignore 확인
echo "📋 1/8: .gitignore 파일 확인..."
if grep -q "^\.env$" .gitignore && grep -q "^node_modules" .gitignore; then
    echo -e "${GREEN}✅ .gitignore 설정 정상${NC}"
    ((SUCCESS_COUNT++))
else
    echo -e "${RED}❌ .gitignore에 .env 또는 node_modules가 없습니다${NC}"
    exit 1
fi
echo ""

# 2. .env 파일이 git에 추가되지 않았는지 확인
echo "🔒 2/8: .env 파일 보안 확인..."
if [ -f .env ]; then
    if git ls-files --error-unmatch .env 2>/dev/null; then
        echo -e "${RED}❌ .env 파일이 Git에 추가되어 있습니다!${NC}"
        echo "다음 명령으로 제거하세요: git rm --cached .env"
        exit 1
    else
        echo -e "${GREEN}✅ .env 파일이 Git에서 제외됨${NC}"
        ((SUCCESS_COUNT++))
    fi
else
    echo -e "${YELLOW}⚠️  .env 파일이 없습니다 (괜찮음)${NC}"
    ((SUCCESS_COUNT++))
fi
echo ""

# 3. API 키 하드코딩 확인
echo "🔍 3/8: API 키 하드코딩 검사..."
if grep -r "sk-proj\|sk-ant" servers/ --include="*.ts" --include="*.js" 2>/dev/null | grep -v "process.env"; then
    echo -e "${RED}❌ API 키가 코드에 하드코딩되어 있습니다!${NC}"
    exit 1
else
    echo -e "${GREEN}✅ API 키 하드코딩 없음${NC}"
    ((SUCCESS_COUNT++))
fi
echo ""

# 4. 빌드 테스트
echo "🏗️ 4/8: 빌드 테스트..."
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 빌드 성공${NC}"
    ((SUCCESS_COUNT++))
else
    echo -e "${RED}❌ 빌드 실패${NC}"
    exit 1
fi
echo ""

# 5. 빌드 결과 확인
echo "📦 5/8: 빌드 산출물 확인..."
MISSING_FILES=0
for server in pii-security-server voc-analysis-server jira-integration-server internal-api-server; do
    if [ ! -f "servers/$server/dist/index.js" ]; then
        echo -e "${RED}❌ servers/$server/dist/index.js 없음${NC}"
        ((MISSING_FILES++))
    fi
done

if [ $MISSING_FILES -eq 0 ]; then
    echo -e "${GREEN}✅ 모든 서버 빌드 완료 (4/4)${NC}"
    ((SUCCESS_COUNT++))
else
    echo -e "${RED}❌ $MISSING_FILES 개 서버 빌드 누락${NC}"
    exit 1
fi
echo ""

# 6. 문서 확인
echo "📚 6/8: 문서 파일 확인..."
REQUIRED_DOCS=("README.md" "LICENSE" "CONTRIBUTING.md" "CHANGELOG.md" "docs/USER_GUIDE.md" "docs/API.md")
MISSING_DOCS=0

for doc in "${REQUIRED_DOCS[@]}"; do
    if [ ! -f "$doc" ]; then
        echo -e "${YELLOW}⚠️  $doc 없음${NC}"
        ((MISSING_DOCS++))
    fi
done

if [ $MISSING_DOCS -eq 0 ]; then
    echo -e "${GREEN}✅ 모든 필수 문서 존재${NC}"
    ((SUCCESS_COUNT++))
else
    echo -e "${YELLOW}⚠️  $MISSING_DOCS 개 문서 누락 (계속 진행)${NC}"
    ((SUCCESS_COUNT++))
fi
echo ""

# 7. Git 설정 확인
echo "⚙️ 7/8: Git 설정 확인..."
if git config user.name > /dev/null && git config user.email > /dev/null; then
    echo -e "${GREEN}✅ Git 사용자 정보 설정됨${NC}"
    echo "   사용자: $(git config user.name) <$(git config user.email)>"
    ((SUCCESS_COUNT++))
else
    echo -e "${YELLOW}⚠️  Git 사용자 정보 미설정${NC}"
    echo "다음 명령으로 설정하세요:"
    echo "  git config user.name \"Your Name\""
    echo "  git config user.email \"your.email@company.com\""
    ((SUCCESS_COUNT++))
fi
echo ""

# 8. node_modules 크기 확인
echo "📊 8/8: node_modules 크기 확인..."
if [ -d "node_modules" ]; then
    SIZE=$(du -sh node_modules | cut -f1)
    echo -e "${GREEN}✅ node_modules 존재 ($SIZE)${NC}"
    echo "   (Git에는 업로드되지 않습니다)"
    ((SUCCESS_COUNT++))
else
    echo -e "${YELLOW}⚠️  node_modules 없음 (npm install 필요)${NC}"
    ((SUCCESS_COUNT++))
fi
echo ""

# 결과 요약
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 검사 결과: $SUCCESS_COUNT/$TOTAL_CHECKS 통과"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $SUCCESS_COUNT -eq $TOTAL_CHECKS ]; then
    echo -e "${GREEN}🎉 모든 검사 통과! GitHub에 업로드할 준비가 완료되었습니다.${NC}"
    echo ""
    echo "다음 단계:"
    echo "  1. GitHub에서 새 저장소 생성"
    echo "  2. git init (아직 안 했다면)"
    echo "  3. git add ."
    echo "  4. git commit -m \"🎉 Initial commit: VOC 자동화 MCP 서버 v1.0.0\""
    echo "  5. git remote add origin <GitHub-URL>"
    echo "  6. git push -u origin main"
    echo ""
    echo "상세 가이드: docs/GITHUB_GUIDE.md"
else
    echo -e "${YELLOW}⚠️  일부 검사를 통과하지 못했습니다.${NC}"
    echo "위의 경고를 확인하고 필요시 수정하세요."
fi

echo ""
echo "✨ 완료!"

