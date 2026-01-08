# Nexus 배포 및 사용 빠른 가이드

## 🎯 목표
사용자가 `mcp.json`에 몇 줄만 추가하면 VOC MCP 서버를 사용할 수 있도록 Nexus에 배포

---

## 관리자: 배포 방법

### 1회만: Nexus 인증 설정
```bash
npm config set registry https://nexus.skplanet.com/repository/npm-private/
npm login
```

### 배포 (버전 업데이트마다)
```bash
cd /Users/1004359/voc-automation-mcp-server
npm run build
npm version patch  # 또는 minor, major
npm publish
```

✅ 배포 완료!

---

## 사용자: 사용 방법

### 단 1개 파일만 수정하면 끝!

**파일 위치**: 
- macOS/Linux: `~/.cursor/mcp.json` 또는 `~/.config/cursor/mcp.json`
- Windows: `%APPDATA%\Cursor\mcp.json`

**내용 추가**:
```json
{
  "mcpServers": {
    "voc-pii-security": {
      "command": "npx",
      "args": ["-y", "-p", "@sk-planet/voc-automation-mcp-server", "voc-pii-security"]
    },
    "voc-analysis": {
      "command": "npx",
      "args": ["-y", "-p", "@sk-planet/voc-automation-mcp-server", "voc-analysis"]
    },
    "voc-jira-integration": {
      "command": "npx",
      "args": ["-y", "-p", "@sk-planet/voc-automation-mcp-server", "voc-jira-integration"],
      "env": {
        "JIRA_BASE_URL": "https://jira.skplanet.com",
        "JIRA_EMAIL": "your-username@sk.com",
        "JIRA_API_TOKEN": "your-jira-api-token",
        "JIRA_PROJECT_KEY": "VRBT",
        "ASSIGNEE_BIZRING": "1004359"
      }
    }
  }
}
```

**Cursor 재시작** → 끝!

---

## 💡 주요 포인트

### args 필드 설명
```json
"args": ["-y", "-p", "@sk-planet/voc-automation-mcp-server", "voc-jira-integration"]
```

- `-y`: 자동으로 yes (프롬프트 없이 설치)
- `-p`: 패키지 지정
- `@sk-planet/voc-automation-mcp-server`: Nexus의 패키지 이름
- `voc-jira-integration`: 실행할 bin 명령어 (package.json의 bin 필드)

### 별도 설치 불필요!
- ❌ `npm install` 필요 없음
- ❌ Git clone 필요 없음
- ✅ `npx`가 Nexus에서 자동으로 다운로드 & 실행

### 자동 업데이트
- Cursor 재시작 시 자동으로 최신 버전 확인
- 수동 업데이트: `npx clear-npx-cache` 실행 후 Cursor 재시작

---

## 🔧 package.json 핵심 설정

```json
{
  "name": "@sk-planet/voc-automation-mcp-server",
  "version": "1.0.0",
  "bin": {
    "voc-pii-security": "./servers/pii-security-server/dist/index.js",
    "voc-analysis": "./servers/voc-analysis-server/dist/index.js",
    "voc-jira-integration": "./servers/jira-integration-server/dist/index.js",
    "voc-internal-api": "./servers/internal-api-server/dist/index.js"
  },
  "publishConfig": {
    "registry": "https://nexus.skplanet.com/repository/npm-private/",
    "access": "restricted"
  },
  "files": [
    "servers/*/dist/**/*",
    "servers/*/package.json",
    "shared/dist/**/*",
    "shared/package.json"
  ]
}
```

---

## 📋 체크리스트

### 배포 전
- [x] package.json의 `name`을 `@sk-planet/voc-automation-mcp-server`로 변경
- [x] `bin` 필드에 4개 서버 추가
- [x] `publishConfig.registry`를 Nexus URL로 설정
- [x] 모든 서버의 index.ts에 shebang (`#!/usr/bin/env node`) 포함
- [x] 빌드 후 dist/index.js에 shebang 포함 확인

### 배포 후
- [ ] `npm view @sk-planet/voc-automation-mcp-server`로 확인
- [ ] 다른 개발자가 mcp.json 설정 후 정상 작동하는지 테스트
- [ ] Slack/이메일로 사용 가이드 공유

---

## 🚀 다음 단계

1. **지금 바로 배포**:
   ```bash
   cd /Users/1004359/voc-automation-mcp-server
   npm run build
   npm publish
   ```

2. **팀원들에게 공유**:
   - 이 파일 링크: `NEXUS_QUICK_GUIDE.md`
   - 또는 예시 파일: `examples/mcp-config-example.json`

3. **상세 문서**:
   - 전체 가이드: [`docs/NEXUS_DEPLOYMENT.md`](docs/NEXUS_DEPLOYMENT.md)
   - 배포 체크리스트: [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md)

---

## ❓ FAQ

**Q: Nexus 인증이 안돼요**
```bash
npm logout
npm login --registry=https://nexus.skplanet.com/repository/npm-private/
```

**Q: 사용자가 "permission denied" 에러를 받아요**
- 빌드된 파일에 shebang이 있는지 확인: `head -n 1 servers/*/dist/index.js`
- npm이 자동으로 실행 권한을 부여하므로 추가 설정 불필요

**Q: 특정 버전만 사용하고 싶어요**
```json
"args": ["-y", "-p", "@sk-planet/voc-automation-mcp-server@1.2.3", "voc-jira-integration"]
```

**Q: Nexus URL이 틀린 것 같아요**
- IT 팀에 확인: 실제 Nexus npm registry URL
- 또는 기존 사용 중인 private package의 registry 확인

---

## 📞 지원

- **이메일**: cannan@sk.com
- **Slack**: #voc-automation
- **Jira**: VRBT 프로젝트
