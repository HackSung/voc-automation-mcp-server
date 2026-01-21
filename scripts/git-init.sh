#!/bin/bash

# Git 저장소 초기화 및 첫 커밋 스크립트

set -e

echo "🎬 Git 저장소 초기화 시작..."
echo ""

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Git이 이미 초기화되어 있는지 확인
if [ -d .git ]; then
    echo -e "${YELLOW}⚠️  Git 저장소가 이미 초기화되어 있습니다.${NC}"
    read -p "다시 초기화하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "취소되었습니다."
        exit 1
    fi
    rm -rf .git
fi

# 2. Git 초기화
echo "📦 Git 저장소 초기화..."
git init
echo -e "${GREEN}✅ Git 초기화 완료${NC}"
echo ""

# 3. 기본 브랜치를 main으로 설정
echo "🌿 기본 브랜치를 main으로 설정..."
git branch -M main
echo -e "${GREEN}✅ 브랜치 설정 완료${NC}"
echo ""

# 4. Git 사용자 정보 확인
echo "👤 Git 사용자 정보 확인..."
if ! git config user.name > /dev/null 2>&1; then
    echo -e "${YELLOW}Git 사용자 이름을 입력하세요:${NC}"
    read -p "이름: " GIT_NAME
    git config user.name "$GIT_NAME"
fi

if ! git config user.email > /dev/null 2>&1; then
    echo -e "${YELLOW}Git 이메일을 입력하세요:${NC}"
    read -p "이메일: " GIT_EMAIL
    git config user.email "$GIT_EMAIL"
fi

echo -e "${GREEN}✅ 사용자: $(git config user.name) <$(git config user.email)>${NC}"
echo ""

# 5. 파일 추가
echo "📝 파일 스테이징..."
git add .

echo -e "${GREEN}✅ 파일 스테이징 완료${NC}"
echo ""

# 6. 스테이징된 파일 확인
echo "📋 추가될 파일:"
git diff --cached --name-status | head -20
TOTAL_FILES=$(git diff --cached --name-only | wc -l)
echo "   ... 총 $TOTAL_FILES 개 파일"
echo ""

# 7. 커밋 확인
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "다음 메시지로 커밋하시겠습니까?"
echo ""
echo "  🎉 Initial commit: VOC 자동화 MCP 서버 v1.0.0"
echo ""
echo "  - PII Security Server: 개인정보 자동 비식별화"
echo "  - VOC Analysis Server: LLM 기반 분석"
echo "  - Jira Integration Server: 자동 티켓팅"
echo "  - Internal API Server: 레거시 연동"
echo "  - 완전한 한글 문서"
echo "  - Nexus 배포 준비 완료"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

read -p "계속하시겠습니까? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo "취소되었습니다. 직접 커밋하세요:"
    echo "  git commit -m \"Your commit message\""
    exit 0
fi

# 8. 커밋
echo "💾 커밋 생성 중..."
git commit -m "🎉 Initial commit: VOC 자동화 MCP 서버 v1.0.0

- PII Security Server: 개인정보 자동 비식별화
- VOC Analysis Server: LLM 기반 분석
- Jira Integration Server: 자동 티켓팅
- Internal API Server: 레거시 연동
- 완전한 한글 문서
- Nexus 배포 준비 완료"

echo -e "${GREEN}✅ 커밋 완료${NC}"
echo ""

# 9. 다음 단계 안내
echo -e "${GREEN}🎉 성공적으로 첫 커밋을 완료했습니다!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "다음 단계:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣  GitHub에서 새 저장소 생성"
echo "   https://github.com/new"
echo ""
echo "2️⃣  원격 저장소 연결"
echo "   git remote add origin git@github.com:your-username/voc-automation-mcp-server.git"
echo ""
echo "3️⃣  GitHub에 푸시"
echo "   git push -u origin main"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 상세 가이드: docs/GITHUB_GUIDE.md"
echo ""
echo "✨ 완료!"

