# GitHub 업로드 가이드

이 문서는 VOC 자동화 MCP 서버 프로젝트를 GitHub에 업로드하고 공유하는 방법을 안내합니다.

## 📋 목차

1. [업로드 전 체크리스트](#업로드-전-체크리스트)
2. [GitHub 저장소 생성](#github-저장소-생성)
3. [Git 초기 설정](#git-초기-설정)
4. [코드 업로드](#코드-업로드)
5. [저장소 설정](#저장소-설정)
6. [협업 설정](#협업-설정)

---

## 업로드 전 체크리스트

### ✅ 필수 확인 사항

```bash
# 1. 민감 정보가 코드에 하드코딩되어 있지 않은지 확인
grep -r "sk-" --include="*.py" src/
# 결과가 없어야 함 ✅

grep -r "api.*token.*=" --include="*.py" src/ | grep -v "os.environ"
# 환경변수만 사용해야 함 ✅

# 2. __pycache__와 .venv가 .gitignore에 있는지 확인
cat .gitignore | grep "__pycache__"
cat .gitignore | grep ".venv"
# 결과가 나와야 함 ✅

# 3. dist 폴더가 .gitignore에 있는지 확인
cat .gitignore | grep "dist"
# dist는 빌드 결과이므로 gitignore에 있어야 함 ✅
```

### 🔐 보안 검사

```bash
# 실제 API 키가 포함된 파일 검색
find . -type f -name "*.ts" -o -name "*.js" | xargs grep -l "sk-proj" 2>/dev/null
# 결과가 없어야 함

# env/secret 파일이 git에 추가되지 않았는지 확인
git status
# 민감 파일/키가 보이면 unstage 후 제거 ✅
```

### 📦 빌드 테스트

```bash
# 깨끗한 상태에서 빌드 테스트
rm -rf .venv dist
uv sync

# 모든 패키지 임포트 확인
uv run python -c "from pii_security.detector import PIIDetector; print('OK')"
uv run python -c "from voc_analysis.prompts import PromptGenerator; print('OK')"
uv run python -c "from jira_integration.client import JiraClient; print('OK')"
# 모두 OK가 출력되어야 함 ✅
```

---

## GitHub 저장소 생성

### 옵션 1: 웹 UI에서 생성 (권장)

1. https://github.com 로그인
2. 우측 상단 `+` → `New repository`
3. 저장소 설정:

   ```
   Repository name: voc-automation-mcp-server
   Description: 고객 VOC 자동 처리 시스템 - PII 보호, LLM 분석, Jira 자동 티켓팅

   ⚪ Public (오픈소스로 공개)
   🔘 Private (사내 전용)

   ☐ Add a README file (이미 있으므로 체크 안 함)
   ☐ Add .gitignore (이미 있으므로 체크 안 함)
   ✅ Choose a license: MIT License (선택)
   ```

4. `Create repository` 클릭

### 옵션 2: GitHub CLI 사용

```bash
# GitHub CLI 설치 (없는 경우)
brew install gh

# 로그인
gh auth login

# 저장소 생성
gh repo create voc-automation-mcp-server \
  --public \
  --description "고객 VOC 자동 처리 시스템 - PII 보호, LLM 분석, Jira 자동 티켓팅" \
  --license MIT
```

---

## Git 초기 설정

### 1. Git 저장소 초기화

```bash
cd /Users/1004359/voc-automation-mcp-server

# Git 초기화 (아직 안 했다면)
git init

# 기본 브랜치를 main으로 설정
git branch -M main
```

### 2. Git 사용자 정보 설정

```bash
# 전역 설정 (모든 저장소에 적용)
git config --global user.name "Your Name"
git config --global user.email "your.email@company.com"

# 또는 이 프로젝트만 (회사 계정과 개인 계정 분리 시)
git config user.name "Your Name"
git config user.email "your.email@company.com"
```

### 3. 원격 저장소 연결

```bash
# GitHub 저장소 URL 연결
git remote add origin https://github.com/your-username/voc-automation-mcp-server.git

# 또는 SSH 사용 (권장)
git remote add origin git@github.com:your-username/voc-automation-mcp-server.git

# 원격 저장소 확인
git remote -v
```

---

## 코드 업로드

### 1. 파일 스테이징

```bash
# 모든 파일 추가
git add .

# 추가된 파일 확인
git status

# 민감 파일이 스테이지되면 제거:
git reset <민감파일>
```

### 2. 첫 커밋

```bash
git commit -m "🎉 Initial commit: VOC 자동화 MCP 서버 v1.0.0

- PII Security Server: 개인정보 자동 비식별화
- VOC Analysis Server: LLM 기반 분석
- Jira Integration Server: 자동 티켓팅
- Internal API Server: 레거시 연동
- 완전한 한글 문서
- Nexus 배포 준비 완료"
```

### 3. GitHub에 푸시

```bash
# main 브랜치로 푸시
git push -u origin main

# 성공 시:
# Enumerating objects: xxx, done.
# Writing objects: 100% (xxx/xxx), done.
# To github.com:your-username/voc-automation-mcp-server.git
#  * [new branch]      main -> main
```

### 4. 푸시 확인

브라우저에서 https://github.com/your-username/voc-automation-mcp-server 접속하여 확인

---

## 저장소 설정

### 1. About 섹션 설정

GitHub 저장소 페이지에서:

1. 우측 상단 `⚙️ Settings` 클릭 (아니면 About 섹션의 톱니바퀴)
2. **Description**:
   ```
   고객 VOC 자동 처리 시스템 - PII 보호, LLM 분석, Jira 자동 티켓팅
   ```
3. **Website**: (있다면) 사내 문서 URL
4. **Topics**: 추가
   ```
   mcp
   voc
   automation
   pii
   privacy
   jira
   llm
   openai
   customer-service
   korean
   typescript
   ```

### 2. 브랜치 보호 규칙 (선택)

Settings → Branches → Add rule:

```
Branch name pattern: main

✅ Require a pull request before merging
  ✅ Require approvals (1명 이상)
✅ Require status checks to pass before merging
✅ Require conversation resolution before merging
☐ Require signed commits (엄격한 경우)
✅ Include administrators
```

### 3. GitHub Pages (선택)

문서를 웹으로 제공:

Settings → Pages:

```
Source: Deploy from a branch
Branch: main
Folder: /docs
```

### 4. Secrets 설정 (CI/CD용)

Settings → Secrets and variables → Actions → New repository secret:

```
NEXUS_AUTH_TOKEN: your-nexus-token (Nexus 배포용)
```

---

## 협업 설정

### 1. 이슈 템플릿 생성

`.github/ISSUE_TEMPLATE/bug_report.md`:

```markdown
---
name: 버그 리포트
about: 버그를 발견하셨나요?
title: '[BUG] '
labels: bug
assignees: ''
---

## 🐛 버그 설명

명확하고 간결하게 버그를 설명해주세요.

## 📝 재현 방법

1. '...' 로 이동
2. '...' 클릭
3. '...' 까지 스크롤
4. 에러 발생

## ✅ 예상 동작

무엇이 일어날 것으로 예상했나요?

## 📸 스크린샷

가능하면 스크린샷을 첨부해주세요.

## 🖥️ 환경

- OS: [e.g. macOS 14.0]
- Node.js: [e.g. 18.0.0]
- Cursor 버전: [e.g. 0.40.0]
- 패키지 버전: [e.g. 1.0.0]

## 📋 추가 정보

기타 필요한 정보를 추가해주세요.
```

### 2. PR 템플릿 생성

`.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## 📝 변경 사항

이 PR에서 변경된 내용을 설명해주세요.

## 🎯 관련 이슈

Closes #(이슈 번호)

## ✅ 체크리스트

- [ ] 코드가 정상적으로 빌드됨
- [ ] 테스트를 추가/수정함
- [ ] 문서를 업데이트함
- [ ] 민감 정보(키/토큰/개인정보)가 포함되지 않음
- [ ] 린터 에러가 없음

## 🧪 테스트 방법

이 변경사항을 어떻게 테스트했나요?

## 📸 스크린샷 (선택)

UI 변경이 있다면 스크린샷을 첨부해주세요.
```

### 3. 기여 가이드 작성

`CONTRIBUTING.md`:

```markdown
# 기여 가이드

VOC 자동화 MCP 서버 프로젝트에 기여해주셔서 감사합니다!

## 개발 환경 설정

1. 저장소 포크
2. 클론: `git clone git@github.com:your-username/voc-automation-mcp-server.git`
3. Python 설치: `uv python install 3.13`
4. 의존성 설치: `uv sync --all-extras`
5. 환경변수 설정: `~/.cursor/mcp.json`의 `mcpServers.<server>`의 `env`로 주입

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

타입:
- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷팅
- `refactor`: 리팩토링
- `test`: 테스트 추가
- `chore`: 빌드/도구 설정

예시:
```

feat: PII 감지 패턴에 여권번호 추가

여권번호 형식(M12345678)을 감지하고 비식별화하는
기능을 추가했습니다.

Closes #42

```

## 코드 리뷰

모든 PR은 최소 1명의 승인이 필요합니다.

## 문의

질문이나 제안사항은 이슈로 등록해주세요.
```

---

## 추가 설정 (선택)

### 1. GitHub Actions CI/CD

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        python-version: ['3.13']

    steps:
      - uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v4
        with:
          enable-cache: true

      - name: Set up Python ${{ matrix.python-version }}
        run: uv python install ${{ matrix.python-version }}

      - name: Install dependencies
        run: uv sync --all-extras

      - name: Verify package imports
        run: |
          uv run python -c "from shared.config import get_env_config; print('shared OK')"
          uv run python -c "from pii_security.detector import PIIDetector; print('pii_security OK')"
          uv run python -c "from voc_analysis.prompts import PromptGenerator; print('voc_analysis OK')"
          uv run python -c "from jira_integration.client import JiraClient; print('jira_integration OK')"
          uv run python -c "from bitbucket_integration.client import BitbucketClient; print('bitbucket_integration OK')"
          uv run python -c "from internal_api.errors import ErrorResolver; print('internal_api OK')"

      - name: Check for sensitive data
        run: |
          if grep -r "sk-" src/ --include="*.py"; then
            echo "❌ API 키가 코드에 포함되어 있습니다!"
            exit 1
          fi
          echo "✅ 민감 정보 검사 통과"

      - name: Lint
        run: uv run ruff check src/

      - name: Type check
        run: uv run mypy src/ --ignore-missing-imports
```

### 2. README 배지 추가

README.md 상단에 추가:

```markdown
# VOC 처리 자동화 MCP 서버

[![Python 3.13+](https://img.shields.io/badge/python-3.13+-blue?style=flat-square&logo=python)](https://www.python.org/)
[![FastMCP 2.14+](https://img.shields.io/badge/FastMCP-2.14+-green?style=flat-square)](https://gofastmcp.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![CI Status](https://github.com/your-username/voc-automation-mcp-server/workflows/CI/badge.svg)](https://github.com/your-username/voc-automation-mcp-server/actions)

고객 VOC(Voice of Customer)를 접수부터 Jira 티켓 생성, 알림 발송까지 자동으로 처리하는 MCP(Model Context Protocol) 기반 엔터프라이즈 시스템입니다.
```

### 3. 스타 히스토리 추가

프로젝트가 인기를 얻으면:

```markdown
## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=your-username/voc-automation-mcp-server&type=Date)](https://star-history.com/#your-username/voc-automation-mcp-server&Date)
```

---

## 공유 및 홍보

### 1. 소셜 미디어

- **Twitter/X**:

  ```
  🎉 VOC 자동화 MCP 서버를 오픈소스로 공개했습니다!

  ✨ 특징:
  - 개인정보 자동 보호
  - LLM 기반 분석
  - Jira 자동 티켓팅
  - 15분 → 30초로 시간 단축

  🔗 github.com/your-username/voc-automation-mcp-server

  #OpenSource #MCP #AI #CustomerService
  ```

- **LinkedIn**:

  ```
  고객 VOC 처리를 자동화하는 오픈소스 프로젝트를 공개했습니다.

  Model Context Protocol(MCP)을 활용하여 Cursor Editor에서
  고객 불만을 접수하면 개인정보 보호, LLM 분석, Jira 티켓 생성,
  알림 발송까지 30초 만에 완료됩니다.

  관심 있으신 분들은 확인해보세요!
  ```

### 2. 커뮤니티

- **Reddit**: r/opensource, r/MachineLearning
- **Hacker News**: https://news.ycombinator.com/
- **Dev.to**: 블로그 포스트 작성
- **한국 커뮤니티**:
  - OKKY
  - GeekNews
  - 생활코딩 페이스북 그룹

### 3. 사내 공유

```
📢 GitHub 오픈소스 프로젝트 공개 안내

VOC 자동화 MCP 서버를 GitHub에 공개했습니다.

🔗 https://github.com/your-username/voc-automation-mcp-server

모든 직원이 자유롭게:
- ⭐ Star 주기
- 🍴 Fork 하기
- 📝 이슈 등록
- 🔧 기여하기

가능합니다. 많은 관심 부탁드립니다!
```

---

## 트러블슈팅

### 문제 1: 푸시 거부됨

```
! [rejected]        main -> main (fetch first)
```

**해결**:

```bash
git pull origin main --rebase
git push origin main
```

### 문제 2: env/secret 파일이 추가됨

```bash
# Unstage
git reset <민감파일>

# 필요하면 .gitignore에 추가 후 재커밋
```

### 문제 3: 대용량 파일 에러

```
remote: error: GH001: Large files detected
```

**해결**:

```bash
# Git LFS 설치
brew install git-lfs
git lfs install

# 큰 파일 추적
git lfs track "*.bin"
git add .gitattributes
git commit -m "chore: Git LFS 설정"
```

---

## 체크리스트

배포 전 최종 확인:

- [ ] env/secret 파일이 Git에 포함되지 않음
- [ ] API 키가 코드에 하드코딩되지 않음
- [ ] 빌드가 정상적으로 완료됨
- [ ] README.md가 최신 버전
- [ ] 라이선스 파일 포함
- [ ] 민감한 사내 정보 제거
- [ ] 연락처/URL이 공개 가능한 것으로 업데이트
- [ ] 첫 커밋 완료
- [ ] GitHub에 푸시 완료
- [ ] About 섹션 설정
- [ ] Topics 추가

---

**작성일**: 2026-01-29  
**버전**: 2.0.0 (Python/FastMCP)
