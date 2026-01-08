# VOC 자동화 시스템 v2.0 사용 예제

## 🎉 새로운 기능: Cursor LLM 통합

v2.0부터는 **별도의 LLM API 키 없이** Cursor에 연동된 LLM을 직접 활용합니다!

## 기본 워크플로우

### 1️⃣ VOC 텍스트 준비

```
고객 VOC:
"로그인이 안돼요. 이메일은 hong.gildong@example.com이고 
전화번호는 010-1234-5678입니다. AUTH_001 에러가 계속 나와요."
```

### 2️⃣ Cursor 채팅창에 입력

```
다음 VOC를 처리해줘:

"로그인이 안돼요. 이메일은 hong.gildong@example.com이고 
전화번호는 010-1234-5678입니다. AUTH_001 에러가 계속 나와요."

🔒 처리 순서 (개인정보 보호 필수!):
1. 개인정보 비식별화 (세션: voc-20260108-001)
   → anonymizedText 저장
2. VOC 분석 프롬프트 생성
   ⚠️ 반드시 anonymizedText 사용!
3. 생성된 프롬프트로 분석 수행 (LLM에 개인정보 미전송)
4. 분석 결과 파싱
5. AUTH_001 에러 컨텍스트 조회
6. Jira 티켓 생성 (프로젝트: VOC)
7. 원문 복원해서 Jira 코멘트 추가 (안전한 저장소에만)
8. 세션 정리 (메모리에서 완전 삭제)
```

### 3️⃣ 실행 과정

Cursor의 LLM이 다음과 같이 자동으로 처리합니다:

#### Step 1: 개인정보 비식별화
```
Tool: detectAndAnonymizePII
Input:
  - text: "로그인이 안돼요. 이메일은 hong.gildong@example.com..."
  - sessionId: "voc-20260108-001"

Output:
  - anonymizedText: "로그인이 안돼요. 이메일은 [EMAIL_1]이고 전화번호는 [PHONE_1]입니다..."
  - detectedPII: [
      { type: "email", original: "hong.gildong@example.com", placeholder: "[EMAIL_1]" },
      { type: "phone", original: "010-1234-5678", placeholder: "[PHONE_1]" }
    ]
```

#### Step 2: VOC 분석 프롬프트 생성

⚠️ **중요: 반드시 익명화된 텍스트(anonymizedText)를 사용하세요!**

```
Tool: generateVOCAnalysisPrompt
Input:
  - vocText: "로그인이 안돼요. 이메일은 [EMAIL_1]이고..."  # ← Step 1의 anonymizedText 사용!

Output:
  - prompt: "You are a VOC analyst. Analyze the given customer feedback..."
```

❌ **잘못된 예시 - 개인정보 유출!**
```
Tool: generateVOCAnalysisPrompt
Input:
  - vocText: "로그인이 안돼요. 이메일은 hong.gildong@example.com이고..."  # ← 원본 사용 금지!
```

#### Step 3: Cursor LLM으로 분석
Cursor가 생성된 프롬프트를 자신의 LLM에게 전달하여 분석합니다.

```json
{
  "intent": {
    "type": "bug_report",
    "confidence": 0.95,
    "reasoning": "Customer reports authentication error preventing login"
  },
  "priority": {
    "level": "High",
    "confidence": 0.9,
    "reasoning": "Login functionality is critical, affecting user access",
    "affectedUsers": "some"
  },
  "category": {
    "categories": ["authentication", "login"],
    "primary": "authentication"
  },
  "sentiment": {
    "type": "negative",
    "score": -0.7,
    "reasoning": "Frustrated tone, repeated error occurrence"
  },
  "summary": "User unable to login due to AUTH_001 error. Email and phone provided for contact."
}
```

#### Step 4: 분석 결과 파싱
```
Tool: parseVOCAnalysis
Input:
  - llmResponse: "{ \"intent\": { \"type\": \"bug_report\"... }"

Output:
  - intent: "bug_report"
  - priority: "High"
  - primaryCategory: "authentication"
  - sentiment: "negative"
  - sentimentScore: -0.7
  - summary: "User unable to login due to AUTH_001 error..."
```

#### Step 5: 에러 컨텍스트 조회
```
Tool: getErrorContext
Input:
  - errorCode: "AUTH_001"

Output:
  - errorDescription: "Invalid credentials or expired session"
  - possibleCauses: [
      "User password changed recently",
      "Session expired (timeout)",
      "Account locked due to multiple failed attempts"
    ]
  - resolutionSteps: [
      "Ask user to reset password",
      "Clear browser cookies and cache",
      "Check if account is locked in admin panel"
    ]
```

#### Step 6: Jira 티켓 생성
```
Tool: createJiraIssue
Input:
  - project: "VOC"
  - issueType: "Bug"
  - summary: "User unable to login due to AUTH_001 error"
  - description: "Customer reports repeated authentication failures..."
  - priority: "High"
  - category: "authentication"
  - notifyTeams: true

Output:
  - key: "VOC-123"
  - url: "https://your-company.atlassian.net/browse/VOC-123"
  - assignee: "auth-team-account-id"
  - teamsNotificationSent: true
```

