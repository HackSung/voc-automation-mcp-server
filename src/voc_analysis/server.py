"""VOC Analysis MCP Server.

VOC 분석 프롬프트 생성 및 LLM 응답 파싱을 담당하는 MCP 서버입니다.
Cursor의 LLM을 활용하므로 별도 API 키가 필요 없습니다.
(유사 이슈 검색 기능은 OpenAI API 키 필요)
"""

import json

from fastmcp import FastMCP

from shared.config import get_env_config
from shared.logger import get_logger

from .parser import ResultParser
from .prompts import PromptGenerator
from .similarity import SimilaritySearch

logger = get_logger("VOCAnalysisServer")

# 설정 로드
config = get_env_config()

# FastMCP 서버 생성
mcp = FastMCP("voc-analysis-server")

# 컴포넌트 초기화
prompt_generator = PromptGenerator()
result_parser = ResultParser()

# 유사 검색은 OpenAI API 키가 있을 때만 활성화
similarity_search: SimilaritySearch | None = None
if config.llm.openai_key:
    similarity_search = SimilaritySearch(config.llm.openai_key)
    logger.info("Similarity search enabled (OpenAI API key found)")
else:
    logger.info("Similarity search disabled (no OpenAI API key)")


# =============================================================================
# Resources: 프롬프트 템플릿 노출
# =============================================================================


@mcp.resource("prompt://voc/intent-classification")
def get_intent_prompt() -> str:
    """VOC Intent Classification Prompt template."""
    return prompt_generator.get_prompt_template("intent")


@mcp.resource("prompt://voc/priority-evaluation")
def get_priority_prompt() -> str:
    """VOC Priority Evaluation Prompt template."""
    return prompt_generator.get_prompt_template("priority")


@mcp.resource("prompt://voc/category-extraction")
def get_category_prompt() -> str:
    """VOC Category Extraction Prompt template."""
    return prompt_generator.get_prompt_template("category")


@mcp.resource("prompt://voc/sentiment-analysis")
def get_sentiment_prompt() -> str:
    """VOC Sentiment Analysis Prompt template."""
    return prompt_generator.get_prompt_template("sentiment")


@mcp.resource("prompt://voc/summary-generation")
def get_summary_prompt() -> str:
    """VOC Summary Generation Prompt template."""
    return prompt_generator.get_prompt_template("summary")


# =============================================================================
# Tools: 프롬프트 생성 및 결과 파싱
# =============================================================================


@mcp.tool()
def generateVOCAnalysisPrompt(vocText: str) -> str:
    """Generate a unified prompt for VOC analysis.

    Use this prompt with Cursor's LLM (Claude/GPT) to analyze customer feedback.
    Returns a single comprehensive prompt that extracts intent, priority,
    category, sentiment, and summary.

    Args:
        vocText: The VOC text to analyze (should be anonymized first)

    Returns:
        Generated analysis prompt with instructions
    """
    if not vocText:
        raise ValueError("Missing required parameter: vocText")

    prompt = prompt_generator.generate_unified_analysis_prompt(vocText)

    return f"""✅ **VOC Analysis Prompt Generated**

Use this prompt with your LLM (Claude/GPT) to analyze the VOC:

---

{prompt}

---

**Instructions:**
1. Copy the prompt above
2. Send it to your LLM
3. Copy the LLM's response
4. Use `parseVOCAnalysis` tool to parse the response

**Note:** The prompt is optimized to return structured JSON that can be parsed automatically."""


@mcp.tool()
def parseVOCAnalysis(llmResponse: str) -> dict:
    """Parse the LLM response from VOC analysis prompt.

    Validates and structures the analysis result into a standardized format.

    Args:
        llmResponse: The raw response from LLM (JSON format expected)

    Returns:
        Parsed and validated analysis result containing intent, priority,
        category, sentiment, and summary
    """
    if not llmResponse:
        raise ValueError("Missing required parameter: llmResponse")

    return result_parser.parse_unified_analysis(llmResponse)


@mcp.tool()
def formatVOCAnalysis(analysisResult: str) -> str:
    """Format a parsed VOC analysis result into a human-readable summary.

    Useful for displaying analysis results to users.

    Args:
        analysisResult: The parsed VOC analysis result (JSON string)

    Returns:
        Human-readable formatted summary
    """
    if not analysisResult:
        raise ValueError("Missing required parameter: analysisResult")

    result = json.loads(analysisResult)
    return result_parser.format_analysis_summary(result)


# 유사 이슈 검색 도구 (OpenAI API 키가 있을 때만 등록)
if similarity_search:

    @mcp.tool()
    def findSimilarIssues(vocText: str, topK: int = 5) -> dict:
        """Find similar Jira issues using embedding-based similarity search.

        Helps detect duplicate VOCs. Requires OpenAI API key.

        Args:
            vocText: The VOC text to find similar issues for
            topK: Number of similar issues to return (default: 5)

        Returns:
            Dictionary containing similarIssues list and count
        """
        if not vocText:
            raise ValueError("Missing required parameter: vocText")

        similar_issues = similarity_search.find_similar_issues(vocText, topK)

        return {
            "similarIssues": [
                {
                    "jiraKey": issue.jira_key,
                    "similarity": issue.similarity,
                    "summary": issue.summary,
                }
                for issue in similar_issues
            ],
            "count": len(similar_issues),
        }

    @mcp.tool()
    def indexIssue(jiraKey: str, summary: str) -> dict:
        """Index a Jira issue for similarity search.

        Call this after creating a new issue.

        Args:
            jiraKey: Jira issue key (e.g., 'VOC-123')
            summary: Issue summary/title

        Returns:
            Dictionary containing indexed flag and jiraKey
        """
        if not jiraKey or not summary:
            raise ValueError("Missing required parameters: jiraKey, summary")

        similarity_search.index_issue(jiraKey, summary)

        return {
            "indexed": True,
            "jiraKey": jiraKey,
        }


def main() -> None:
    """MCP 서버를 시작합니다."""
    logger.info("VOC Analysis Server v2.0 started on stdio")
    logger.info("Using Cursor LLM integration (no external API keys needed for analysis)")

    # stdio transport로 실행
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
