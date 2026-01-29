#!/bin/bash
# Nexus PyPI 배포 스크립트

set -e

echo "=== VOC Automation MCP Server - Nexus 배포 ===" 
echo ""

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 환경변수 확인
echo "1. 환경변수 확인..."
if [ -z "$UV_PUBLISH_URL" ]; then
  echo -e "${RED}❌ UV_PUBLISH_URL이 설정되지 않았습니다.${NC}"
  echo ""
  echo "다음 중 하나를 실행하세요:"
  echo ""
  echo "방법 1: 환경변수 설정"
  echo "  export UV_PUBLISH_URL='http://nexus.skplanet.com/repository/team-vas-pypi-releases/'"
  echo "  export UV_PUBLISH_USERNAME='your-username'"
  echo "  export UV_PUBLISH_PASSWORD='your-password'"
  echo ""
  echo "방법 2: ~/.config/uv/uv.toml 파일 생성"
  echo "  [publish]"
  echo "  url = \"http://nexus.skplanet.com/repository/team-vas-pypi-releases/\""
  echo "  username = \"your-username\""
  echo "  password = \"your-password\""
  exit 1
fi

echo -e "${GREEN}✓ UV_PUBLISH_URL: $UV_PUBLISH_URL${NC}"

# 2. 버전 확인
echo ""
echo "2. 버전 확인..."
VERSION=$(grep '^version = ' pyproject.toml | sed 's/version = "\(.*\)"/\1/')
echo -e "${GREEN}✓ 현재 버전: $VERSION${NC}"

# 3. 이전 빌드 정리
echo ""
echo "3. 이전 빌드 정리..."
if [ -d "dist" ]; then
  rm -rf dist/
  echo -e "${GREEN}✓ dist/ 폴더 삭제됨${NC}"
else
  echo -e "${YELLOW}⊳ dist/ 폴더 없음 (Skip)${NC}"
fi

# 4. 빌드
echo ""
echo "4. 패키지 빌드..."
uv build

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 빌드 실패${NC}"
  exit 1
fi

echo -e "${GREEN}✓ 빌드 완료${NC}"
echo ""
ls -lh dist/

# 5. 배포 확인
echo ""
read -p "버전 ${VERSION}을 Nexus에 배포하시겠습니까? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}배포 취소됨${NC}"
  exit 0
fi

# 6. 배포
echo ""
echo "5. Nexus에 배포..."
uv publish

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ 배포 성공!${NC}"
  echo ""
  echo "다음 단계:"
  echo "1. Nexus 웹 UI에서 확인:"
  echo "   ${UV_PUBLISH_URL%/}/../browse/browse:team-vas-pypi-releases"
  echo ""
  echo "2. 설치 테스트:"
  echo "   uvx --index-url http://nexus.skplanet.com/repository/team-vas-pypi-group/simple/ --from voc-automation-mcp-server voc-pii-security"
  echo ""
  echo "3. 팀원들에게 업데이트 공지"
else
  echo ""
  echo -e "${RED}❌ 배포 실패${NC}"
  echo ""
  echo "트러블슈팅:"
  echo "- 401 Unauthorized: 인증 정보 확인"
  echo "- 403 Forbidden: Nexus 관리자에게 배포 권한 요청"
  echo "- Repository not found: URL 확인 (끝에 / 필요)"
  exit 1
fi
