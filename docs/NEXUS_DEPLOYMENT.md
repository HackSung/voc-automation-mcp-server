# Nexus 배포 및 사용 가이드

## 목차
1. [관리자: Nexus 배포](#관리자-nexus-배포)
2. [사용자: MCP 서버 사용](#사용자-mcp-서버-사용)

---

## 관리자: Nexus 배포

### 1. Nexus 레지스트리 인증 설정

```bash
# ~/.npmrc 파일에 추가
registry=https://nexus.skplanet.com/repository/npm-private/
//nexus.skplanet.com/repository/npm-private/:_auth=BASE64_ENCODED_CREDENTIALS
//nexus.skplanet.com/repository/npm-private/:always-auth=true
```

또는 npm login 사용:
```bash
npm config set registry https://nexus.skplanet.com/repository/npm-private/
npm login --registry=https://nexus.skplanet.com/repository/npm-private/
```

### 2. 패키지 빌드 및 배포

```bash
# 프로젝트 디렉토리로 이동
cd /path/to/voc-automation-mcp-server

# 의존성 설치
npm install

# 빌드
npm run build

# 버전 업데이트 (선택)
npm version patch  # 또는 minor, major

# Nexus에 배포
npm publish
```

### 3. 배포 확인

```bash
# Nexus에서 패키지 확인
npm view @sk-planet/voc-automation-mcp-server

# 특정 버전 확인
npm view @sk-planet/voc-automation-mcp-server versions
```

---

## 사용자: MCP 서버 사용

### 1. 환경 설정

#### 1.1 환경변수 파일 생성

프로젝트 루트 또는 홈 디렉토리에 `.env` 파일 생성:

```bash
# Jira 연동 (필수)
JIRA_BASE_URL=https://jira.skplanet.com
JIRA_EMAIL=your-username@sk.com
JIRA_API_TOKEN=your-jira-api-token
JIRA_PROJECT_KEY=VRBT

# 자동 담당자 할당 (선택)
ASSIGNEE_BIZRING=1004359  # V비즈링 담당자 username
# ASSIGNEE_AUTH=username
# ASSIGNEE_BILLING=username
```

#### 1.2 Cursor MCP 설정

**방법 1: 자동 설정 (권장)**

터미널에서 다음 명령어 실행:
```bash
npx -y @sk-planet/voc-automation-mcp-server setup
```

**방법 2: 수동 설정**

Cursor 설정 파일에 다음 내용 추가:
- macOS/Linux: `~/.cursor/mcp.json` 또는 `~/.config/cursor/mcp.json`
- Windows: `%APPDATA%\Cursor\mcp.json`

```json
{
  "mcpServers": {
    "voc-pii-security": {
      "command": "npx",
      "args": ["-y", "@sk-planet/voc-automation-mcp-server", "voc-pii-security"],
      "env": {}
    },
    "voc-analysis": {
      "command": "npx",
      "args": ["-y", "@sk-planet/voc-automation-mcp-server", "voc-analysis"],
      "env": {}
    },
    "voc-jira-integration": {
      "command": "npx",
      "args": ["-y", "@sk-planet/voc-automation-mcp-server", "voc-jira-integration"],
      "env": {}
    }
  }
}
```

### 2. Cursor 재시작

설정 후 Cursor를 완전히 종료하고 재시작합니다.

### 3. 사용 방법

#### VOC 처리 예시

Cursor에서 다음과 같이 요청:

```
VOC 처리해줘:
[비즈센터] V비즈링 가입 실패 확인 요청
이름: 홍길동
회선: 010-1234-5678
...
```

AI가 자동으로:
1. 개인정보 감지 및 익명화
2. VOC 내용 분석 (의도, 우선순위, 카테고리, 감정)
3. Jira 이슈 자동 생성 (담당자 자동 할당)

---

## 업데이트

### 최신 버전으로 업데이트

```bash
# 캐시 클리어 후 최신 버전 사용
npx clear-npx-cache
```

또는 Cursor 재시작 시 자동으로 최신 버전 확인.

### 특정 버전 사용

```json
{
  "mcpServers": {
    "voc-jira-integration": {
      "command": "npx",
      "args": ["-y", "@sk-planet/voc-automation-mcp-server@1.2.3", "voc-jira-integration"]
    }
  }
}
```

---

## 트러블슈팅

### npx 실행 오류

**증상**: `command not found` 또는 권한 오류

**해결**:
```bash
# Node.js 설치 확인
node --version
npm --version

# npm 글로벌 bin 경로 확인
npm config get prefix

# PATH에 추가 (macOS/Linux)
export PATH="$PATH:$(npm config get prefix)/bin"
```

### 환경변수 인식 안됨

**증상**: Jira 연동 실패

**해결**:
1. `.env` 파일이 올바른 위치에 있는지 확인
2. Cursor 완전 재시작
3. 환경변수를 `mcp.json`의 `env` 필드에 직접 추가:

```json
{
  "mcpServers": {
    "voc-jira-integration": {
      "command": "npx",
      "args": ["-y", "@sk-planet/voc-automation-mcp-server", "voc-jira-integration"],
      "env": {
        "JIRA_BASE_URL": "https://jira.skplanet.com",
        "JIRA_EMAIL": "your-username@sk.com",
        "JIRA_API_TOKEN": "your-token",
        "ASSIGNEE_BIZRING": "your-jira-username"
      }
    }
  }
}
```

### Nexus 인증 오류

**증상**: `npm ERR! 401 Unauthorized`

**해결**:
```bash
# Nexus 레지스트리 재설정
npm config set registry https://nexus.skplanet.com/repository/npm-private/
npm login

# 또는 관리자에게 Nexus 접근 권한 요청
```

---

## 지원

문의사항이나 이슈 발생 시:
- 이메일: voc-team@sk.com
- Jira: VRBT 프로젝트에 이슈 등록
- 내부 Slack: #voc-automation 채널
