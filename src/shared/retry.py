"""재시도 정책 - tenacity 기반 exponential backoff."""

from dataclasses import dataclass
from typing import Any, Callable, TypeVar

from tenacity import (
    RetryError,
    retry,
    retry_if_exception,
    stop_after_attempt,
    wait_exponential,
)

T = TypeVar("T")


@dataclass
class RetryConfig:
    """재시도 설정."""

    max_attempts: int = 3
    initial_delay: float = 1.0  # 초
    max_delay: float = 10.0  # 초
    backoff_multiplier: float = 2.0


DEFAULT_RETRY_CONFIG = RetryConfig()


class RetryableError(Exception):
    """재시도 가능한 에러."""

    def __init__(self, message: str, status_code: int | None = None, retryable: bool = True):
        super().__init__(message)
        self.status_code = status_code
        self.retryable = retryable


def _should_retry(exc: BaseException) -> bool:
    """재시도 여부를 판단합니다."""
    if isinstance(exc, RetryableError):
        # 명시적으로 retryable=False면 재시도하지 않음
        if not exc.retryable:
            return False
        # 4xx 클라이언트 에러는 재시도하지 않음 (명시적 retryable 제외)
        if exc.status_code and 400 <= exc.status_code < 500:
            return False

    return True


async def retry_with_backoff(
    fn: Callable[[], T],
    config: RetryConfig | None = None,
) -> T:
    """Exponential backoff으로 함수를 재시도합니다.

    Args:
        fn: 실행할 함수 (동기 또는 비동기)
        config: 재시도 설정

    Returns:
        함수 실행 결과

    Raises:
        Exception: 최대 재시도 횟수 초과 시
    """
    cfg = config or DEFAULT_RETRY_CONFIG

    @retry(
        stop=stop_after_attempt(cfg.max_attempts),
        wait=wait_exponential(
            multiplier=cfg.backoff_multiplier,
            min=cfg.initial_delay,
            max=cfg.max_delay,
        ),
        retry=retry_if_exception(_should_retry),
        reraise=True,
    )
    async def _execute() -> T:
        result = fn()
        # awaitable이면 await
        if hasattr(result, "__await__"):
            return await result  # type: ignore
        return result  # type: ignore

    try:
        return await _execute()
    except RetryError as e:
        raise Exception(
            f"Max retry attempts ({cfg.max_attempts}) reached: {e.last_attempt.exception()}"
        ) from e


def retry_sync_with_backoff(
    fn: Callable[[], T],
    config: RetryConfig | None = None,
) -> T:
    """동기 함수용 재시도 래퍼.

    Args:
        fn: 실행할 동기 함수
        config: 재시도 설정

    Returns:
        함수 실행 결과
    """
    cfg = config or DEFAULT_RETRY_CONFIG

    @retry(
        stop=stop_after_attempt(cfg.max_attempts),
        wait=wait_exponential(
            multiplier=cfg.backoff_multiplier,
            min=cfg.initial_delay,
            max=cfg.max_delay,
        ),
        retry=retry_if_exception(_should_retry),
        reraise=True,
    )
    def _execute() -> T:
        return fn()

    try:
        return _execute()
    except RetryError as e:
        raise Exception(
            f"Max retry attempts ({cfg.max_attempts}) reached: {e.last_attempt.exception()}"
        ) from e
