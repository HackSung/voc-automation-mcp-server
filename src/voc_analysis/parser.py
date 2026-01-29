"""VOC 분석 결과 파서."""

import json
import re
from typing import Any

from shared.logger import get_logger

logger = get_logger("ResultParser")


class ResultParser:
    """LLM 응답을 파싱하여 구조화된 분석 결과로 변환."""

    def __init__(self) -> None:
        logger.info("ResultParser initialized")

    def parse_unified_analysis(self, llm_response: str) -> dict[str, Any]:
        """통합 분석 LLM 응답을 파싱합니다.

        Args:
            llm_response: LLM의 JSON 응답

        Returns:
            구조화된 분석 결과

        Raises:
            ValueError: JSON 파싱 실패 시
        """
        logger.debug("Parsing unified VOC analysis response")

        # JSON 추출 (마크다운 코드 블록 지원)
        json_str = self._extract_json(llm_response)

        try:
            result = json.loads(json_str)
        except json.JSONDecodeError as e:
            logger.error("Failed to parse JSON", e)
            raise ValueError(f"Invalid JSON response: {e}") from e

        # 필수 필드 검증
        required_fields = ["intent", "priority", "category", "sentiment", "summary"]
        for field in required_fields:
            if field not in result:
                logger.warn(f"Missing field in response: {field}")
                result[field] = self._get_default_value(field)

        # 값 정규화
        result = self._normalize_result(result)

        logger.info("VOC analysis parsed successfully")
        return result

    def _extract_json(self, text: str) -> str:
        """텍스트에서 JSON을 추출합니다.

        마크다운 코드 블록 (```json ... ```) 지원.

        Args:
            text: LLM 응답 텍스트

        Returns:
            추출된 JSON 문자열
        """
        # 마크다운 코드 블록 패턴
        code_block_pattern = r"```(?:json)?\s*\n?([\s\S]*?)\n?```"
        match = re.search(code_block_pattern, text)

        if match:
            return match.group(1).strip()

        # 중괄호로 감싸진 JSON 패턴
        json_pattern = r"\{[\s\S]*\}"
        match = re.search(json_pattern, text)

        if match:
            return match.group(0)

        # 그대로 반환 (JSON으로 시도)
        return text.strip()

    def _get_default_value(self, field: str) -> Any:
        """필드별 기본값을 반환합니다."""
        defaults: dict[str, Any] = {
            "intent": {
                "type": "feedback",
                "confidence": 0.5,
                "reasoning": "Unable to classify",
            },
            "priority": {
                "level": "Medium",
                "confidence": 0.5,
                "reasoning": "Unable to evaluate",
                "affectedUsers": "some",
            },
            "category": {
                "categories": ["general"],
                "primary": "general",
            },
            "sentiment": {
                "type": "neutral",
                "score": 0.0,
                "reasoning": "Unable to analyze",
            },
            "summary": "VOC summary unavailable",
        }
        return defaults.get(field, None)

    def _normalize_result(self, result: dict[str, Any]) -> dict[str, Any]:
        """결과값을 정규화합니다."""
        # Intent 정규화
        if "intent" in result and isinstance(result["intent"], dict):
            intent = result["intent"]
            valid_types = ["bug_report", "feature_request", "question", "complaint", "feedback"]
            if intent.get("type") not in valid_types:
                intent["type"] = "feedback"
            intent["confidence"] = self._clamp(intent.get("confidence", 0.5), 0.0, 1.0)

        # Priority 정규화
        if "priority" in result and isinstance(result["priority"], dict):
            priority = result["priority"]
            valid_levels = ["Critical", "High", "Medium", "Low"]
            if priority.get("level") not in valid_levels:
                priority["level"] = "Medium"
            priority["confidence"] = self._clamp(priority.get("confidence", 0.5), 0.0, 1.0)

        # Category 정규화
        if "category" in result and isinstance(result["category"], dict):
            category = result["category"]
            if not isinstance(category.get("categories"), list):
                category["categories"] = ["general"]
            if not category.get("primary"):
                category["primary"] = (
                    category["categories"][0] if category["categories"] else "general"
                )

        # Sentiment 정규화
        if "sentiment" in result and isinstance(result["sentiment"], dict):
            sentiment = result["sentiment"]
            valid_types = ["negative", "neutral", "positive"]
            if sentiment.get("type") not in valid_types:
                sentiment["type"] = "neutral"
            sentiment["score"] = self._clamp(sentiment.get("score", 0.0), -1.0, 1.0)

        # Summary 정규화
        if not result.get("summary") or not isinstance(result["summary"], str):
            result["summary"] = "VOC summary unavailable"

        return result

    def _clamp(self, value: float, min_val: float, max_val: float) -> float:
        """값을 범위 내로 제한합니다."""
        try:
            return max(min_val, min(float(value), max_val))
        except (TypeError, ValueError):
            return (min_val + max_val) / 2

    def format_analysis_summary(self, result: dict[str, Any]) -> str:
        """분석 결과를 사람이 읽기 좋은 형식으로 포맷합니다.

        Args:
            result: 파싱된 분석 결과

        Returns:
            포맷된 요약 문자열
        """
        intent = result.get("intent", {})
        priority = result.get("priority", {})
        category = result.get("category", {})
        sentiment = result.get("sentiment", {})
        summary = result.get("summary", "N/A")

        return f"""📊 **VOC 분석 결과**

**의도 (Intent)**
- 유형: {intent.get("type", "N/A")}
- 신뢰도: {intent.get("confidence", 0):.0%}
- 근거: {intent.get("reasoning", "N/A")}

**우선순위 (Priority)**
- 레벨: {priority.get("level", "N/A")}
- 신뢰도: {priority.get("confidence", 0):.0%}
- 영향 범위: {priority.get("affectedUsers", "N/A")}
- 근거: {priority.get("reasoning", "N/A")}

**카테고리 (Category)**
- 주요: {category.get("primary", "N/A")}
- 전체: {", ".join(category.get("categories", []))}

**감정 (Sentiment)**
- 유형: {sentiment.get("type", "N/A")}
- 점수: {sentiment.get("score", 0):.2f}
- 근거: {sentiment.get("reasoning", "N/A")}

**요약**
{summary}
"""
