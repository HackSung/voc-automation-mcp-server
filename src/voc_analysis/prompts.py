"""VOC 분석 프롬프트 생성 모듈."""

from shared.logger import get_logger

logger = get_logger("PromptGenerator")


# 개별 프롬프트 템플릿
INTENT_CLASSIFICATION_PROMPT = """You are a VOC (Voice of Customer) analyst. Classify the intent of the following customer feedback.

**Intent Types:**
- bug_report: Customer reports a software bug, error, or malfunction
- feature_request: Customer requests a new feature or enhancement
- question: Customer asks a question or seeks clarification
- complaint: Customer expresses dissatisfaction or frustration
- feedback: General feedback or suggestions

**VOC Text:**
---
{vocText}
---

**Output Format (JSON only):**
```json
{{
  "type": "bug_report" | "feature_request" | "question" | "complaint" | "feedback",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation"
}}
```

Respond with JSON only:"""

PRIORITY_EVALUATION_PROMPT = """You are a VOC (Voice of Customer) analyst. Evaluate the priority of the following customer feedback.

**Priority Levels:**
- Critical: System down, data loss, security issue, affecting all users
- High: Major functionality broken, affecting many users
- Medium: Moderate impact, workaround available
- Low: Minor issue, cosmetic, nice-to-have

**VOC Text:**
---
{vocText}
---

**Output Format (JSON only):**
```json
{{
  "level": "Critical" | "High" | "Medium" | "Low",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "affectedUsers": "all" | "many" | "some" | "few"
}}
```

Respond with JSON only:"""

CATEGORY_EXTRACTION_PROMPT = """You are a VOC (Voice of Customer) analyst. Extract categories from the following customer feedback.

**Common Categories:**
authentication, login, billing, payment, performance, ui/ux, data, api, security, mobile, notification, search, etc.

**VOC Text:**
---
{vocText}
---

**Output Format (JSON only):**
```json
{{
  "categories": ["category1", "category2"],
  "primary": "most_relevant_category"
}}
```

Respond with JSON only:"""

SENTIMENT_ANALYSIS_PROMPT = """You are a VOC (Voice of Customer) analyst. Analyze the sentiment of the following customer feedback.

**Sentiment Types:**
- negative: Angry, frustrated, disappointed (-1.0 to -0.1)
- neutral: Factual, informative (0.0)
- positive: Happy, satisfied, grateful (0.1 to 1.0)

**VOC Text:**
---
{vocText}
---

**Output Format (JSON only):**
```json
{{
  "type": "negative" | "neutral" | "positive",
  "score": -1.0 to 1.0,
  "reasoning": "Brief explanation"
}}
```

Respond with JSON only:"""

SUMMARY_GENERATION_PROMPT = """You are a VOC (Voice of Customer) analyst. Generate a concise summary of the following customer feedback.

**VOC Text:**
---
{vocText}
---

**Output Format:**
Generate a 1-2 sentence clear and actionable summary suitable for a Jira ticket title.

Respond with the summary text only:"""


class PromptGenerator:
    """VOC 분석 프롬프트 생성기."""

    def __init__(self) -> None:
        logger.info("PromptGenerator initialized")

    def generate_unified_analysis_prompt(self, voc_text: str) -> str:
        """통합 VOC 분석 프롬프트를 생성합니다.

        5가지 분석 (의도, 우선순위, 카테고리, 감정, 요약)을
        1회 LLM 호출로 처리할 수 있는 통합 프롬프트입니다.

        Args:
            voc_text: 분석할 VOC 텍스트 (비식별화된 텍스트 권장)

        Returns:
            통합 분석 프롬프트
        """
        logger.debug("Generating unified VOC analysis prompt")

        return f"""You are a VOC (Voice of Customer) analyst. Analyze the given customer feedback comprehensively.

**Your Task:**
Analyze the VOC text and provide:
1. Intent classification
2. Priority evaluation
3. Category extraction
4. Sentiment analysis
5. Summary generation

**Intent Types:**
- bug_report: Customer reports a software bug, error, or malfunction
- feature_request: Customer requests a new feature or enhancement
- question: Customer asks a question or seeks clarification
- complaint: Customer expresses dissatisfaction or frustration
- feedback: General feedback or suggestions

**Priority Levels:**
- Critical: System down, data loss, security issue, affecting all users
- High: Major functionality broken, affecting many users
- Medium: Moderate impact, workaround available
- Low: Minor issue, cosmetic, nice-to-have

**Common Categories:**
authentication, login, billing, payment, performance, ui/ux, data, api, security, mobile, notification, search, etc.

**Sentiment:**
- negative: Angry, frustrated, disappointed (-1.0 to -0.1)
- neutral: Factual, informative (0.0)
- positive: Happy, satisfied, grateful (0.1 to 1.0)

**Output Format (JSON only):**
```json
{{
  "intent": {{
    "type": "bug_report" | "feature_request" | "question" | "complaint" | "feedback",
    "confidence": 0.0-1.0,
    "reasoning": "Brief explanation"
  }},
  "priority": {{
    "level": "Critical" | "High" | "Medium" | "Low",
    "confidence": 0.0-1.0,
    "reasoning": "Brief explanation",
    "affectedUsers": "all" | "many" | "some" | "few"
  }},
  "category": {{
    "categories": ["category1", "category2"],
    "primary": "most_relevant_category"
  }},
  "sentiment": {{
    "type": "negative" | "neutral" | "positive",
    "score": -1.0 to 1.0,
    "reasoning": "Brief explanation"
  }},
  "summary": "1-2 sentence clear and actionable summary for Jira ticket"
}}
```

**VOC Text:**
---
{voc_text}
---

**Instructions:**
1. Read the VOC text carefully
2. Analyze all aspects (intent, priority, category, sentiment)
3. Generate a concise summary
4. Return ONLY valid JSON in the format specified above

Respond with JSON only:"""

    def generate_analysis_prompts(self, voc_text: str) -> dict[str, str]:
        """개별 분석 프롬프트를 생성합니다.

        Args:
            voc_text: 분석할 VOC 텍스트

        Returns:
            각 분석 유형별 프롬프트 딕셔너리
        """
        logger.debug("Generating individual VOC analysis prompts")

        return {
            "intent": INTENT_CLASSIFICATION_PROMPT.format(vocText=voc_text),
            "priority": PRIORITY_EVALUATION_PROMPT.format(vocText=voc_text),
            "category": CATEGORY_EXTRACTION_PROMPT.format(vocText=voc_text),
            "sentiment": SENTIMENT_ANALYSIS_PROMPT.format(vocText=voc_text),
            "summary": SUMMARY_GENERATION_PROMPT.format(vocText=voc_text),
        }

    def get_prompt_template(
        self, prompt_type: str
    ) -> str:
        """프롬프트 템플릿을 반환합니다.

        Args:
            prompt_type: 프롬프트 유형 (intent, priority, category, sentiment, summary)

        Returns:
            프롬프트 템플릿

        Raises:
            ValueError: 알 수 없는 프롬프트 유형
        """
        templates = {
            "intent": INTENT_CLASSIFICATION_PROMPT,
            "priority": PRIORITY_EVALUATION_PROMPT,
            "category": CATEGORY_EXTRACTION_PROMPT,
            "sentiment": SENTIMENT_ANALYSIS_PROMPT,
            "summary": SUMMARY_GENERATION_PROMPT,
        }

        if prompt_type not in templates:
            raise ValueError(f"Unknown prompt type: {prompt_type}")

        return templates[prompt_type]
