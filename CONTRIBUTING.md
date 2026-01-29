# 기여 가이드

VOC 자동화 MCP 서버 프로젝트에 기여해주셔서 감사합니다!

## 개발 환경

- Python 3.13+
- uv (권장) 또는 pip

## 로컬 실행/테스트

이 프로젝트는 **런타임에 env 파일을 자동 로드하지 않습니다.**  
필요한 환경변수는 다음 중 하나로 주입하세요.

- Cursor 사용 시: `~/.cursor/mcp.json`의 `mcpServers.<server>.env`
- 로컬 실행 시: 셸/OS 환경변수(export)

### 의존성 설치

```bash
# uv 사용 (권장)
uv sync --all-extras

# 또는 pip 사용
pip install -e ".[dev]"
```

### 린트 & 타입체크

```bash
# Ruff 린터
uv run ruff check src/

# MyPy 타입체크
uv run mypy src/ --ignore-missing-imports
```

### 서버 실행 테스트

```bash
uv run voc-pii-security
uv run voc-analysis
uv run voc-jira-integration
uv run voc-bitbucket-integration
uv run voc-internal-api
```

## 커밋/PR 체크리스트

- [ ] 민감 정보(토큰/키/개인정보)가 커밋에 포함되지 않음
- [ ] `uv sync` 성공
- [ ] `uv run ruff check src/` 통과
- [ ] 문서 변경 시 관련 문서 업데이트

## 브랜치 전략

- `main`: 안정화된 버전
- `develop`: 개발 브랜치
- `feature/*`: 새 기능
- `bugfix/*`: 버그 수정
- `hotfix/*`: 긴급 수정

## 커밋 메시지 규칙

```
<타입>: <제목>

<본문>

<푸터>
```

**타입:**

- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅
- `refactor`: 리팩토링
- `test`: 테스트 추가
- `chore`: 빌드/도구 설정

**예시:**

```
feat: PII 감지 패턴에 여권번호 추가

여권번호 형식(M12345678)을 감지하고 비식별화하는
기능을 추가했습니다.

Closes #42
```

---

**Version**: 2.0.0 (Python/FastMCP)
