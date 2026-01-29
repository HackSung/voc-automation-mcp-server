# Bitbucket Data Center 연동 가이드

## 📋 개요

Bitbucket Data Center 9.4와 연동하여 저장소를 조회하고 코드를 분석할 수 있는 MCP 서버입니다.

## 🎯 주요 기능

- 📂 저장소 목록 조회
- 📄 파일 내용 읽기
- 🔍 코드 검색
- 🌿 브랜치 관리
- 📦 아카이브 다운로드
- 🔀 Pull Request 조회

## 🚀 설정 방법

### 1. 환경 변수 설정

이 프로젝트는 **런타임에 env 파일을 로드하지 않습니다.**
아래 값을 `~/.cursor/mcp.json`의 `mcpServers.bitbucket-integration`의 `env`(또는 Cursor 실행 환경변수)로 주입하세요:

```bash
# Bitbucket Data Center 연동 (필수)
BITBUCKET_BASE_URL=https://bitbucket.your-company.com
BITBUCKET_TOKEN=your-personal-access-token

# Basic Auth 사용 시 (선택)
BITBUCKET_USERNAME=your-username

# 기본 프로젝트/저장소 설정 (선택)
# 특정 프로젝트와 저장소를 자주 사용한다면 기본값으로 설정 가능
BITBUCKET_PROJECT_KEY=VRBT
BITBUCKET_REPO_SLUG=mobile-app
```

### 2. Personal Access Token 발급

1. Bitbucket에 로그인
2. 프로필 → Settings → Personal Access Tokens
3. "Create token" 클릭
4. 권한 선택:
   - **Repository read**: 저장소 읽기
   - **Repository write**: Pull Request 작성 (선택)
5. 생성된 토큰을 `BITBUCKET_TOKEN`에 설정

### 3. Cursor 설정

`~/.cursor/mcp.json`에 서버 추가:

**Nexus 사용 (팀원용):**

