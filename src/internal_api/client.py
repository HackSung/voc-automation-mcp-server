"""내부 API 클라이언트."""

from typing import Any, Literal

import httpx

from shared.config import InternalApiConfig, get_env_config
from shared.logger import get_logger
from shared.retry import RetryableError, retry_sync_with_backoff

logger = get_logger("InternalAPIClient")


class InternalAPIClient:
    """내부 레거시 시스템 API 클라이언트."""

    def __init__(self, config: InternalApiConfig | None = None) -> None:
        """클라이언트를 초기화합니다.

        Args:
            config: API 설정 (없으면 환경변수에서 로드)
        """
        if config is None:
            env_config = get_env_config()
            config = env_config.internal_api

        self._config = config

        logger.info("InternalAPIClient initialized", {"base_url": config.base_url})

    def _get_auth_header(self) -> str:
        """인증 헤더를 반환합니다."""
        return f"Bearer {self._config.api_key}"

    def _request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        json_data: dict[str, Any] | None = None,
        timeout: float = 30.0,
    ) -> dict[str, Any]:
        """API 요청을 수행합니다."""
        url = f"{self._config.base_url}{path}"

        def _do_request() -> dict[str, Any]:
            with httpx.Client() as client:
                response = client.request(
                    method=method,
                    url=url,
                    headers={
                        "Authorization": self._get_auth_header(),
                        "Content-Type": "application/json",
                    },
                    params=params,
                    json=json_data,
                    timeout=timeout,
                )

            if not response.is_success:
                raise RetryableError(
                    f"Internal API error: {response.status_code} - {response.text}",
                    status_code=response.status_code,
                )

            if not response.text:
                return {}

            return response.json()

        return retry_sync_with_backoff(_do_request)

    def query_user_status(
        self,
        user_id: str,
        query_type: Literal["subscription", "auth", "cancellation"],
    ) -> dict[str, Any]:
        """사용자 상태를 조회합니다.

        Args:
            user_id: 사용자 ID 또는 이메일
            query_type: 조회 유형

        Returns:
            사용자 상태 정보
        """
        logger.info("Querying user status", {"userId": user_id, "queryType": query_type})

        try:
            result = self._request(
                "GET",
                f"/users/{user_id}/status",
                params={"type": query_type},
            )

            return {
                "userId": user_id,
                "queryType": query_type,
                "status": result.get("status", "unknown"),
                "details": result.get("details", {}),
                "lastUpdated": result.get("lastUpdated"),
            }

        except Exception as e:
            logger.error("Failed to query user status", e)
            # 데모/폴백 응답
            return {
                "userId": user_id,
                "queryType": query_type,
                "status": "unavailable",
                "details": {"error": str(e)},
                "note": "Internal API unavailable, returning mock response",
            }

    def get_error_logs(self, user_id: str, limit: int = 10) -> list[dict[str, Any]]:
        """사용자의 에러 로그를 조회합니다.

        Args:
            user_id: 사용자 ID 또는 이메일
            limit: 최대 로그 수

        Returns:
            에러 로그 목록
        """
        logger.info("Getting error logs", {"userId": user_id, "limit": limit})

        try:
            result = self._request(
                "GET",
                f"/users/{user_id}/errors",
                params={"limit": limit},
            )

            return result.get("logs", [])

        except Exception as e:
            logger.error("Failed to get error logs", e)
            # 데모/폴백 응답
            return [
                {
                    "timestamp": "N/A",
                    "errorCode": "API_UNAVAILABLE",
                    "message": str(e),
                    "note": "Internal API unavailable",
                }
            ]

    def check_system_health(self) -> dict[str, Any]:
        """시스템 헬스 체크를 수행합니다.

        Returns:
            헬스 체크 결과
        """
        logger.info("Checking system health")

        try:
            result = self._request("GET", "/health", timeout=10.0)

            return {
                "status": result.get("status", "unknown"),
                "services": result.get("services", {}),
                "timestamp": result.get("timestamp"),
            }

        except Exception as e:
            logger.error("Health check failed", e)
            return {
                "status": "unhealthy",
                "error": str(e),
                "services": {},
            }
