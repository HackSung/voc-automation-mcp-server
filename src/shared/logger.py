"""로깅 유틸리티 - 민감정보 자동 마스킹."""

import json
import sys
from datetime import datetime, timezone
from typing import Any


# 민감 키워드 목록
SENSITIVE_KEYS = frozenset({
    "password",
    "token",
    "apikey",
    "api_key",
    "apitoken",
    "api_token",
    "authorization",
    "secret",
    "credential",
    "private_key",
    "privatekey",
})


def _mask_secret(value: str) -> str:
    """비밀 값을 마스킹합니다."""
    if not value or len(value) < 4:
        return "***"
    return value[:4] + "*" * min(len(value) - 4, 20)


def _sanitize_data(data: Any) -> Any:
    """민감 정보를 마스킹합니다."""
    if data is None:
        return None

    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            key_lower = key.lower().replace("-", "_")
            if any(sensitive in key_lower for sensitive in SENSITIVE_KEYS):
                if isinstance(value, str):
                    result[key] = _mask_secret(value)
                else:
                    result[key] = "***"
            else:
                result[key] = _sanitize_data(value)
        return result

    if isinstance(data, list):
        return [_sanitize_data(item) for item in data]

    return data


class Logger:
    """MCP 서버용 로거 - stderr로 JSON 로그 출력."""

    def __init__(self, context: str):
        """로거를 초기화합니다.

        Args:
            context: 로그 컨텍스트 (예: 'PIISecurityServer')
        """
        self.context = context

    def _log(self, level: str, message: str, data: Any = None) -> None:
        """로그를 출력합니다."""
        entry = {
            "level": level,
            "message": f"[{self.context}] {message}",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        if data is not None:
            entry["data"] = _sanitize_data(data)

        # MCP stdio 통신 방해를 피하기 위해 stderr로 출력
        print(json.dumps(entry, ensure_ascii=False), file=sys.stderr)

    def debug(self, message: str, data: Any = None) -> None:
        """디버그 로그를 출력합니다."""
        self._log("debug", message, data)

    def info(self, message: str, data: Any = None) -> None:
        """정보 로그를 출력합니다."""
        self._log("info", message, data)

    def warn(self, message: str, data: Any = None) -> None:
        """경고 로그를 출력합니다."""
        self._log("warn", message, data)

    def error(self, message: str, error: Exception | Any = None) -> None:
        """에러 로그를 출력합니다."""
        error_data = None
        if error is not None:
            if isinstance(error, Exception):
                error_data = {
                    "error": str(error),
                    "type": type(error).__name__,
                }
            else:
                error_data = {"error": str(error)}

        self._log("error", message, error_data)


def get_logger(context: str) -> Logger:
    """로거 인스턴스를 생성합니다.

    Args:
        context: 로그 컨텍스트

    Returns:
        Logger 인스턴스
    """
    return Logger(context)
