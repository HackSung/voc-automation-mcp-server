"""Internal API MCP Server.

레거시 시스템 연동을 담당하는 MCP 서버입니다.
사용자 상태 조회, 에러 코드 해석, 헬스 체크를 지원합니다.
"""

from typing import Literal

from fastmcp import FastMCP

from shared.config import validate_env
from shared.logger import get_logger

from .client import InternalAPIClient
from .errors import ErrorResolver

logger = get_logger("InternalAPIServer")

# FastMCP 서버 생성
mcp = FastMCP("internal-api-server")

# 지연 초기화
_api_client: InternalAPIClient | None = None
_error_resolver = ErrorResolver()


def _require_api_client() -> InternalAPIClient:
    """API 클라이언트를 가져옵니다 (지연 초기화)."""
    global _api_client

    if _api_client is not None:
        return _api_client

    try:
        validate_env(["INTERNAL_API_BASE_URL", "INTERNAL_API_KEY"])
    except ValueError as e:
        raise ValueError(
            f"{e}\n\n"
            "How to fix:\n"
            "- Set these in ~/.cursor/mcp.json under internal-api.env\n"
            "- Or export them in the environment that launches Cursor\n"
        ) from e

    _api_client = InternalAPIClient()
    return _api_client


@mcp.tool()
def queryUserStatus(
    userId: str,
    queryType: Literal["subscription", "auth", "cancellation"],
) -> dict:
    """Queries internal legacy systems for user status.

    Args:
        userId: User ID or email
        queryType: Type of status to query ("subscription", "auth", or "cancellation")

    Returns:
        Dictionary containing userId, queryType, status, details, and lastUpdated
    """
    client = _require_api_client()

    return client.query_user_status(userId, queryType)


@mcp.tool()
def getErrorContext(errorCode: str) -> dict:
    """Retrieves detailed context for an error code.

    Includes description, possible causes, and resolution steps.
    Useful for root cause analysis.

    Args:
        errorCode: Error code from system logs (e.g., 'AUTH_001', 'BILL_002')

    Returns:
        Dictionary containing errorCode, category, description, possibleCauses, and solutions
    """
    context = _error_resolver.resolve(errorCode)

    if context is None:
        return {
            "error": f"Unknown error code: {errorCode}",
            "availableErrorCodes": _error_resolver.get_all_error_codes(),
        }

    return {
        "errorCode": errorCode,
        **context,
    }


@mcp.tool()
def getErrorLogs(userId: str, limit: int = 10) -> dict:
    """Fetches recent error logs for a specific user from internal systems.

    Args:
        userId: User ID or email
        limit: Maximum number of logs to retrieve (default: 10)

    Returns:
        Dictionary containing userId, logs list, and count
    """
    client = _require_api_client()

    logs = client.get_error_logs(userId, limit)

    return {
        "userId": userId,
        "logs": logs,
        "count": len(logs),
    }


@mcp.tool()
def searchErrorsByKeyword(keyword: str) -> dict:
    """Searches error codes and contexts by keyword.

    Useful when error code is unknown.

    Args:
        keyword: Search keyword (e.g., "authentication", "payment")

    Returns:
        Dictionary containing keyword, results list, and count
    """
    results = _error_resolver.search_by_keyword(keyword)

    return {
        "keyword": keyword,
        "results": results,
        "count": len(results),
    }


@mcp.tool()
def checkSystemHealth() -> dict:
    """Checks health status of internal API systems.

    Useful for troubleshooting connectivity issues.

    Returns:
        Dictionary containing status, services info, and timestamp
    """
    client = _require_api_client()

    return client.check_system_health()


def main() -> None:
    """MCP 서버를 시작합니다."""
    logger.info("Internal API Server started on stdio")

    # stdio transport로 실행
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
