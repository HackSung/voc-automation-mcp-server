# 배포 체크리스트

## 배포 전 확인사항

### 1. 패키지 정보 확인
- [ ] `package.json`의 `name`이 `@sk-planet/voc-automation-mcp-server`인지 확인
- [ ] `version` 번호가 올바른지 확인 (Semantic Versioning)
- [ ] `publishConfig.registry`가 올바른 Nexus URL인지 확인

### 2. 빌드 확인
```bash
npm run build
```
- [ ] 빌드 에러 없음
- [ ] `servers/*/dist/` 디렉토리에 `.js` 파일 생성됨
- [ ] 모든 dist/index.js 파일에 shebang(`#!/usr/bin/env node`) 포함 확인

### 3. 로컬 테스트
```bash
# 로컬에서 bin 명령어 테스트
npm link
voc-pii-security --help  # 에러 없이 실행되어야 함
npm unlink
```

### 4. 환경변수 확인
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] `.env.example` 파일이 최신 상태인지 확인
- [ ] 민감한 정보가 커밋되지 않았는지 확인

## 배포 단계

### 1. Nexus 인증 설정
```bash
# 방법 1: npm login
npm config set registry https://nexus.skplanet.com/repository/npm-private/
npm login

# 방법 2: .npmrc에 직접 추가
# ~/.npmrc에 다음 추가:
# //nexus.skplanet.com/repository/npm-private/:_authToken=YOUR_TOKEN
```

### 2. 버전 업데이트 (선택)
```bash
# Patch 버전 업데이트 (1.0.0 → 1.0.1)
npm version patch

# Minor 버전 업데이트 (1.0.0 → 1.1.0)
npm version minor

# Major 버전 업데이트 (1.0.0 → 2.0.0)
npm version major
```

### 3. 배포 실행
```bash
# Dry run (실제 배포 없이 테스트)
npm publish --dry-run

# 실제 배포
npm publish
```

### 4. 배포 확인
```bash
# Nexus에서 패키지 조회
npm view @sk-planet/voc-automation-mcp-server

# 특정 버전 확인
npm view @sk-planet/voc-automation-mcp-server@1.0.0

# 모든 버전 목록
npm view @sk-planet/voc-automation-mcp-server versions
```

## 배포 후 확인

### 1. 사용자 테스트
다른 개발자에게 다음 설정으로 테스트 요청:

```json
{
  "mcpServers": {
    "voc-jira-integration": {
      "command": "npx",
      "args": ["-y", "-p", "@sk-planet/voc-automation-mcp-server", "voc-jira-integration"],
      "env": {
        "JIRA_BASE_URL": "https://jira.skplanet.com",
        "JIRA_EMAIL": "test@sk.com",
        "JIRA_API_TOKEN": "test-token",
        "JIRA_PROJECT_KEY": "VRBT"
      }
    }
  }
}
```

### 2. 문서 업데이트
- [ ] `CHANGELOG.md` 업데이트
- [ ] Confluence 또는 내부 Wiki 업데이트
- [ ] Slack 채널에 배포 공지

### 3. 모니터링
- [ ] 에러 로그 확인
- [ ] Jira 이슈 생성 정상 작동 확인
- [ ] 사용자 피드백 수집

## 롤백 절차

문제 발생 시:

### 1. 이전 버전으로 롤백
```bash
# 특정 버전 unpublish (24시간 이내만 가능)
npm unpublish @sk-planet/voc-automation-mcp-server@1.0.1

# 또는 deprecate 처리
npm deprecate @sk-planet/voc-automation-mcp-server@1.0.1 "버그로 인해 사용 중단. 1.0.0 사용 권장"
```

### 2. 사용자 공지
- Slack 채널에 문제 공지
- 이전 버전 사용 권장

## 배포 명령어 요약

```bash
# 전체 프로세스 (한 번에)
npm run build && \
npm version patch && \
npm publish && \
npm view @sk-planet/voc-automation-mcp-server
```

## 트러블슈팅

### 401 Unauthorized
```bash
# 인증 정보 재설정
npm logout
npm login --registry=https://nexus.skplanet.com/repository/npm-private/
```

### 403 Forbidden
- Nexus 관리자에게 publish 권한 요청
- 조직 scope (@sk-planet) 사용 권한 확인

### 파일 누락
- `package.json`의 `files` 필드 확인
- `.npmignore` 파일 확인 (있다면 삭제 권장, `files` 사용)

### bin 명령어 실행 안됨
```bash
# 빌드된 파일에 shebang 확인
head -n 1 servers/*/dist/index.js

# 실행 권한 확인 (npm이 자동으로 처리하지만 확인)
ls -la servers/*/dist/index.js
```

## 연락처

- **담당자**: VOC Automation Team (your-email@your-company.com)
- **Slack**: #voc-automation
- **Jira**: VRBT 프로젝트
