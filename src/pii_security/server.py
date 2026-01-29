"""PII Security MCP Server.

개인정보를 감지하고 비식별화하는 MCP 서버입니다.
LLM에 전송되기 전에 개인정보를 자동으로 마스킹하고,
안전한 저장소(Jira 등)에 저장할 때만 원본을 복원합니다.
"""

import signal
import sys

from fastmcp import FastMCP

from shared.config import get_env_config
from shared.logger import get_logger

from .detector import PIIDetector
from .store import PIIMappingStore

logger = get_logger("PIISecurityServer")

# 설정 로드
config = get_env_config()

# FastMCP 서버 생성
mcp = FastMCP("pii-security-server")

# 컴포넌트 초기화
detector = PIIDetector()
store = PIIMappingStore(ttl_ms=config.pii.session_ttl)


@mcp.tool()
def detectAndAnonymizePII(text: str, sessionId: str) -> dict:
    """Detects and anonymizes PII (email, phone, SSN, credit card) in text.

    Stores mapping for later restoration. Returns anonymized text safe for LLM processing.

    Args:
        text: Original text containing potential PII
        sessionId: Unique session identifier for mapping storage (e.g., UUID)

    Returns:
        Dictionary containing anonymizedText, detectedPII list, hasPII flag, and sessionId
    """
    if not text or not sessionId:
        raise ValueError("Missing required parameters: text, sessionId")

    # PII 감지
    detected_pii = detector.detect(text)

    # 비식별화
    anonymized_text, mappings = detector.anonymize(text, detected_pii)

    # 매핑 저장
    store.store_mappings(sessionId, mappings)

    logger.info(
        "PII anonymization completed",
        {
            "sessionId": sessionId,
            "detectedCount": len(detected_pii),
            "hasPII": len(detected_pii) > 0,
        },
    )

    return {
        "anonymizedText": anonymized_text,
        "detectedPII": [
            {
                "type": pii.type,
                "placeholder": pii.placeholder,
                "position": {"start": pii.position[0], "end": pii.position[1]},
            }
            for pii in detected_pii
        ],
        "hasPII": len(detected_pii) > 0,
        "sessionId": sessionId,
    }


@mcp.tool()
def restoreOriginalText(anonymizedText: str, sessionId: str) -> dict:
    """Restores anonymized text to original form using session mapping.

    Use this before storing data in external systems (e.g., Jira).

    Args:
        anonymizedText: Text with PII placeholders
        sessionId: Session identifier used during anonymization

    Returns:
        Dictionary containing originalText, restoredCount, and sessionId
    """
    if not anonymizedText or not sessionId:
        raise ValueError("Missing required parameters: anonymizedText, sessionId")

    mappings = store.retrieve(sessionId)
    if mappings is None:
        raise ValueError(f"No mapping found for session: {sessionId}")

    original_text = detector.restore(anonymizedText, mappings)

    logger.info(
        "PII restoration completed",
        {"sessionId": sessionId, "restoredCount": len(mappings)},
    )

    return {
        "originalText": original_text,
        "restoredCount": len(mappings),
        "sessionId": sessionId,
    }


@mcp.tool()
def clearSession(sessionId: str) -> dict:
    """Manually clears PII mapping data for a session.

    Useful after workflow completion.

    Args:
        sessionId: Session identifier to clear

    Returns:
        Dictionary containing cleared flag and sessionId
    """
    if not sessionId:
        raise ValueError("Missing required parameter: sessionId")

    store.clear_session(sessionId)

    return {
        "cleared": True,
        "sessionId": sessionId,
    }


@mcp.tool()
def getStats() -> dict:
    """Returns statistics about the PII mapping store.

    Returns:
        Dictionary containing totalSessions and ttlSeconds
    """
    return store.get_stats()


def main() -> None:
    """MCP 서버를 시작합니다."""
    logger.info("PII Security Server started on stdio")

    # Graceful shutdown 핸들러
    def shutdown_handler(signum: int, frame: object) -> None:
        logger.info("Shutting down...")
        store.destroy()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)

    # stdio transport로 실행
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