```json
{
  "mcpServers": {
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

**로컬 개발 (개발자용):**

```json
{
  "mcpServers": {
    "bitbucket-integration": {
      "command": "uv",
      "args": [
        "run",
        "--directory",
        "/path/to/voc-automation-mcp-server",
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

## 📖 사용 예시

> **💡 Tip**: `BITBUCKET_PROJECT_KEY`와 `BITBUCKET_REPO_SLUG`를 `mcp.json`의 `env`에 설정하면,
> 매번 프로젝트 키와 저장소를 지정하지 않아도 기본값을 사용할 수 있습니다.

### 저장소 목록 조회

```
PROJ 프로젝트의 모든 저장소를 보여줘
```

### 파일 내용 읽기

```
PROJ 프로젝트의 my-repo 저장소에서 src/index.ts 파일을 읽어줘
```

### 코드 검색

```
PROJ/my-repo 저장소에서 "authenticate" 함수를 검색해줘
```

### 디렉토리 탐색

```
PROJ/my-repo 저장소의 src/components 디렉토리 내용을 보여줘
```

### 브랜치 목록

```
PROJ/my-repo 저장소의 모든 브랜치를 나열해줘
```

### 아카이브 다운로드 URL

```
PROJ/my-repo 저장소의 main 브랜치를 zip으로 다운로드할 수 있는 URL을 만들어줘
```

## 🔧 제공되는 도구

### 1. listRepositories

프로젝트 내 모든 저장소 목록 조회

**입력:**

- `projectKey`: 프로젝트 키 (예: "PROJ")

**출력:**

```json
{
  "count": 5,
  "repositories": [
    {
      "name": "My Repository",
      "slug": "my-repo",
      "project": "PROJ",
      "cloneUrl": "https://bitbucket.com/..."
    }
  ]
}
```

### 2. getFileContent

파일 내용 읽기

**입력:**

- `projectKey`: 프로젝트 키
- `repoSlug`: 저장소 슬러그
- `filePath`: 파일 경로 (예: "src/index.ts")
- `branch`: 브랜치 (기본값: "main")

**출력:**

```json
{
  "filePath": "src/index.ts",
  "branch": "main",
  "content": "파일 내용...",
  "lines": 150
}
```

### 3. searchCode

코드 검색

**입력:**

- `projectKey`: 프로젝트 키
- `repoSlug`: 저장소 슬러그
- `query`: 검색어
- `branch`: 브랜치 (기본값: "main")

**출력:**

```json
{
  "query": "authenticate",
  "count": 3,
  "results": [
    {
      "file": "src/auth.ts",
      "matches": [
        {
          "line": 42,
          "text": "export function authenticate(token: string) {"
        }
      ]
    }
  ]
}
```

### 4. browseDirectory

디렉토리 탐색

**입력:**

- `projectKey`: 프로젝트 키
- `repoSlug`: 저장소 슬러그
- `path`: 디렉토리 경로 (비워두면 루트)
- `branch`: 브랜치 (기본값: "main")

**출력:**

```json
{
  "path": "src",
  "items": [
    {
      "path": "src/index.ts",
      "type": "FILE",
      "size": 2048
    },
    {
      "path": "src/components",
      "type": "DIRECTORY"
    }
  ]
}
```

### 5. listBranches

브랜치 목록 조회

**입력:**

- `projectKey`: 프로젝트 키
- `repoSlug`: 저장소 슬러그

**출력:**

```json
{
  "count": 3,
  "branches": [
    {
      "name": "main",
      "id": "refs/heads/main",
      "latestCommit": "abc123...",
      "isDefault": true
    }
  ]
}
```

### 6. getArchiveUrl

아카이브 다운로드 URL 생성

**입력:**

- `projectKey`: 프로젝트 키
- `repoSlug`: 저장소 슬러그
- `format`: "zip" 또는 "tar.gz" (기본값: "zip")
- `branch`: 브랜치 (기본값: "main")

**출력:**

```json
{
  "archiveUrl": "https://bitbucket.com/.../archive?format=zip",
  "format": "zip",
  "branch": "main",
  "note": "Use this URL with curl or wget to download the archive"
}
```

### 7. listPullRequests

Pull Request 목록 조회

**입력:**

- `projectKey`: 프로젝트 키
- `repoSlug`: 저장소 슬러그
- `state`: "OPEN", "MERGED", "DECLINED", "ALL" (기본값: "OPEN")

**출력:**

```json
{
  "count": 2,
  "state": "OPEN",
  "pullRequests": [
    {
      "id": 123,
      "title": "Add new feature",
      "state": "OPEN",
      "author": "John Doe",
      "createdDate": 1234567890,
      "updatedDate": 1234567890
    }
  ]
}
```

### 8. getPullRequest

특정 Pull Request 상세 정보

**입력:**

- `projectKey`: 프로젝트 키
- `repoSlug`: 저장소 슬러그
- `prId`: Pull Request ID

**출력:**

```json
{
  "id": 123,
  "title": "Add new feature",
  "description": "This PR adds...",
  "state": "OPEN",
  "author": "John Doe",
  "reviewers": [
    {
      "name": "Jane Smith",
      "approved": true,
      "status": "APPROVED"
    }
  ],
  "fromBranch": "feature/new-feature",
  "toBranch": "main",
  "createdDate": 1234567890,
  "updatedDate": 1234567890
}
```

## 🔐 보안

- ✅ Personal Access Token으로 안전한 인증
- ✅ HTTPS 통신 (암호화)
- ✅ 토큰은 환경 변수로 관리
- ✅ 읽기 전용 작업만 수행 (기본)

## 🐛 문제 해결

### 인증 에러

```
Error: Bitbucket API error: 401 Unauthorized
```

**해결:**

1. Personal Access Token이 유효한지 확인
2. 토큰에 "Repository read" 권한이 있는지 확인
3. Bitbucket URL이 올바른지 확인

### 저장소를 찾을 수 없음

```
Error: Bitbucket API error: 404 Not Found
```

**해결:**

1. 프로젝트 키가 정확한지 확인 (대소문자 구분)
2. 저장소 슬러그가 정확한지 확인
3. 해당 저장소에 대한 접근 권한이 있는지 확인

### 네트워크 에러

```
Error: fetch failed
```

**해결:**

1. Bitbucket 서버가 접근 가능한지 확인
2. 프록시 설정 확인
3. 방화벽 규칙 확인

## 📚 관련 문서

- [Bitbucket REST API 문서](https://docs.atlassian.com/bitbucket-server/rest/latest/)
- [Personal Access Tokens 가이드](https://confluence.atlassian.com/bitbucketserver/personal-access-tokens-939515499.html)

## 💡 사용 시나리오

### 1. 코드베이스 분석

```
PROJ/my-app 저장소의 구조를 분석하고,
src 디렉토리의 모든 TypeScript 파일 목록을 보여줘
```

### 2. 특정 함수 찾기

```
PROJ/backend 저장소에서 "processPayment" 함수를 찾아서
해당 파일의 내용을 보여줘
```

### 3. 의존성 확인

```
PROJ/frontend 저장소의 package.json 파일을 읽어서
사용 중인 React 버전을 알려줘
```

### 4. 브랜치 비교

```
PROJ/api 저장소의 develop 브랜치와 main 브랜치의
최근 커밋을 비교해줘
```

---

**Version**: 2.0.0 (Python/FastMCP)  
**Last Updated**: 2026-01-29  
**Maintained by**: VOC Automation Team
