# 🚀 빠른 배포 가이드

## ✅ 배포 준비 완료!

다음 항목들이 준비되었습니다:
- ✅ Bitbucket Integration 서버 bin 추가
- ✅ 빌드 스크립트 수정 (shared 우선 빌드)
- ✅ 예시 설정 파일 업데이트
- ✅ 모든 서버 빌드 성공

---

## 📦 배포 방법

### 1️⃣ Nexus에 배포 (권장)

```bash
# 1. Nexus 인증 (처음 한 번만)
npm login --registry=https://nexus.skplanet.com/repository/npm-private/

# 2. 배포 (버전 자동 증가)
npm version patch  # 1.0.0 → 1.0.1
npm publish

# 3. 배포 확인
npm view @sk-planet/voc-automation-mcp-server
```

### 2️⃣ 로컬 테스트 (배포 전)

```bash
# 로컬에 링크
npm link

# 명령어 테스트
voc-bitbucket-integration --help
voc-jira-integration --help
voc-pii-security --help

# 링크 해제
npm unlink
```

---

## 🔧 다른 프로젝트에서 사용하기

### 방법 A: `~/.cursor/mcp.json` 설정 (전역)

모든 프로젝트에서 공통으로 사용:

```json
{
  "mcpServers": {
    "pii-security": {
      "command": "npx",
      "args": ["-y", "@sk-planet/voc-automation-mcp-server", "voc-pii-security"],
      "env": {}
    },
    "voc-analysis": {
      "command": "npx",
      "args": ["-y", "@sk-planet/voc-automation-mcp-server", "voc-analysis"],
      "env": {}
    },
    "jira-integration": {
      "command": "npx",
      "args": ["-y", "@sk-planet/voc-automation-mcp-server", "voc-jira-integration"],
      "env": {}
    },
    "bitbucket-integration": {
      "command": "npx",
      "args": ["-y", "@sk-planet/voc-automation-mcp-server", "voc-bitbucket-integration"],
      "env": {}
    }
  }
}
```

**장점**:
- ✅ 모든 프로젝트에서 자동 적용
- ✅ 환경변수는 각 프로젝트의 `.env`에서 자동 로드
- ✅ 버전 업데이트 자동 적용 (`-y` 플래그)

---

### 방법 B: 로컬 경로 사용 (개발 중)

현재 프로젝트 경로 그대로 사용:

```json
{
  "mcpServers": {
    "bitbucket-integration": {
      "command": "node",
      "args": [
        "/Users/1004359/voc-automation-mcp-server/servers/bitbucket-integration-server/dist/index.js"
      ],
      "env": {}
    }
  }
}
```

**장점**:
- ✅ 코드 수정 즉시 반영 (재빌드 필요)
- ✅ 디버깅 용이

---

## 🔄 업데이트 방법

배포 후 코드를 수정하고 다시 배포:

```bash
# 1. 코드 수정
# 2. 빌드
npm run build

# 3. 버전 증가 (변경 내용에 따라)
npm version patch    # 1.0.1 → 1.0.2 (버그픽스)
npm version minor    # 1.0.2 → 1.1.0 (새 기능)
npm version major    # 1.1.0 → 2.0.0 (Breaking changes)

# 4. 재배포
npm publish
```

---

## 📋 환경 변수 설정

각 프로젝트의 `.env` 파일에 다음을 추가:

```bash
# Jira
JIRA_BASE_URL=https://jira.skplanet.com
JIRA_EMAIL=your-email@sk.com
JIRA_API_TOKEN=your-jira-token
JIRA_PROJECT_KEY=VRBT

# Bitbucket
BITBUCKET_BASE_URL=http://code.skplanet.com
BITBUCKET_TOKEN=your-bitbucket-token
BITBUCKET_USERNAME=your-username

# OpenAI (선택)
OPENAI_API_KEY=your-openai-key

# MS Teams (선택)
TEAMS_WEBHOOK_URL=your-teams-webhook
```

---

## ✨ 사용 예시

### Bitbucket MCP로 코드 검색

```javascript
// Cursor에서 사용
CallMcpTool({
  server: "user-bitbucket-integration",
  toolName: "searchCode",
  arguments: {
    projectKey: "VRBT",
    repoSlug: "vrbt-backend",
    query: "RMCB"
  }
})
```

### Jira 이슈 생성

```javascript
CallMcpTool({
  server: "user-jira-integration",
  toolName: "createJiraIssue",
  arguments: {
    summary: "버그 수정 필요",
    description: "상세 내용...",
    issueType: "Bug"
  }
})
```

---

## 🆘 문제 해결

### npm 캐시 권한 에러

```bash
sudo chown -R $(whoami) ~/.npm
```

### Nexus 인증 실패

```bash
# 재인증
npm logout
npm login --registry=https://nexus.skplanet.com/repository/npm-private/
```

### 빌드 에러

```bash
# 클린 빌드
npm run clean
npm install --workspaces
npm run build
```

---

## 📞 문의

- **담당자**: 이학성 (cannan@sk.com)
- **Slack**: #voc-automation
- **문서**: `/docs` 폴더 참고
