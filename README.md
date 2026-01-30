# VOC 처리 자동화 MCP 서버

[![Python 3.13+](https://img.shields.io/badge/python-3.13+-blue?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastMCP 2.14+](https://img.shields.io/badge/FastMCP-2.14+-green?style=flat-square)](https://gofastmcp.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Nexus](https://img.shields.io/badge/Nexus-PyPI-orange?style=flat-square)](http://nexus.skplanet.com/)

고객 VOC(Voice of Customer)를 접수부터 Jira 티켓 생성, 알림 발송까지 자동으로 처리하는 MCP(Model Context Protocol) 기반 엔터프라이즈 시스템입니다.

> **v2.0.0** - Python/FastMCP 버전 (TypeScript에서 마이그레이션)

---

## 🚀 빠른 시작

### 팀원용 (Nexus에서 설치)

**1. `~/.cursor/mcp.json` 설정:**

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
      ]
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
        "JIRA_EMAIL": "your-email@sk.com",
        "JIRA_API_TOKEN": "your-jira-token",
        "JIRA_PROJECT_KEY": "VRBT"
      }
    }
  }
}
```

**2. Cursor 재시작 후 테스트:**

```
다음 VOC를 처리해줘: "로그인이 안돼요. 이메일은 test@example.com 입니다."
```

> 💡 전체 설정 예시: [examples/mcp-config-nexus.json](examples/mcp-config-nexus.json)

---

## ✨ 주요 기능

### 🔒 개인정보 보호 (PII Security)

- 이메일, 전화번호, 생년월일, 주민번호, 카드번호 **자동 감지**
- LLM 전송 전 **실시간 비식별화** (`test@example.com` → `[EMAIL_001]`)
- 안전한 저장소에만 원본 복원 (Jira 비공개 코멘트)
- 1시간 후 **자동 삭제** (메모리 누수 방지)

### 🧠 지능형 분석 (VOC Analysis)

- Cursor LLM으로 VOC 의도 분류 (버그/기능요청/문의/불만/피드백)
- 우선순위 자동 판단 (Critical → Low)
- 카테고리 자동 추출 (인증/결제/성능/UI 등)
- 감정 분석 (긍정/중립/부정)
- **별도 LLM API 키 불필요** - Cursor의 LLM 사용

### 🎫 자동 티켓팅 (Jira Integration)

- Jira 이슈 자동 생성 (Wiki 마크업 지원)
- 카테고리 기반 **담당자 자동 할당**
- 분석 결과 자동 코멘트 추가
- MS Teams Adaptive Card 알림

### 💻 코드 분석 (Bitbucket Integration)

- 저장소 파일 내용 조회
- 코드 검색 및 디렉토리 탐색
- PR 목록 및 상세 정보

### 🔧 에러 컨텍스트 (Internal API)

- 8가지 표준 에러 코드 해석 (AUTH_001, BILL_001 등)
- 원인 및 해결 방안 자동 제공
- 사용자 에러 로그 조회

---

## 📦 시스템 구성

5개의 독립적인 MCP 서버로 구성됩니다:

| 서버                      | 역할                 | 주요 Tool                                                |
| ------------------------- | -------------------- | -------------------------------------------------------- |
| **PII Security**          | 개인정보 보호        | `detectAndAnonymizePII`, `restoreOriginalText`           |
| **VOC Analysis**          | 프롬프트 생성 & 파싱 | `generateVOCAnalysisPrompt`, `parseVOCAnalysis`          |
| **Jira Integration**      | 티켓 자동화          | `createJiraIssue`, `addComment`, `sendTeamsNotification` |
| **Bitbucket Integration** | 저장소 분석          | `getFileContent`, `searchCode`, `listPullRequests`       |
| **Internal API**          | 레거시 연동          | `queryUserStatus`, `getErrorContext`                     |

---

## 🛠 설치 방법

### 방법 1: Nexus에서 설치 (팀원 권장)

별도 설치 없이 `uvx`로 바로 실행:

```bash
# uv 설치 (최초 1회)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 테스트 실행
uvx --index-url http://nexus.skplanet.com/repository/team-vas-pypi-group/simple/ \
    --from voc-automation-mcp-server \
    voc-pii-security --help
```

### 방법 2: 로컬 개발 환경

```bash
# 저장소 클론
git clone https://github.com/HackSung/voc-automation-mcp-server.git
cd voc-automation-mcp-server

# 의존성 설치
uv sync

# 실행 테스트
uv run voc-pii-security
```

---

## ⚙️ Cursor 설정

### Nexus 사용자용 (`uvx`)

`~/.cursor/mcp.json`:

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
      ]
    },
    "voc-analysis": {
      "command": "uvx",
      "args": [
        "--index-url",
        "http://nexus.skplanet.com/repository/team-vas-pypi-group/simple/",
        "--from",
        "voc-automation-mcp-server",
        "voc-analysis"
      ]
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
        "JIRA_EMAIL": "your-email@sk.com",
        "JIRA_API_TOKEN": "your-jira-token",
        "JIRA_PROJECT_KEY": "VRBT",
        "ASSIGNEE_DEFAULT": "default-username"
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
        "BITBUCKET_TOKEN": "your-bitbucket-token"
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
        "INTERNAL_API_BASE_URL": "https://api.your-company.com",
        "INTERNAL_API_KEY": "your-api-key"
      }
    }
  }
}
```

### 로컬 개발자용 (`uv run`)

```json
{
  "mcpServers": {
    "pii-security": {
      "command": "uv",
      "args": [
        "run",
        "--directory",
        "/path/to/voc-automation-mcp-server",
        "voc-pii-security"
      ]
    }
  }
}
```

---

## 🔐 환경변수

