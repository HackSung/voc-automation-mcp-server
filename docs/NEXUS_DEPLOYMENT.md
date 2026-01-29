# Nexus 배포 및 사용 가이드 (Python 버전)

## 목차

1. [관리자: Nexus 배포](#관리자-nexus-배포)
2. [사용자: MCP 서버 사용](#사용자-mcp-서버-사용)

---

## 관리자: Nexus 배포

### 사전 요구사항

- Python 3.13+
- uv (권장) 또는 pip + twine
- Nexus PyPI 레포지토리 접근 권한

### 1. Nexus PyPI 인증 설정

#### 방법 1: uv 사용 (권장)

```bash
# ~/.config/uv/uv.toml 또는 프로젝트 루트의 uv.toml
[publish]
url = "http://nexus.skplanet.com/repository/team-vas-pypi-releases/"
username = "your-nexus-username"
password = "your-nexus-password"
```

또는 환경변수로 설정:

```bash
export UV_PUBLISH_URL="http://nexus.skplanet.com/repository/team-vas-pypi-releases/"
export UV_PUBLISH_USERNAME="your-nexus-username"
export UV_PUBLISH_PASSWORD="your-nexus-password"
```

#### 방법 2: pip + twine 사용

```bash
# ~/.pypirc 파일 생성
[distutils]
index-servers =
    nexus

[nexus]
repository = http://nexus.skplanet.com/repository/team-vas-pypi-releases/
username = your-nexus-username
password = your-nexus-password
```

### 2. 패키지 빌드 및 배포

```bash
# 프로젝트 디렉토리로 이동
cd /path/to/voc-automation-mcp-server

# 의존성 설치 (처음 한 번)
uv sync

# 버전 업데이트 (pyproject.toml에서)
# version = "2.0.1"

# 패키지 빌드
uv build

# Nexus에 배포
uv publish

# 또는 twine 사용
# pip install twine
# twine upload -r nexus dist/*
```

### 3. 배포 확인

```bash
# Nexus에서 패키지 확인
pip index versions voc-automation-mcp-server --index-url http://nexus.skplanet.com/repository/team-vas-pypi-group/simple/

# 또는 웹 UI에서 확인
# http://nexus.skplanet.com/#browse/browse:team-vas-pypi-releases
```

---

## 사용자: MCP 서버 사용

### 1. 사전 요구사항

- Python 3.13+
- uv 설치

```bash
# uv 설치 (없는 경우)
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Cursor MCP 설정

`~/.cursor/mcp.json` 파일 생성/수정:

```json
{
  "mcpServers": {
    "pii-security": {
      "command": "uvx",
      "args": [
        "--index-url",
        "http://nexus.skplanet.com/repository/team-vas-pypi-group/simple/",
        "--from",
        "voc-automation-mcp-server",
        "voc-pii-security"
      ],
      "env": {}
    },
    "voc-analysis": {
      "command": "uvx",
      "args": [
        "--index-url",
        "http://nexus.skplanet.com/repository/team-vas-pypi-group/simple/",
        "--from",
        "voc-automation-mcp-server",
        "voc-analysis"
      ],
      "env": {}
    },
    "jira-integration": {
      "command": "uvx",
      "args": [
        "--index-url",
        "http://nexus.skplanet.com/repository/team-vas-pypi-group/simple/",
        "--from",
        "voc-automation-mcp-server",
        "voc-jira-integration"
      ],
      "env": {
        "JIRA_BASE_URL": "https://jira.skplanet.com",
        "JIRA_EMAIL": "your-username@sk.com",
        "JIRA_API_TOKEN": "your-jira-api-token",
        "JIRA_PROJECT_KEY": "VRBT",
        "ASSIGNEE_DEFAULT": "your-jira-username",
        "ASSIGNEE_BIZRING": "your-jira-username"
      }
    },
    "bitbucket-integration": {
      "command": "uvx",
      "args": [
        "--index-url",
        "http://nexus.skplanet.com/repository/team-vas-pypi-group/simple/",
        "--from",
        "voc-automation-mcp-server",
        "voc-bitbucket-integration"
      ],
      "env": {
        "BITBUCKET_BASE_URL": "http://code.skplanet.com",
        "BITBUCKET_TOKEN": "your-bitbucket-token",
        "BITBUCKET_PROJECT_KEY": "VRBT"
      }
    },
    "internal-api": {
      "command": "uvx",
      "args": [
        "--index-url",
        "http://nexus.skplanet.com/repository/team-vas-pypi-group/simple/",
        "--from",
        "voc-automation-mcp-server",
        "voc-internal-api"
      ],
      "env": {
        "INTERNAL_API_BASE_URL": "your-api-url",
        "INTERNAL_API_KEY": "your-api-key"
      }
    }
  }
}
```

### 3. Cursor 재시작

설정 후 Cursor를 완전히 종료하고 재시작합니다.

### 4. 사용 방법

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
# uvx 캐시 클리어
uv cache clean

# Cursor 재시작하면 자동으로 최신 버전 다운로드
```

### 특정 버전 사용

```json
{
  "mcpServers": {
    "jira-integration": {
      "command": "uvx",
      "args": [
        "--index-url",
        "http://nexus.skplanet.com/repository/team-vas-pypi-group/simple/",
        "--from",
        "voc-automation-mcp-server==2.0.1",
        "voc-jira-integration"
      ]
    }
  }
}
```

---

## npx vs uvx 비교

| 항목        | npm (TypeScript)      | uv (Python)            |
| ----------- | --------------------- | ---------------------- |
| 실행 명령어 | `npx`                 | `uvx`                  |
| 레포지토리  | npm-private           | pypi-private           |
| 설정 파일   | `~/.npmrc`            | `~/.config/uv/uv.toml` |
| 캐시 정리   | `npx clear-npx-cache` | `uv cache clean`       |

---

## 트러블슈팅

### uvx 실행 오류

**증상**: `command not found`

**해결**:

```bash
# uv 설치 확인
uv --version

# PATH 확인 (uv 설치 시 안내된 경로)
echo $PATH
export PATH="$HOME/.local/bin:$PATH"
```

### Nexus 인증 오류

**증상**: `401 Unauthorized` 또는 `403 Forbidden`

**해결**:

```bash
# Nexus PyPI 레포지토리 URL 확인
# IT 팀에 team-vas-pypi-group 레포지토리 접근 권한 요청

# 또는 인증 정보 확인
curl -u "username:password" http://nexus.skplanet.com/repository/team-vas-pypi-group/simple/
```

### Python 버전 오류

**증상**: `requires Python >=3.13`

**해결**:

```bash
# Python 3.13 설치
uv python install 3.13

# 기본 Python 버전 확인
uv python list
```

---

## 지원

문의사항이나 이슈 발생 시:

- 이메일: cannan@sk.com
- Jira: VRBT 프로젝트에 이슈 등록
- 내부 Slack: #voc-automation 채널
