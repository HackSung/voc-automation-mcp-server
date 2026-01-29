# Deployment Checklist (Python/FastMCP 버전)

## Before Release

### 코드 확인

- [ ] `uv sync` 성공
- [ ] `uv run ruff check src/` 통과 (또는 경고만)
- [ ] `uv run mypy src/` 통과 (또는 경고만)
- [ ] 모든 서버 시작 테스트 통과:
  ```bash
  uv run voc-pii-security  # Ctrl+C로 종료
  uv run voc-analysis
  uv run voc-jira-integration
  uv run voc-bitbucket-integration
  uv run voc-internal-api
  ```

### 보안 확인

- [ ] 시크릿 키 커밋 안됨 (API 토큰, 비밀번호 등)
- [ ] `.gitignore`에 민감 파일 포함 확인

### 버전 업데이트

- [ ] `pyproject.toml`의 `version` 업데이트
- [ ] `CHANGELOG.md` 업데이트

---

## Nexus 배포

### 1. 인증 설정 (최초 1회)

```bash
export UV_PUBLISH_URL="http://nexus.skplanet.com/repository/team-vas-pypi-releases/"
export UV_PUBLISH_USERNAME="your-username"
export UV_PUBLISH_PASSWORD="your-password"
```

### 2. 빌드 & 배포

```bash
# 이전 빌드 정리
rm -rf dist/

# 빌드
uv build

# 배포
uv publish
```

### 3. 배포 확인

- [ ] Nexus 웹 UI에서 패키지 확인
- [ ] 버전 번호 확인
- [ ] 다른 PC에서 설치 테스트:
  ```bash
  uvx --index-url http://nexus.skplanet.com/repository/team-vas-pypi-group/simple/ \
      --from voc-automation-mcp-server \
      voc-pii-security
  ```

---

## 사용자 배포 후

- [ ] 팀 Slack/이메일로 업데이트 공지
- [ ] 변경 사항 문서화
- [ ] 필요 시 `mcp.json` 예제 업데이트 공유

---

## Environment Injection

이 프로젝트는 런타임에 `.env` 파일을 로드하지 않습니다.

필수 환경변수는 다음 중 하나로 주입:

- [ ] `~/.cursor/mcp.json` → `mcpServers.<server>.env` 필드 (권장)
- [ ] 시스템 환경변수 (Cursor 실행 전 export)

---

## Rollback (문제 발생 시)

```json
{
  "mcpServers": {
    "jira-integration": {
      "command": "uvx",
      "args": [
        "--index-url",
        "http://nexus.skplanet.com/repository/team-vas-pypi-group/simple/",
        "--from",
        "voc-automation-mcp-server==2.0.0",
        "voc-jira-integration"
      ]
    }
  }
}
```

특정 버전으로 고정하여 롤백 가능.

---

**Last Updated**: 2026-01-29  
**Version**: 2.0.0 (Python/FastMCP)
