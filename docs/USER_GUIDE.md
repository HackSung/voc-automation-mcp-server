# VOC 자동화 시스템 사용자 가이드

이 가이드는 VOC 처리 자동화 MCP 서버를 실전에서 활용하는 방법을 단계별로 안내합니다.

## 📋 목차

1. [시작하기 전에](#시작하기-전에)
2. [기본 사용법](#기본-사용법)
3. [고급 활용법](#고급-활용법)
4. [실전 시나리오](#실전-시나리오)
5. [베스트 프랙티스](#베스트-프랙티스)
6. [트러블슈팅](#트러블슈팅)
7. [FAQ](#faq)

---

## 시작하기 전에

### 필요한 것

✅ Cursor Editor 설치  
✅ Node.js 18 이상  
✅ Jira 계정 및 API 토큰  
✅ ~~OpenAI 또는 Anthropic API 키~~ **더 이상 필요 없음! (v2.0)**  
✅ 환경변수 설정 완료

> **🎉 v2.0 업데이트**: VOC 분석에 Cursor의 LLM을 사용하므로 별도 LLM API 키가 필요 없습니다!  

### 설치 확인

Cursor 채팅창에서 다음을 입력:

```
사용 가능한 MCP 도구를 모두 보여줘
```

**예상 결과**: 다음 도구들이 표시되어야 합니다.

#### PII Security Server (4개)
- `detectAndAnonymizePII` - 개인정보 감지 및 비식별화
- `restoreOriginalText` - 원문 복원
- `clearSession` - 세션 정리
- `getStats` - 통계 조회

#### VOC Analysis Server (5개) - **v2.0 업데이트**
- `generateVOCAnalysisPrompt` - VOC 분석 프롬프트 생성
- `parseVOCAnalysis` - 분석 결과 파싱
- `formatVOCAnalysis` - 결과 포맷팅
- `findSimilarIssues` - 유사 이슈 검색
- `indexIssue` - 이슈 인덱싱

#### Jira Integration Server (4개)
- `createJiraIssue` - Jira 이슈 생성
- `addComment` - 코멘트 추가
- `transitionIssue` - 상태 전환
- `getIssue` - 이슈 조회

#### Internal API Server (5개)
- `queryUserStatus` - 사용자 상태 조회
- `getErrorContext` - 에러 컨텍스트 조회
- `getErrorLogs` - 에러 로그 조회
- `searchErrorsByKeyword` - 키워드 검색
- `checkSystemHealth` - 헬스체크

---

## 기본 사용법

### 1단계: VOC 텍스트 준비

실제 고객이 보낸 VOC를 복사합니다:

```
제목: 로그인 안됨
내용: 안녕하세요. 오늘 아침부터 계속 로그인이 안되네요.
제 이메일은 kim.cheolsu@example.com이고 전화번호는 010-9876-5432입니다.
"Invalid credentials" 에러가 계속 뜹니다. 빨리 해결해주세요.
```

### 2단계: 기본 프롬프트 작성

Cursor 채팅창에 다음과 같이 입력:

```
다음 VOC를 처리해줘:

---
제목: 로그인 안됨
내용: 안녕하세요. 오늘 아침부터 계속 로그인이 안되네요.
제 이메일은 kim.cheolsu@example.com이고 전화번호는 010-9876-5432입니다.
"Invalid credentials" 에러가 계속 뜹니다. 빨리 해결해주세요.
---

처리 단계:
1. 개인정보 비식별화 (세션ID: voc-20260107-001)
2. VOC 분석 프롬프트 생성
3. 프롬프트로 VOC 분석 (Cursor LLM 사용)
4. 분석 결과 파싱
5. Jira 티켓 생성 (프로젝트: VOC)
6. 원문 복원해서 코멘트 추가
7. 세션 정리
```

### 3단계: 결과 확인

LLM이 자동으로 다음을 수행합니다:

1. **개인정보 감지**
   ```json
   {
     "이메일": "kim.cheolsu@example.com → [EMAIL_001]",
     "전화번호": "010-9876-5432 → [PHONE_001]"
   }
   ```

2. **VOC 분석**
   ```json
   {
     "의도": "complaint",
     "우선순위": "High",
     "카테고리": ["authentication", "login"],
     "감정": "negative"
   }
   ```

3. **Jira 티켓 생성**
   ```
   티켓 번호: VOC-456
   URL: https://your-company.atlassian.net/browse/VOC-456
   담당자: 인증팀 (자동 할당)
   ```

4. **완료 메시지**
   ```
   ✅ VOC 처리가 완료되었습니다.
   - 개인정보 2건 비식별화
   - 우선순위: High
   - Jira 티켓: VOC-456
   - 세션 정리 완료
   ```

---

## 고급 활용법

### 패턴 1: 중복 이슈 검사 후 티켓 생성

```
다음 VOC를 처리하되, 유사한 이슈가 있는지 먼저 확인해줘:

"로그인 페이지가 느려요. 로딩하는데 30초 이상 걸립니다."

단계:
1. 개인정보 비식별화 (세션: voc-20260107-002)
2. VOC 분석
3. 유사 이슈 검색 (topK: 5)
4. 유사도가 0.85 이상이면:
   - 기존 티켓에 코멘트만 추가
   - "중복 이슈입니다: VOC-XXX" 메시지
5. 유사도가 0.85 미만이면:
   - 새 티켓 생성
   - 새 이슈 인덱싱 (향후 중복 검사용)
6. 세션 정리
```

### 패턴 2: 에러 코드 분석 포함

```
다음 VOC를 에러 컨텍스트와 함께 분석해줘:

"결제가 안돼요. BILL_001 에러가 나옵니다. 
카드는 정상인데 왜 이러죠?"

단계:
1. 개인정보 비식별화
2. VOC 분석
3. BILL_001 에러 컨텍스트 조회
4. Jira 티켓 생성 시 에러 정보 포함:
   - 설명: "[원본 VOC]"
   - 에러 코드: BILL_001
   - 가능한 원인: [자동으로 조회된 원인들]
   - 해결 방법: [자동으로 조회된 해결 방법들]
5. 우선순위: Critical (결제 관련)
6. Teams 알림 전송
```

### 패턴 3: 사용자 상태 조회 포함

```
다음 VOC를 사용자 계정 상태와 함께 분석해줘:

"구독 취소했는데 아직도 과금되고 있어요. 
사용자 ID: USER-12345"

단계:
1. 개인정보 비식별화
2. 사용자 상태 조회 (userId: USER-12345, queryType: subscription)
3. 에러 로그 조회 (userId: USER-12345)
4. VOC 분석
5. Jira 티켓 생성 시 다음 정보 포함:
   - 현재 구독 상태
   - 최근 에러 로그
   - 취소 요청 내역
6. 우선순위: High (과금 문제)
7. 담당자: 결제팀 자동 할당
```

### 패턴 4: 배치 처리

```
다음 3개의 VOC를 한 번에 처리해줘:

VOC 1:
"다크모드 추가해주세요"
세션: voc-20260107-010

VOC 2:
"앱이 자주 멈춰요. 사용자 ID: USER-99999"
세션: voc-20260107-011
사용자 상태 조회 필요

VOC 3:
"로그인 안됨. AUTH_001 에러"
세션: voc-20260107-012
에러 컨텍스트 조회 필요

각 VOC마다:
1. 비식별화
2. 분석
3. Jira 티켓 생성
4. 세션 정리

완료 후 요약 테이블 만들어줘:
| VOC | 의도 | 우선순위 | Jira 티켓 | 처리 시간 |
```

---

## 실전 시나리오

### 시나리오 1: 긴급 장애 VOC

**상황**: Critical 버그 리포트

```
"긴급! 결제 시스템이 완전히 다운되었습니다! 
2시간 전부터 모든 고객이 결제를 못하고 있습니다.
에러 코드: BILL_001
담당자: admin@company.com / 010-1111-2222"

위 VOC를 긴급 처리해줘:
1. 비식별화 (세션: urgent-20260107-001)
2. 분석 (우선순위 강제: Critical)
3. BILL_001 에러 컨텍스트
4. Jira 티켓 생성:
   - 프로젝트: INCIDENT (긴급 프로젝트)
   - 타입: Bug
   - 라벨: ["urgent", "payment", "downtime"]
   - Teams 알림: 반드시 전송
5. 즉시 상태를 "In Progress"로 전환
6. 세션 정리
```

### 시나리오 2: 기능 요청 VOC

**상황**: 새로운 기능 제안

```
"대시보드에 CSV 내보내기 기능이 있으면 좋겠어요.
엑셀로 데이터를 분석하고 싶은데 현재는 일일이 복사해야 해서 불편합니다.
다른 경쟁사 제품들은 다 있는 기능인데 우리 제품에만 없네요."

위 VOC 처리:
1. 개인정보 없음 확인 (그래도 세션 생성: feature-20260107-001)
2. 분석
3. 유사한 기능 요청 검색 (중복 방지)
4. 유사 이슈가 없으면:
   - Jira 티켓 생성 (타입: Story)
   - 우선순위: Medium
   - 라벨: ["feature-request", "export", "dashboard"]
5. 유사 이슈가 있으면:
   - 기존 티켓에 "+1" 코멘트 추가
   - 투표수 증가
```

### 시나리오 3: 반복되는 문의

**상황**: FAQ에 있는 내용

```
"비밀번호를 어떻게 변경하나요?"

위 VOC는 자주 묻는 질문이에요:
1. 비식별화 (세션: faq-20260107-001)
2. 분석 (의도: question)
3. 유사 이슈 검색
4. 유사도 0.9 이상 이슈가 5개 이상이면:
   - Jira 티켓 생성하지 않음
   - 대신 메시지: "FAQ 문서 개선 필요"
   - 기존 티켓에 "또 다른 문의 발생" 코멘트
5. 그 외:
   - 일반 프로세스 진행
```

---

## 베스트 프랙티스

### ✅ DO (권장)

#### 1. 항상 고유한 세션 ID 사용

```
# 좋은 예
세션ID: voc-20260107-001
세션ID: voc-20260107-002
세션ID: urgent-20260107-001

# 나쁜 예
세션ID: test
세션ID: session1 (재사용)
```

**이유**: 세션 충돌 방지, 추적 용이

#### 2. 처리 후 반드시 세션 정리

```
# 좋은 예
6. 세션 정리 (clearSession)

# 나쁜 예
(세션 정리 없음) → 메모리 누수
```

**이유**: 메모리 관리, 보안

#### 3. 우선순위에 따라 알림 설정

```
# Critical/High: Teams 알림 전송
sendNotification: true

# Medium/Low: 알림 생략
sendNotification: false
```

**이유**: 알림 피로 방지

#### 4. 에러 코드가 있으면 컨텍스트 조회

```
VOC에 "AUTH_001", "BILL_002" 등이 있으면:
→ getErrorContext 도구 사용
→ Jira 티켓에 해결 방법 포함
```

**이유**: 빠른 문제 해결

#### 5. 중복 검사 적극 활용

```
새 티켓 생성 전:
→ findSimilarIssues 도구 사용
→ 유사도 0.85 이상이면 중복 처리
```

**이유**: Jira 티켓 폭증 방지

### ❌ DON'T (비권장)

#### 1. 세션 ID 재사용 금지

```
# 절대 안됨
첫 번째 VOC: 세션ID "test"
두 번째 VOC: 세션ID "test" (재사용) ← 충돌!
```

#### 2. PII 원문을 LLM에 직접 전달 금지

```
# 절대 안됨
"kim.cheolsu@example.com을 분석해줘"

# 올바른 방법
1. detectAndAnonymizePII 먼저 실행
2. 비식별화된 텍스트를 분석
```

#### 3. 비식별화 없이 Jira 티켓 생성 금지

```
# 위험
원문 그대로 Jira에 저장

# 올바른 방법
1. 비식별화
2. 비식별화된 텍스트로 분석
3. 원문 복원 후 Jira 저장
```

#### 4. 에러 무시하고 진행 금지

```
# 나쁜 예
Jira 티켓 생성 실패 → 무시하고 계속 진행

# 올바른 방법
에러 발생 시:
- 로그 확인
- 폴백 처리
- 사용자에게 알림
```

---

## 트러블슈팅

### 문제 1: "Unknown tool" 에러

**증상**:
```
Error: Unknown tool: detectAndAnonymizePII
```

**원인**: MCP 서버가 Cursor에 등록되지 않음

**해결**:
1. `~/.cursor/mcp.json` 파일 확인
2. 경로가 올바른지 확인
3. Cursor 완전 재시작
4. 빌드 완료 확인: `ls servers/*/dist/index.js`

### 문제 2: Jira API 에러

**증상**:
```
Error: Jira API error: 401 - Unauthorized
```

**원인**: Jira 인증 실패

**해결**:
1. `~/.cursor/mcp.json`의 `jira-integration` 설정의 `env`에 `JIRA_*` 값이 설정되어 있는지 확인
2. API 토큰 재발급:
   - https://id.atlassian.com/manage-profile/security/api-tokens
3. 이메일 주소 확인 (Jira 계정 이메일과 일치해야 함)

### 문제 3: LLM 응답이 이상함

**증상**:
```
분석 결과가 JSON이 아님
또는
의도가 이상하게 분류됨
```

**원인**: LLM 환각(Hallucination)

**해결**:
1. 프롬프트에 명확한 지시 추가:
   ```
   반드시 유효한 JSON으로만 응답해줘.
   의도는 bug_report, feature_request, question, complaint, feedback 중 하나여야 해.
   ```
2. 재시도 (한 번 더 요청)
3. 다른 LLM 모델 사용 (OpenAI ↔ Anthropic)

### 문제 4: 세션을 찾을 수 없음

**증상**:
```
Error: No mapping found for session: voc-20260107-001
```

**원인**: 세션 만료 (1시간 TTL) 또는 잘못된 세션 ID

**해결**:
1. 세션 생성 후 1시간 내에 복원
2. 세션 ID 오타 확인
3. 워크플로우를 처음부터 다시 시작

### 문제 5: 개인정보 감지 안됨

**증상**:
```
hasPII: false (실제로는 PII가 있음)
```

**원인**: 지원하지 않는 PII 형식

**현재 지원**:
- 이메일: `user@example.com`
- 전화번호: `010-1234-5678`, `01012345678`
- 주민번호: `123456-1234567`
- 카드번호: `1234-5678-9012-3456`

**해결**:
- PII 형식 확인
- 정규식 패턴 추가 필요 시 개발팀 문의

### 문제 6: 메모리 부족

**증상**:
```
JavaScript heap out of memory
```

**원인**: 세션 정리 안됨 (누적)

**해결**:
1. 모든 워크플로우 후 `clearSession` 실행
2. PII 서버 재시작:
   ```bash
   # Cursor 재시작하면 자동으로 재시작됨
   ```

---

## FAQ

### Q1: 영어 VOC도 처리 가능한가요?

**A**: 네, 가능합니다. LLM은 다국어를 지원하며, PII 패턴도 국제 형식을 일부 지원합니다.

```
VOC: "I can't login. My email is john@example.com"
→ 정상 처리
```

### Q2: Jira 프로젝트를 여러 개 사용할 수 있나요?

**A**: 네, `project` 파라미터를 변경하면 됩니다.

```
프로젝트: VOC (일반 VOC)
프로젝트: INCIDENT (긴급 장애)
프로젝트: FEATURE (기능 요청)
```

### Q3: 자동 담당자 할당이 안되면?

**A**: 두 가지 방법이 있습니다.

1. **환경변수 설정** (Jira Server/Data Center 기준 username):
   ```bash
   ASSIGNEE_AUTH=jira-username
   ```

2. **수동 지정**:
   ```
   assignee: "specific-jira-username"
   ```

### Q4: OpenAI 대신 Anthropic을 쓸 수 있나요?

**A**: 네, 환경변수만 변경하면 자동 전환됩니다.

```bash
# OpenAI 사용
OPENAI_API_KEY=sk-...

# Anthropic 사용
ANTHROPIC_API_KEY=sk-ant-...

# 둘 다 설정 시 OpenAI 우선
```

### Q5: 내부 API가 없는데 사용 가능한가요?

**A**: 네, Internal API Server는 선택 사항입니다. 없어도 다른 기능은 정상 동작합니다.

```bash
# internal-api를 쓰지 않으면 mcp.json env에서 제거하거나 주석 처리
# INTERNAL_API_BASE_URL=...
# INTERNAL_API_KEY=...
```

### Q6: VOC 대량 처리가 가능한가요?

**A**: 네, 배치 프롬프트를 사용하세요.

```
다음 VOC 10개를 처리해줘:
[VOC 목록...]

각 VOC마다 고유한 세션 ID 사용 (voc-20260107-001 ~ 010)
```

**주의**: LLM API 비용과 속도를 고려하세요.

### Q7: 처리 시간은 얼마나 걸리나요?

**A**: VOC 하나당 평균 10-30초

- 비식별화: ~1초
- 분석: ~5-10초 (LLM 호출)
- Jira 생성: ~2-5초
- 유사 이슈 검색: ~3-5초 (임베딩 포함)

**총**: 약 15-25초

### Q8: 로그는 어디서 확인하나요?

**A**: Cursor 로그 확인

```
Cursor 메뉴 → Help → Show Logs
```

검색 키워드:
- `[PIISecurityServer]`
- `[VOCAnalysisServer]`
- `[JiraIntegrationServer]`
- `[InternalAPIServer]`

### Q9: 보안 감사 대응은?

**A**: 다음 항목을 확인하세요:

1. ✅ PII 로그 미기록: `grep -r "010-" logs/` → 결과 없음
2. ✅ API 키 미노출: `grep -r "sk-" .` → 코드/문서에 실제 키가 없어야 함
3. ✅ 세션 TTL: 기본 1시간 (설정 가능)
4. ✅ HTTPS 통신: 모든 외부 API

### Q10: 업데이트는 어떻게 하나요?

**A**: 사내 Nexus에서 최신 버전 다운로드

```bash
# 1. 최신 버전 확인
npm view @your-company/voc-automation-mcp-server versions

# 2. 업데이트
npm update @your-company/voc-automation-mcp-server

# 3. 재빌드
npm run build

# 4. Cursor 재시작
```

---

## 추가 자료

### 학습 자료

1. **[예제 프롬프트](../examples/cursor-prompts.md)**: 복사해서 바로 사용 가능한 프롬프트 모음
2. **[샘플 VOC](../examples/sample-voc.json)**: 5가지 VOC 유형별 예제
3. **[API 명세서](API.md)**: 모든 Tool의 상세 스펙

### 참고 문서

- [Jira REST API v2 공식 문서](https://developer.atlassian.com/cloud/jira/platform/rest/v2/)
- [OpenAI API 공식 문서](https://platform.openai.com/docs/api-reference)
- [Anthropic Claude API 공식 문서](https://docs.anthropic.com/claude/reference)
- [MCP 프로토콜 문서](https://modelcontextprotocol.io/)

### 지원 채널

- 📧 이메일: it-support@your-company.com
- 💬 Slack: #voc-automation
- 📝 Jira: IT-SUPPORT 프로젝트
- 🔔 긴급: 내선 1234

---

**마지막 업데이트**: 2026-01-07  
**버전**: 1.0.0  
**작성자**: VOC Automation Team

