# Nexus 배포 및 사용 빠른 가이드 (Python 버전)

## 🎯 목표

사용자가 `mcp.json`에 몇 줄만 추가하면 VOC MCP 서버를 사용할 수 있도록 Nexus에 배포

---

## 관리자: 배포 방법

### 1회만: Nexus 인증 설정

```bash
# 환경변수 설정
export UV_PUBLISH_URL="http://nexus.skplanet.com/repository/team-vas-pypi-releases/"
export UV_PUBLISH_USERNAME="your-username"
export UV_PUBLISH_PASSWORD="your-password"
```

### 배포 (버전 업데이트마다)

```bash
cd /Users/1003899/github/voc-automation-mcp-server

# 버전 업데이트 (pyproject.toml 수정)
# version = "2.0.1"

# 빌드 & 배포
uv build
uv publish
```

✅ 배포 완료!

---

## 사용자: 사용 방법

### 사전 요구: uv 설치

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 단 1개 파일만 수정하면 끝!

**파일 위치**:

- macOS/Linux: `~/.cursor/mcp.json`
- Windows: `%APPDATA%\Cursor\mcp.json`

**내용 추가**:

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
        "JIRA_EMAIL": "your-username@sk.com",
        "JIRA_API_TOKEN": "your-jira-api-token",
        "JIRA_PROJECT_KEY": "VRBT",
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
        "BITBUCKET_TOKEN": "your-bitbucket-token"
      }
    }
  }
}
```

**Cursor 재시작** → 끝!

---

## 💡 npx vs uvx 비교

| TypeScript (기존)      | Python (새 버전)                   |
| ---------------------- | ---------------------------------- |
| `npx`                  | `uvx`                              |
| `-y -p @sk-planet/...` | `--from voc-automation-mcp-server` |
| `npm publish`          | `uv publish`                       |
| `.npmrc`               | 환경변수 또는 `uv.toml`            |

### 기존 npx 방식

```json
"command": "npx",
"args": ["-y", "-p", "@sk-planet/voc-automation-mcp-server", "voc-jira-integration"]
```

### 새로운 uvx 방식

```json
"command": "uvx",
"args": ["--index-url", "http://nexus.skplanet.com/repository/team-vas-pypi-group/simple/", "--from", "voc-automation-mcp-server", "voc-jira-integration"]
```

---

## 🔧 별도 설치 불필요!

- ❌ `pip install` 필요 없음
- ❌ Git clone 필요 없음
- ✅ `uvx`가 Nexus에서 자동으로 다운로드 & 실행

---

## 📋 체크리스트

### 배포 전

- [x] pyproject.toml의 `version` 업데이트
- [x] `uv build` 성공 확인
- [x] Nexus 인증 정보 설정

### 배포 후

- [ ] Nexus 웹 UI에서 패키지 확인
- [ ] 다른 개발자가 mcp.json 설정 후 정상 작동하는지 테스트
- [ ] Slack/이메일로 사용 가이드 공유

---

## ❓ FAQ

**Q: uv/uvx가 없어요**

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
# 터미널 재시작
```

**Q: Nexus 인증이 안돼요**

```bash
# IT 팀에 team-vas-pypi-group 레포지토리 접근 권한 요청
# 또는 Nexus 관리자에게 문의

# VPN 연결 확인 (내부망 접근 필요)
curl -v http://nexus.skplanet.com/repository/team-vas-pypi-group/
```

**Q: 특정 버전만 사용하고 싶어요**

```json
"args": ["--index-url", "...", "--from", "voc-automation-mcp-server==2.0.1", "voc-jira-integration"]
```

**Q: 캐시를 지우고 최신 버전을 받고 싶어요**

```bash
uv cache clean
# Cursor 재시작
```

---

## 📞 지원

- **이메일**: cannan@sk.com
- **Slack**: #voc-automation
- **Jira**: VRBT 프로젝트
