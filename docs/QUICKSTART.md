# 빠른 시작 가이드

5분 안에 VOC 자동화 시스템을 설치하고 첫 VOC를 처리하는 방법입니다.

## 📦 설치 (3분)

### 사전 요구사항

- **Python 3.13+**
- **uv** (권장) 또는 pip

```bash
# uv 설치 (없는 경우)
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 방법 1: Git에서 설치 (권장)

```bash
# 1. 저장소 클론
git clone https://github.com/HackSung/voc-automation-mcp-server.git
cd voc-automation-mcp-server

# 2. Python 3.13 설치 및 의존성 설치
uv python install 3.13
uv sync
```

### 방법 2: pip로 설치

```bash
# 1. 저장소 클론
git clone https://github.com/HackSung/voc-automation-mcp-server.git
cd voc-automation-mcp-server

# 2. 가상환경 생성 및 활성화
python3.13 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 3. 패키지 설치
pip install -e .
```

## ⚙️ 환경변수 설정 (1분)

이 프로젝트는 **런타임에 env 파일을 로드하지 않습니다.**
필수 환경변수는 `~/.cursor/mcp.json`의 `mcpServers.<server>`의 `env`에 입력하세요.

```bash
# Jira (필수)
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-token

# OpenAI (선택 - 유사 이슈 검색용)
OPENAI_API_KEY=sk-...
```

> 💡 API 키가 없으면 IT 팀에 문의하세요.

## 🔧 Cursor 설정 (1분)

### 1단계: MCP 서버 등록

`~/.cursor/mcp.json` 파일 생성/수정:

```json
{
  "mcpServers": {
    "pii-security": {
      "command": "uv",
      "args": ["run", "--directory", "<설치경로>", "voc-pii-security"],
      "env": {}
    },
    "voc-analysis": {
      "command": "uv",
      "args": ["run", "--directory", "<설치경로>", "voc-analysis"],
      "env": {}
    },
    "jira-integration": {
      "command": "uv",
      "args": ["run", "--directory", "<설치경로>", "voc-jira-integration"],
      "env": {
        "JIRA_BASE_URL": "https://jira.your-company.com",
        "JIRA_EMAIL": "your-email@company.com",
        "JIRA_API_TOKEN": "your-token",
        "JIRA_PROJECT_KEY": "VRBT",
        "ASSIGNEE_DEFAULT": "your-jira-username"
      }
    },
    "bitbucket-integration": {
      "command": "uv",
      "args": ["run", "--directory", "<설치경로>", "voc-bitbucket-integration"],
      "env": {
        "BITBUCKET_BASE_URL": "http://code.your-company.com",
        "BITBUCKET_TOKEN": "your-bitbucket-token"
      }
    },
    "internal-api": {
      "command": "uv",
      "args": ["run", "--directory", "<설치경로>", "voc-internal-api"],
      "env": {
        "INTERNAL_API_BASE_URL": "your-internal-api-base-url",
        "INTERNAL_API_KEY": "your-internal-api-key"
      }
    }
  }
}
```

> 💡 `<설치경로>`를 실제 클론한 경로로 변경하세요 (예: `/Users/username/github/voc-automation-mcp-server`)

### 2단계: Cursor 재시작

설정 후 Cursor를 완전히 재시작하세요.

### 3단계: 개인정보 자동 보호 설정 🔒 (중요!)

**이 단계를 건너뛰면 개인정보가 LLM에 노출됩니다!**

프로젝트 루트에 `.cursorrules` 파일 복사:

```bash
# 설치 경로에서
cp .cursorrules ~/my-project/.cursorrules

# 또는 전역 설정 (모든 프로젝트에 적용)
cp .cursorrules ~/.cursorrules
```

**이 파일의 역할:**
- ✅ Cursor가 자동으로 개인정보를 감지
- ✅ LLM 처리 전에 자동 비식별화
- ✅ [EMAIL_001], [PHONE_001] 같은 플레이스홀더로 대체
- ✅ 안전한 저장소(Jira)에만 원본 복원

## ✅ 설치 확인 (30초)

Cursor 채팅창에서:

```
사용 가능한 MCP 도구를 모두 보여줘
```

**예상 결과**: 16개 이상의 도구 표시 ✅

## 🎯 첫 VOC 처리 (1분)

### 테스트 1: 개인정보 보호 확인

Cursor 채팅창에 다음을 입력:

```
이메일 test@example.com과 전화번호 010-1234-5678이 포함된 텍스트를 분석해줘
```

**기대 결과**: 
- ✅ Cursor가 자동으로 `detectAndAnonymizePII` 호출
- ✅ `[EMAIL_001]`, `[PHONE_001]`로 변환됨
- ✅ "개인정보 감지됨" 메시지 표시

**만약 자동 비식별화가 안 되면**: `.cursorrules` 파일 설정을 다시 확인하세요!

### 테스트 2: 전체 VOC 처리

```
다음 VOC를 처리해줘:

"로그인이 안돼요. 제 이메일은 test@example.com입니다. 
전화번호는 010-1234-5678이고 생년월일은 19900101입니다."

🔒 보안 준수 필수:
1. 개인정보 비식별화 (세션: test-001)
2. 익명화된 텍스트로 VOC 분석
3. Jira 티켓 생성 (프로젝트: VOC)
4. Jira에만 원본 복원
5. 세션 정리
```

**성공 시**: 
- ✅ 개인정보가 자동 비식별화됨
- ✅ Jira 티켓 생성 (번호와 URL 표시)
- ✅ "세션 정리 완료" 메시지
- 🎉 완료!

## 🚨 문제 해결

### "Unknown tool" 에러
→ Cursor를 완전히 재시작하세요

### "uv: command not found" 에러
→ uv 설치: `curl -LsSf https://astral.sh/uv/install.sh | sh`

### Jira 에러
→ `~/.cursor/mcp.json`의 `jira-integration` 설정의 `env` 값 확인

### Python 버전 에러
→ `uv python install 3.13`으로 Python 3.13 설치

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
