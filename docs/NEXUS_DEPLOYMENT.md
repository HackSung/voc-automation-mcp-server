# Nexus 배포 가이드

사내 Nexus에 VOC 자동화 MCP 서버를 배포하고 직원들이 다운로드할 수 있도록 설정하는 방법을 안내합니다.

## 목차

1. [배포 준비](#배포-준비)
2. [Nexus 설정](#nexus-설정)
3. [패키지 배포](#패키지-배포)
4. [사용자 설치 가이드](#사용자-설치-가이드)
5. [버전 관리](#버전-관리)

---

## 배포 준비

### 1. 패키지 정보 확인

`package.json`에서 다음 정보를 업데이트하세요:

```json
{
  "name": "@your-company/voc-automation-mcp-server",
  "version": "1.0.0",
  "publishConfig": {
    "registry": "https://nexus.your-company.com/repository/npm-private/"
  }
}
```

**변경 필요 항목**:
- `@your-company` → 실제 회사 scope
- `https://nexus.your-company.com` → 실제 Nexus URL

### 2. 빌드 및 테스트

```bash
# 클린 빌드
npm run clean
npm install
npm run build

# 빌드 결과 확인
ls -R servers/*/dist
ls -R shared/dist

# 모든 dist 폴더에 index.js가 있어야 함
```

### 3. 배포 파일 확인

```bash
# 배포될 파일 목록 확인
npm pack --dry-run

# 실제 tarball 생성 (테스트용)
npm pack
# → @your-company-voc-automation-mcp-server-1.0.0.tgz 생성됨
```

**포함되어야 할 파일**:
- ✅ `servers/*/dist/**/*` - 모든 MCP 서버 빌드 결과
- ✅ `shared/dist/**/*` - 공유 라이브러리
- ✅ `docs/**/*` - 문서
- ✅ `examples/**/*` - 예제
- ✅ `cursor-mcp-config.json` - Cursor 설정
- ✅ `.env.example` - 환경변수 템플릿
- ✅ `README.md` - 한글 설명서

**제외되어야 할 파일**:
- ❌ `node_modules/` - 의존성 (사용자가 설치)
- ❌ `.env` - 실제 환경변수 (보안)
- ❌ `src/**/*` - 소스코드 (dist만 배포)
- ❌ `.git/` - Git 메타데이터

---

## Nexus 설정

### 1. Nexus Repository 생성

Nexus 관리자 또는 DevOps 팀에 요청:

**Repository 타입**: npm (hosted)

**설정**:
```
Name: npm-private
Format: npm
Type: hosted
Deployment Policy: Allow redeploy (개발 중) / Disable redeploy (운영)
Blob Store: default
```

### 2. Nexus 인증 설정

#### 방법 A: 개인 토큰 사용 (권장)

1. Nexus에 로그인
2. 프로필 → Security → User Token 생성
3. 환경변수에 저장:

```bash
# ~/.bashrc 또는 ~/.zshrc에 추가
export NEXUS_AUTH_TOKEN="your-token-here"
```

#### 방법 B: .npmrc 파일 설정

```bash
# 프로젝트 루트에 .npmrc 생성
cat > .npmrc << EOF
@your-company:registry=https://nexus.your-company.com/repository/npm-private/
//nexus.your-company.com/repository/npm-private/:_authToken=\${NEXUS_AUTH_TOKEN}
EOF
```

**주의**: `.npmrc`에 직접 토큰을 쓰지 마세요! 환경변수를 사용하세요.

### 3. 권한 설정

Nexus 관리자가 다음 권한을 부여해야 합니다:

**배포자 (개발팀)**:
- `nx-repository-view-npm-*-browse`
- `nx-repository-view-npm-*-read`
- `nx-repository-view-npm-*-add` ← 배포 권한

**사용자 (일반 직원)**:
- `nx-repository-view-npm-*-browse`
- `nx-repository-view-npm-*-read`

---

## 패키지 배포

### 1. 버전 확인

Semantic Versioning 사용:

```
1.0.0 → 최초 릴리스
1.0.1 → 버그 수정
1.1.0 → 새 기능 추가
2.0.0 → 호환성 깨지는 변경
```

버전 변경:

```bash
# package.json의 version 필드 수정
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.1 → 1.1.0
npm version major  # 1.1.0 → 2.0.0
```

### 2. 배포 실행

```bash
# 1. 최종 빌드
npm run prepublishOnly

# 2. Nexus 인증 확인
echo $NEXUS_AUTH_TOKEN

# 3. 배포
npm publish

# 성공 시:
# + @your-company/voc-automation-mcp-server@1.0.0
```

### 3. 배포 확인

```bash
# Nexus에서 패키지 검색
npm search @your-company/voc-automation-mcp-server --registry=https://nexus.your-company.com/repository/npm-private/

# 또는 Nexus 웹 UI에서 확인
# https://nexus.your-company.com → Browse → npm-private
```

---

## 사용자 설치 가이드

직원들에게 다음 가이드를 공유하세요.

### 사용자 측 .npmrc 설정

**전역 설정 (한 번만 실행)**:

```bash
# 회사 Nexus를 기본 레지스트리로 설정
npm config set @your-company:registry https://nexus.your-company.com/repository/npm-private/

# 인증 토큰 설정 (개인별 발급)
npm config set //nexus.your-company.com/repository/npm-private/:_authToken <YOUR_TOKEN>
```

### 패키지 설치

```bash
# 새 프로젝트 생성
mkdir my-voc-automation
cd my-voc-automation

# 패키지 설치
npm install @your-company/voc-automation-mcp-server

# 설치 확인
ls node_modules/@your-company/voc-automation-mcp-server/
```

### Cursor 설정

**자동 설정 (향후 지원)**:

```bash
cd node_modules/@your-company/voc-automation-mcp-server
npm run setup:cursor
```

**수동 설정**:

```bash
# 1. 설정 파일 복사
cp node_modules/@your-company/voc-automation-mcp-server/cursor-mcp-config.json ~/.cursor/mcp.json

# 2. 경로 수정
# ~/.cursor/mcp.json에서 <설치경로>를 실제 경로로 변경:
# $(pwd)/node_modules/@your-company/voc-automation-mcp-server/servers/...

# 3. 환경변수 설정
cp node_modules/@your-company/voc-automation-mcp-server/.env.example .env
vim .env  # 실제 값 입력

# 4. Cursor 재시작
```

---

## 버전 관리

### 릴리스 노트 작성

`CHANGELOG.md` 파일 생성:

```markdown
# Changelog

## [1.0.0] - 2026-01-07

### Added
- 최초 릴리스
- PII Security Server: 개인정보 자동 비식별화
- VOC Analysis Server: LLM 기반 분석
- Jira Integration Server: 자동 티켓팅
- Internal API Server: 레거시 연동

### Security
- PII 데이터 메모리 전용 저장 (1시간 TTL)
- API 키 마스킹 로깅
- HTTPS 통신 강제

## [1.0.1] - 2026-01-15 (예정)

### Fixed
- PII 감지 정규식 개선
- Jira API 재시도 로직 버그 수정

### Changed
- 로그 레벨 조정
```

### 태그 및 릴리스

```bash
# Git 태그 생성
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# GitHub Release 생성 (선택)
# Repository → Releases → Create a new release
```

### 업데이트 공지

**사내 공지 채널에 공유**:

```
📢 VOC 자동화 MCP 서버 v1.0.0 릴리스

새로운 버전이 배포되었습니다!

🎉 주요 변경사항:
- [변경 내용 요약]

📦 업데이트 방법:
npm update @your-company/voc-automation-mcp-server

📚 문서:
https://your-company.com/docs/voc-automation

❓ 문의:
#voc-automation 채널 또는 it-support@your-company.com
```

---

## 배포 체크리스트

### 배포 전

- [ ] 모든 테스트 통과
- [ ] 빌드 에러 없음 (`npm run build`)
- [ ] 문서 업데이트 (README.md, CHANGELOG.md)
- [ ] 버전 번호 증가 (`npm version`)
- [ ] .env 파일 제외 확인
- [ ] API 키 하드코딩 없음 확인

### 배포 중

- [ ] Nexus 인증 확인
- [ ] `npm publish` 성공
- [ ] Nexus 웹 UI에서 패키지 확인
- [ ] 버전 번호 올바른지 확인

### 배포 후

- [ ] 테스트 환경에서 설치 테스트
- [ ] Cursor 연동 테스트
- [ ] 기본 워크플로우 테스트
- [ ] 사내 공지 발송
- [ ] 문서 링크 업데이트

---

## 트러블슈팅

### 문제 1: 배포 권한 에러

```
npm ERR! 403 Forbidden
```

**해결**:
1. Nexus 토큰 확인: `echo $NEXUS_AUTH_TOKEN`
2. Nexus 권한 확인 (관리자에게 문의)
3. Registry URL 확인: `npm config get registry`

### 문제 2: 버전 충돌

```
npm ERR! Version 1.0.0 already exists
```

**해결**:
```bash
# 버전 증가 후 재배포
npm version patch
npm publish
```

### 문제 3: 빌드 파일 누락

```
Error: Cannot find module './dist/index.js'
```

**해결**:
```bash
# 전체 재빌드
npm run clean
npm install
npm run build

# files 필드 확인
cat package.json | grep -A 10 '"files"'
```

### 문제 4: 사용자가 설치 못함

```
npm ERR! 404 Not Found
```

**해결**:
1. 사용자 .npmrc 설정 확인
2. Nexus 읽기 권한 확인
3. 패키지명 오타 확인

---

## 자동화 (선택)

### GitHub Actions (CI/CD)

`.github/workflows/publish.yml`:

```yaml
name: Publish to Nexus

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://nexus.your-company.com/repository/npm-private/'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Publish
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NEXUS_TOKEN }}
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    
    stages {
        stage('Build') {
            steps {
                sh 'npm install'
                sh 'npm run build'
            }
        }
        
        stage('Publish') {
            when {
                tag pattern: "v\\d+\\.\\d+\\.\\d+", comparator: "REGEXP"
            }
            steps {
                withCredentials([string(credentialsId: 'nexus-token', variable: 'NEXUS_AUTH_TOKEN')]) {
                    sh 'npm publish'
                }
            }
        }
    }
}
```

---

## 추가 자료

- [npm 공식 문서](https://docs.npmjs.com/cli/v9/commands/npm-publish)
- [Nexus Repository Manager 문서](https://help.sonatype.com/repomanager3)
- [Semantic Versioning](https://semver.org/lang/ko/)

---

**담당**: DevOps Team  
**문의**: devops@your-company.com  
**마지막 업데이트**: 2026-01-07

