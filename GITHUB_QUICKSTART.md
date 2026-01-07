# 🚀 GitHub 업로드 빠른 가이드

이 프로젝트를 GitHub에 **3분 안에** 업로드하는 방법입니다.

## 📋 사전 체크 (1분)

```bash
# 자동 검사 스크립트 실행
chmod +x scripts/github-setup.sh
./scripts/github-setup.sh
```

**모든 검사 통과하면 ✅ 계속 진행**

---

## 🎬 방법 1: 자동 스크립트 (권장, 2분)

### 1단계: Git 초기화 및 첫 커밋

```bash
chmod +x scripts/git-init.sh
./scripts/git-init.sh
```

이 스크립트가 자동으로 수행:
- ✅ Git 초기화
- ✅ 기본 브랜치 main 설정
- ✅ 사용자 정보 확인/설정
- ✅ 파일 스테이징 (.env 제외)
- ✅ 첫 커밋 생성

### 2단계: GitHub 저장소 생성

브라우저에서 https://github.com/new 접속

```
Repository name: voc-automation-mcp-server
Description: 고객 VOC 자동 처리 시스템 - PII 보호, LLM 분석, Jira 자동 티켓팅

⚪ Public
🔘 Private (사내 전용 권장)

☐ Add README (이미 있음)
☐ Add .gitignore (이미 있음)
✅ MIT License
```

`Create repository` 클릭!

### 3단계: 푸시

GitHub에 표시된 명령어 복사 또는:

```bash
# SSH 사용 (권장)
git remote add origin git@github.com:your-username/voc-automation-mcp-server.git
git push -u origin main

# 또는 HTTPS
git remote add origin https://github.com/your-username/voc-automation-mcp-server.git
git push -u origin main
```

**완료! 🎉**

---

## 🛠️ 방법 2: 수동 (3분)

### 1단계: Git 초기화

```bash
git init
git branch -M main
```

### 2단계: Git 사용자 설정

```bash
git config user.name "Your Name"
git config user.email "your.email@company.com"
```

### 3단계: 파일 추가 및 커밋

```bash
# 모든 파일 추가
git add .

# .env 제외 확인
git status | grep .env
# 아무것도 나오지 않으면 OK

# 첫 커밋
git commit -m "🎉 Initial commit: VOC 자동화 MCP 서버 v1.0.0

- PII Security Server: 개인정보 자동 비식별화
- VOC Analysis Server: LLM 기반 분석
- Jira Integration Server: 자동 티켓팅
- Internal API Server: 레거시 연동
- 완전한 한글 문서
- Nexus 배포 준비 완료"
```

### 4단계: GitHub 저장소 생성 (위 2단계 참고)

### 5단계: 푸시

```bash
git remote add origin git@github.com:your-username/voc-automation-mcp-server.git
git push -u origin main
```

---

## ✅ 업로드 확인

브라우저에서 확인:
```
https://github.com/your-username/voc-automation-mcp-server
```

다음이 표시되면 성공:
- ✅ README.md가 메인 페이지에 렌더링됨
- ✅ 시스템 아키텍처 다이어그램 표시
- ✅ 배지 5개 표시 (버전, 라이선스 등)
- ✅ 50+ 파일

---

## 🎨 저장소 꾸미기 (선택, +5분)

### About 섹션 설정

저장소 우측 상단 톱니바퀴 ⚙️ 클릭:

```
Description: 
고객 VOC 자동 처리 시스템 - PII 보호, LLM 분석, Jira 자동 티켓팅

Topics: 
mcp, voc, automation, pii, jira, llm, openai, typescript, korean
```

### GitHub Actions 활성화

1. Actions 탭 클릭
2. "I understand my workflows, go ahead and enable them" 클릭
3. CI 워크플로우가 자동 실행됨

### Issues/PR 활성화

Settings → Features:
- ✅ Issues
- ✅ Projects  
- ✅ Discussions (선택)

---

## 📢 공유하기

### 사내 공유

```
📢 VOC 자동화 MCP 서버 오픈소스 공개!

🔗 https://github.com/your-username/voc-automation-mcp-server

✨ 특징:
- 개인정보 자동 보호
- LLM 기반 분석
- Jira 자동 티켓팅
- 15분 → 30초 시간 단축

⭐ Star & Watch 부탁드립니다!
```

### 외부 공유 (Public인 경우)

- Twitter: #opensource #mcp #ai
- LinkedIn: 프로젝트 소개
- Reddit: r/opensource
- Dev.to: 블로그 포스트

---

## 🔧 다음 단계

### 1. 릴리스 생성

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

GitHub → Releases → Create a new release

### 2. 협업자 초대

Settings → Collaborators → Add people

### 3. 브랜치 보호

Settings → Branches → Add rule:
- Branch name: `main`
- ✅ Require pull request reviews
- ✅ Require status checks

### 4. GitHub Pages (선택)

Settings → Pages:
- Source: main
- Folder: /docs

---

## ❓ 문제 해결

### 푸시 거부됨

```
error: failed to push
```

**해결**:
```bash
git pull origin main --rebase
git push origin main
```

### .env 파일이 추가됨

```bash
git reset .env
echo ".env" >> .gitignore
git add .gitignore
git commit -m "chore: .env를 gitignore에 추가"
```

### 권한 에러 (SSH)

```bash
# SSH 키 생성
ssh-keygen -t ed25519 -C "your.email@company.com"

# 공개키 복사
cat ~/.ssh/id_ed25519.pub

# GitHub → Settings → SSH Keys → New SSH key에 추가
```

---

## 📚 추가 자료

- **상세 가이드**: [docs/GITHUB_GUIDE.md](docs/GITHUB_GUIDE.md)
- **기여 방법**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **보안 정책**: [docs/SECURITY.md](docs/SECURITY.md)

---

**소요 시간**: 3분  
**난이도**: ⭐ (매우 쉬움)  
**성공률**: 99%

🎉 **축하합니다! GitHub에 프로젝트가 공개되었습니다!**

