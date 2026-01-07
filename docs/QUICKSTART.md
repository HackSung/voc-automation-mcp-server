# 빠른 시작 가이드

5분 안에 VOC 자동화 시스템을 설치하고 첫 VOC를 처리하는 방법입니다.

## 📦 설치 (3분)

### 방법 1: 사내 Nexus에서 설치 (권장)

```bash
# 1. 프로젝트 폴더 생성
mkdir my-voc-automation && cd my-voc-automation

# 2. Nexus에서 패키지 다운로드
npm install @your-company/voc-automation-mcp-server

# 3. 설정 파일 복사
cp node_modules/@your-company/voc-automation-mcp-server/.env.example .env
```

### 방법 2: Git에서 직접 설치

```bash
# 1. 저장소 클론
git clone https://github.com/your-company/voc-automation-mcp-server.git
cd voc-automation-mcp-server

# 2. 의존성 설치 및 빌드
npm install
npm run build
```

## ⚙️ 환경변수 설정 (1분)

`.env` 파일을 열어 다음 값만 입력하세요:

```bash
# Jira (필수)
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-token

# LLM (필수 - 둘 중 하나)
OPENAI_API_KEY=sk-...
```

> 💡 API 키가 없으면 IT 팀에 문의하세요.

## 🔧 Cursor 설정 (1분)

### 자동 설정 (향후 지원)

```bash
npm run setup:cursor
```

### 수동 설정

1. 패키지 설치 경로 확인:
   ```bash
   pwd  # 현재 경로 복사
   ```

2. `~/.cursor/mcp.json` 파일 생성/수정:
   ```json
   {
     "mcpServers": {
       "pii-security": {
         "command": "node",
         "args": ["<복사한경로>/servers/pii-security-server/dist/index.js"]
       },
       "voc-analysis": {
         "command": "node",
         "args": ["<복사한경로>/servers/voc-analysis-server/dist/index.js"]
       },
       "jira-integration": {
         "command": "node",
         "args": ["<복사한경로>/servers/jira-integration-server/dist/index.js"]
       },
       "internal-api": {
         "command": "node",
         "args": ["<복사한경로>/servers/internal-api-server/dist/index.js"]
       }
     }
   }
   ```

3. Cursor 재시작

## ✅ 설치 확인 (30초)

Cursor 채팅창에서:

```
사용 가능한 MCP 도구를 모두 보여줘
```

**예상 결과**: 16개 이상의 도구 표시 ✅

## 🎯 첫 VOC 처리 (1분)

Cursor 채팅창에 다음을 입력:

```
다음 VOC를 처리해줘:

"로그인이 안돼요. 제 이메일은 test@example.com입니다."

처리 단계:
1. 개인정보 비식별화 (세션: test-001)
2. VOC 분석
3. Jira 티켓 생성 (프로젝트: VOC)
4. 세션 정리
```

**성공 시**: Jira 티켓 번호와 URL이 표시됩니다! 🎉

## 🚨 문제 해결

### "Unknown tool" 에러
→ Cursor를 완전히 재시작하세요

### Jira 에러
→ `.env` 파일의 Jira 설정 확인

### LLM 에러
→ API 키가 유효한지 확인

## 📚 다음 단계

✅ 설치 완료했다면:

1. **[사용자 가이드](USER_GUIDE.md)** - 고급 기능 학습
2. **[예제 프롬프트](../examples/cursor-prompts.md)** - 다양한 시나리오
3. **[API 문서](API.md)** - 모든 도구 상세 설명

## 💬 지원

- Slack: #voc-automation
- 이메일: it-support@your-company.com
- 문서: [전체 가이드](USER_GUIDE.md)

---

**소요 시간**: 약 5분  
**어려움**: ⭐ (매우 쉬움)  
**도움**: 언제든지 문의하세요!