#### Step 7: 원문 복원 및 코멘트 추가
```
Tool: restoreOriginalText
Input:
  - anonymizedText: "로그인이 안돼요. 이메일은 [EMAIL_1]..."
  - sessionId: "voc-20260108-001"

Output:
  - originalText: "로그인이 안돼요. 이메일은 hong.gildong@example.com..."

Tool: addComment
Input:
  - issueKey: "VOC-123"
  - comment: "원문:\n로그인이 안돼요. 이메일은 hong.gildong@example.com..."
```

#### Step 8: 세션 정리
```
Tool: clearSession
Input:
  - sessionId: "voc-20260108-001"

Output:
  - cleared: true
```

### 4️⃣ 최종 결과

```json
{
  "vocProcessed": true,
  "sessionId": "voc-20260108-001",
  "piiDetected": {
    "email": 1,
    "phone": 1
  },
  "analysis": {
    "intent": "bug_report",
    "priority": "High",
    "category": ["authentication", "login"],
    "sentiment": "negative",
    "confidence": 0.95
  },
  "errorContext": {
    "code": "AUTH_001",
    "description": "Invalid credentials or expired session"
  },
  "jiraTicket": {
    "key": "VOC-123",
    "url": "https://your-company.atlassian.net/browse/VOC-123",
    "assignee": "auth-team-id"
  },
  "teamsNotificationSent": true,
  "sessionCleared": true
}
```

## 주요 변경사항 (v1.0 → v2.0)

### v1.0 (이전)
```
❌ 별도 OpenAI/Anthropic API 키 필요
❌ 외부 API 호출로 비용 발생
❌ API 키 관리 부담
```

### v2.0 (현재)
```
✅ Cursor의 LLM 사용 (API 키 불필요)
✅ 비용 효율적
✅ 설정 간소화
✅ MCP 표준 준수
```

## 새로운 도구

### 1. generateVOCAnalysisPrompt
VOC 분석을 위한 최적화된 프롬프트를 생성합니다.

```
Input: { vocText: "고객 의견..." }
Output: "You are a VOC analyst. Analyze..."
```

### 2. parseVOCAnalysis
LLM의 분석 결과를 구조화된 데이터로 파싱합니다.

```
Input: { llmResponse: "{ \"intent\": ... }" }
Output: { intent: "bug_report", priority: "High", ... }
```

### 3. formatVOCAnalysis
분석 결과를 사람이 읽기 쉬운 형식으로 포맷합니다.

```
Input: { analysisResult: "{ ... }" }
Output: "📊 VOC Analysis Result\n**Intent:** bug_report..."
```

## 리소스 (프롬프트 템플릿)

v2.0에서는 프롬프트 템플릿을 MCP 리소스로 노출합니다:

- `prompt://voc/intent-classification` - 의도 분류 프롬프트
- `prompt://voc/priority-evaluation` - 우선순위 평가 프롬프트
- `prompt://voc/category-extraction` - 카테고리 추출 프롬프트
- `prompt://voc/sentiment-analysis` - 감정 분석 프롬프트
- `prompt://voc/summary-generation` - 요약 생성 프롬프트

## 환경 설정

### v2.0에서 필수 환경변수

```bash
# Jira (필수)
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-jira-api-token

# LLM API (선택 - 임베딩 검색용만)
OPENAI_API_KEY=sk-...  # findSimilarIssues 기능만 사용 시 필요

# 내부 API (선택)
INTERNAL_API_BASE_URL=https://internal-api.company.com
INTERNAL_API_KEY=your-api-key
```

### v2.0에서 불필요한 환경변수

```bash
# ❌ 더 이상 필요 없음
# ANTHROPIC_API_KEY=...  (VOC 분석에 사용 안 함)
```

## 마이그레이션 가이드 (v1.0 → v2.0)

### 1. 코드 변경 없음
기존 프롬프트를 그대로 사용할 수 있습니다. Cursor가 자동으로 새로운 워크플로우를 처리합니다.

### 2. 환경변수 정리
```bash
# .env 파일에서 제거 가능 (선택사항)
# ANTHROPIC_API_KEY=...
```

### 3. 더 나은 성능
Cursor의 최신 LLM 모델을 자동으로 사용하므로 분석 품질이 향상됩니다.

## 문제 해결

### Q: "Tool not found: analyzeVOC"
A: v2.0에서는 `analyzeVOC` 대신 `generateVOCAnalysisPrompt` + `parseVOCAnalysis`를 사용합니다.

### Q: 분석 결과가 파싱되지 않음
A: LLM이 JSON 형식으로 응답했는지 확인하세요. `formatVOCAnalysis`로 결과를 확인할 수 있습니다.

### Q: 임베딩 검색이 작동하지 않음
A: `findSimilarIssues`는 여전히 OpenAI API 키가 필요합니다. `.env`에 `OPENAI_API_KEY`를 설정하세요.

## 추가 리소스

- [전체 문서](docs/USER_GUIDE.md)
- [API 명세서](docs/API.md)
- [예제 프롬프트](examples/cursor-prompts.md)
- [GitHub 저장소](https://github.com/HackSung/voc-automation-mcp-server)