### Jira (필수)

| 환경변수           | 설명          | 예시                        |
| ------------------ | ------------- | --------------------------- |
| `JIRA_BASE_URL`    | Jira 서버 URL | `https://jira.skplanet.com` |
| `JIRA_EMAIL`       | 로그인 이메일 | `user@sk.com`               |
| `JIRA_API_TOKEN`   | API 토큰      | `your-token`                |
| `JIRA_PROJECT_KEY` | 프로젝트 키   | `VRBT`                      |

### 담당자 자동 할당 (선택)

| 환경변수                | 설명             |
| ----------------------- | ---------------- |
| `ASSIGNEE_DEFAULT`      | 기본 담당자      |
| `ASSIGNEE_AUTH`         | 인증 관련 담당자 |
| `ASSIGNEE_BILLING`      | 결제 관련 담당자 |
| `ASSIGNEE_SUBSCRIPTION` | 구독 관련 담당자 |
| `ASSIGNEE_PERF`         | 성능 관련 담당자 |
| `ASSIGNEE_UI`           | UI 관련 담당자   |

### Bitbucket (선택)

| 환경변수             | 설명                  |
| -------------------- | --------------------- |
| `BITBUCKET_BASE_URL` | Bitbucket 서버 URL    |
| `BITBUCKET_TOKEN`    | Personal Access Token |

### MS Teams (선택)

| 환경변수            | 설명                 |
| ------------------- | -------------------- |
| `TEAMS_WEBHOOK_URL` | Incoming Webhook URL |

---

## 📁 프로젝트 구조

```
voc-automation-mcp-server/
├── src/
│   ├── shared/               # 공통 유틸리티
│   │   ├── config.py        # pydantic-settings 설정
│   │   ├── logger.py        # 민감정보 마스킹 로거
│   │   └── retry.py         # tenacity 재시도
│   ├── pii_security/        # PII Security Server
│   ├── voc_analysis/        # VOC Analysis Server
│   ├── jira_integration/    # Jira Integration Server
│   ├── bitbucket_integration/ # Bitbucket Server
│   └── internal_api/        # Internal API Server
├── docs/                    # 문서
├── examples/                # 설정 예시
├── scripts/                 # 유틸리티 스크립트
├── pyproject.toml          # Python 패키지 설정
└── README.md
```

---

## 📖 사용 예시

### 기본 VOC 처리 워크플로우

Cursor 채팅창에서:

```
다음 VOC를 처리해줘:

"로그인이 안돼요. 이메일은 hong.gildong@example.com이고
전화번호는 010-1234-5678입니다. AUTH_001 에러가 계속 나와요."

처리 순서:
1. 개인정보 비식별화 (세션: voc-20260129-001)
2. VOC 분석 프롬프트 생성
3. 생성된 프롬프트로 LLM 분석
4. 분석 결과 파싱
5. AUTH_001 에러 컨텍스트 조회
6. Jira 티켓 생성
7. 원본 복원 후 비공개 코멘트 추가
8. Teams 알림 전송
9. 세션 정리
```

---

## 👨‍💻 배포 (관리자용)

### Nexus PyPI 배포

```bash
# 1. 환경변수 설정 (fish shell)
set -x UV_PUBLISH_URL "http://nexus.skplanet.com/repository/team-vas-pypi-releases/"
set -x UV_PUBLISH_USERNAME "pfdev2"
set -x UV_PUBLISH_PASSWORD "your-password"

# 2. 빌드 & 배포
uv build
uv publish

# 또는 스크립트 사용
./scripts/deploy-to-nexus.sh
```

### Nexus Repository 구성

| Repository               | Type   | 용도                 |
| ------------------------ | ------ | -------------------- |
| `team-vas-pypi-releases` | hosted | 패키지 업로드        |
| `proxy-pypi-repo`        | proxy  | PyPI.org 프록시      |
| `team-vas-pypi-group`    | group  | 통합 접근 (사용자용) |

---

## 🔒 보안

- ✅ 개인정보는 절대 로그에 기록되지 않음
- ✅ 메모리에만 임시 저장 (1시간 후 자동 삭제)
- ✅ API 키는 환경변수로 안전하게 관리
- ✅ LLM에 민감 정보 전송 차단
- ✅ 모든 외부 API 통신은 암호화

---

## 📚 문서

| 문서                                          | 내용                           |
| --------------------------------------------- | ------------------------------ |
| [빠른 시작](docs/QUICKSTART.md)               | 5분 설치 가이드                |
| [개인정보 보호](docs/PII_PROTECTION_GUIDE.md) | 자동 비식별화 설정 **(필독!)** |
| [사용자 가이드](docs/USER_GUIDE.md)           | 실전 사용법, 예제, 트러블슈팅  |
| [API 명세서](docs/API.md)                     | 모든 Tool의 입력/출력 스키마   |
| [배포 가이드](docs/DEPLOYMENT.md)             | 설치, 설정, 운영 가이드        |
| [Nexus 배포](docs/NEXUS_DEPLOYMENT.md)        | Nexus PyPI 배포 상세           |
| [Nexus 빠른 가이드](NEXUS_QUICK_GUIDE.md)     | Nexus 배포 요약                |

---

## 🤝 기여하기

- **버그 리포트**: [GitHub Issues](https://github.com/HackSung/voc-automation-mcp-server/issues)
- **Pull Request**: [기여 가이드](CONTRIBUTING.md) 참고

---

## 📄 라이선스

MIT License - 사내 사용 목적으로 자유롭게 사용 가능합니다.

---

**Version**: 2.0.0 (Python/FastMCP)  
**Python**: 3.13+  
**Last Updated**: 2026-01-29  
**Maintained by**: VOC Automation Team
