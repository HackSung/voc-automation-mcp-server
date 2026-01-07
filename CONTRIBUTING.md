# 기여 가이드 (Contributing Guide)

VOC 자동화 MCP 서버 프로젝트에 기여해주셔서 감사합니다! 🎉

## 📋 목차

1. [개발 환경 설정](#개발-환경-설정)
2. [브랜치 전략](#브랜치-전략)
3. [커밋 메시지 규칙](#커밋-메시지-규칙)
4. [Pull Request 절차](#pull-request-절차)
5. [코드 스타일](#코드-스타일)
6. [테스트](#테스트)

---

## 개발 환경 설정

### 1. 저장소 포크 및 클론

```bash
# 1. GitHub에서 Fork 버튼 클릭
# 2. 포크한 저장소 클론
git clone git@github.com:your-username/voc-automation-mcp-server.git
cd voc-automation-mcp-server

# 3. 원본 저장소를 upstream으로 추가
git remote add upstream git@github.com:original-owner/voc-automation-mcp-server.git
```

### 2. 의존성 설치 및 빌드

```bash
# 의존성 설치
npm install

# 빌드
npm run build

# 빌드 결과 확인
ls servers/*/dist/index.js
```

### 3. 환경변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# 실제 값 입력 (테스트용)
vim .env
```

### 4. Cursor에서 테스트

```bash
# Cursor 설정
npm run setup:cursor

# Cursor 재시작 후 테스트
```

---

## 브랜치 전략

### 브랜치 명명 규칙

```
main           - 안정화된 프로덕션 버전
develop        - 개발 통합 브랜치
feature/*      - 새 기능 (예: feature/add-passport-pii)
bugfix/*       - 버그 수정 (예: bugfix/fix-jira-timeout)
hotfix/*       - 긴급 수정 (예: hotfix/security-patch)
docs/*         - 문서 변경 (예: docs/update-readme)
```

### 작업 흐름

```bash
# 1. 최신 develop 브랜치로 이동
git checkout develop
git pull upstream develop

# 2. 새 기능 브랜치 생성
git checkout -b feature/your-feature-name

# 3. 작업 수행 및 커밋
git add .
git commit -m "feat: your feature description"

# 4. 포크한 저장소에 푸시
git push origin feature/your-feature-name

# 5. GitHub에서 Pull Request 생성
```

---

## 커밋 메시지 규칙

### 형식

```
<타입>(<범위>): <제목>

<본문>

<푸터>
```

### 타입 (Type)

| 타입 | 설명 | 예시 |
|------|------|------|
| `feat` | 새 기능 추가 | `feat(pii): 여권번호 감지 추가` |
| `fix` | 버그 수정 | `fix(jira): API 타임아웃 수정` |
| `docs` | 문서 변경 | `docs(readme): 설치 가이드 업데이트` |
| `style` | 코드 포맷팅 (로직 변경 없음) | `style(voc): 들여쓰기 수정` |
| `refactor` | 리팩토링 | `refactor(api): 중복 코드 제거` |
| `perf` | 성능 개선 | `perf(embedding): 캐싱 추가` |
| `test` | 테스트 추가/수정 | `test(pii): 단위 테스트 추가` |
| `chore` | 빌드/도구 설정 | `chore(deps): 의존성 업데이트` |

### 범위 (Scope)

- `pii` - PII Security Server
- `voc` - VOC Analysis Server
- `jira` - Jira Integration Server
- `api` - Internal API Server
- `shared` - 공유 모듈
- `docs` - 문서
- `deps` - 의존성

### 예시

#### 좋은 커밋 메시지 ✅

```
feat(pii): 여권번호 감지 패턴 추가

한국 여권번호 형식(M12345678, PM12345678)을 감지하고
비식별화하는 기능을 추가했습니다.

정규식: /[PM]?\d{8}/g

Closes #42
```

```
fix(jira): API 타임아웃 시 재시도 로직 개선

3초 타임아웃 시 exponential backoff 적용
최대 3회 재시도

Fixes #58
```

#### 나쁜 커밋 메시지 ❌

```
update code
```

```
fixed bug
```

```
WIP
```

---

## Pull Request 절차

### 1. PR 생성 전 체크리스트

- [ ] 최신 `develop` 브랜치에서 작업
- [ ] 코드가 정상적으로 빌드됨
- [ ] .env 파일이나 민감 정보 미포함
- [ ] 관련 문서 업데이트 완료
- [ ] 커밋 메시지가 규칙을 따름

### 2. PR 템플릿

GitHub에서 PR 생성 시 자동으로 표시되는 템플릿:

```markdown
## 📝 변경 사항
이 PR에서 변경된 내용을 설명해주세요.

## 🎯 관련 이슈
Closes #(이슈 번호)

## ✅ 체크리스트
- [ ] 코드가 정상적으로 빌드됨
- [ ] 테스트를 추가/수정함
- [ ] 문서를 업데이트함
- [ ] .env 파일이나 민감 정보가 포함되지 않음
- [ ] 린터 에러가 없음

## 🧪 테스트 방법
1. ...
2. ...

## 📸 스크린샷 (선택)
```

### 3. 코드 리뷰

- 모든 PR은 **최소 1명의 승인**이 필요합니다
- 리뷰어의 피드백에 성실히 응답해주세요
- 변경 요청이 있으면 수정 후 다시 푸시하세요

### 4. 머지 규칙

- `main` 브랜치는 **Squash and merge** 사용
- `develop` 브랜치는 **Create a merge commit** 사용
- 커밋 히스토리를 깔끔하게 유지합니다

---

## 코드 스타일

### TypeScript

```typescript
// ✅ 좋은 예
export interface PIIMatch {
  type: 'email' | 'phone' | 'ssn' | 'card';
  original: string;
  placeholder: string;
}

export class PIIDetector {
  private patterns: Map<string, RegExp>;
  
  constructor() {
    this.patterns = new Map();
  }
  
  detect(text: string): PIIMatch[] {
    // 명확한 로직
    const matches: PIIMatch[] = [];
    // ...
    return matches;
  }
}

// ❌ 나쁜 예
export class d {
  p: any;
  
  constructor() {
    this.p = {};
  }
  
  d(t: any): any {
    let m = [];
    // ...
    return m;
  }
}
```

### 명명 규칙

- **클래스/인터페이스**: PascalCase (`PIIDetector`, `VOCAnalyzer`)
- **함수/변수**: camelCase (`detectPII`, `sessionId`)
- **상수**: UPPER_SNAKE_CASE (`DEFAULT_TTL`, `MAX_RETRIES`)
- **파일**: kebab-case (`pii-detector.ts`, `error-resolver.ts`)

### 주석

```typescript
/**
 * 텍스트에서 PII를 감지하고 비식별화합니다.
 * 
 * @param text - 원본 텍스트
 * @param sessionId - 세션 식별자
 * @returns 비식별화된 텍스트와 매핑 정보
 * @throws {Error} sessionId가 유효하지 않을 때
 */
export function anonymize(text: string, sessionId: string): Result {
  // 구현
}
```

---

## 테스트

### 단위 테스트 (향후 추가 예정)

```typescript
// tests/pii-detector.test.ts
import { PIIDetector } from '../src/pii-detector';

describe('PIIDetector', () => {
  let detector: PIIDetector;
  
  beforeEach(() => {
    detector = new PIIDetector();
  });
  
  test('이메일 감지', () => {
    const text = 'Contact: john@example.com';
    const result = detector.detect(text);
    
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('email');
    expect(result[0].original).toBe('john@example.com');
  });
});
```

### 수동 테스트

```bash
# 1. 빌드
npm run build

# 2. 서버 개별 실행
node servers/pii-security-server/dist/index.js

# 3. Cursor에서 통합 테스트
```

---

## 이슈 등록

### 버그 리포트

1. GitHub Issues → New issue
2. "버그 리포트" 템플릿 선택
3. 재현 방법, 예상 동작, 실제 동작 기술
4. 환경 정보 포함 (OS, Node.js 버전 등)

### 기능 제안

1. GitHub Issues → New issue
2. "기능 제안" 템플릿 선택
3. 필요성, 제안 내용, 예상 효과 기술
4. 가능하면 구현 방안 제시

---

## 문의 및 지원

### 빠른 도움

- 💬 **GitHub Discussions**: 질문/아이디어 공유
- 📝 **GitHub Issues**: 버그/기능 요청
- 📧 **Email**: it-support@your-company.com

### 응답 시간

- 이슈: 1-3 영업일 이내
- PR 리뷰: 2-5 영업일 이내
- 긴급 이슈: 24시간 이내

---

## 행동 강령 (Code of Conduct)

### 우리의 약속

이 프로젝트와 커뮤니티는 **모든 사람**에게 열려 있습니다.

### 기대하는 행동

- ✅ 존중하고 친절한 태도
- ✅ 건설적인 비판
- ✅ 다양성 존중
- ✅ 커뮤니티 이익 우선

### 용납하지 않는 행동

- ❌ 차별적 언어/이미지
- ❌ 괴롭힘 또는 모욕
- ❌ 개인정보 무단 공개
- ❌ 부적절한 콘텐츠

위반 시 프로젝트 관리자가 적절한 조치를 취할 수 있습니다.

---

## 라이선스

이 프로젝트에 기여함으로써, 귀하의 기여가 프로젝트와 동일한 [MIT 라이선스](LICENSE) 하에 있음에 동의합니다.

---

**감사합니다!** 

여러분의 기여로 이 프로젝트가 더욱 발전합니다. 🚀

---

**마지막 업데이트**: 2026-01-07  
**버전**: 1.0.0

