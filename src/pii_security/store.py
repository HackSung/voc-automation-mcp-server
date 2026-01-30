"""PII 매핑 저장소 - In-Memory 저장, TTL 자동 삭제."""

import threading
import time
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .detector import PIIMapping

from shared.logger import get_logger

logger = get_logger("MappingStore")


@dataclass
class SessionEntry:
    """세션 엔트리."""

    mappings: list["PIIMapping"]
    timestamp: float  # Unix timestamp


class PIIMappingStore:
    """PII 매핑 저장소.

    - In-Memory 저장 (디스크 유출 방지)
    - TTL 기반 자동 삭제
    - 5분마다 정리 실행
    """

    def __init__(self, ttl_ms: int = 3600000):
        """저장소를 초기화합니다.

        Args:
            ttl_ms: 세션 TTL (밀리초, 기본값: 1시간)
        """
        self._store: dict[str, SessionEntry] = {}
        self._ttl_seconds = ttl_ms / 1000
        self._lock = threading.Lock()

        # 5분마다 정리 스레드 실행
        self._cleanup_interval = 300  # 5분
        self._cleanup_thread: threading.Thread | None = None
        self._running = True
        self._start_cleanup_thread()

        logger.info("PIIMappingStore initialized", {"ttl_seconds": self._ttl_seconds})

    def _start_cleanup_thread(self) -> None:
        """정리 스레드를 시작합니다."""

        def cleanup_loop() -> None:
            while self._running:
                time.sleep(self._cleanup_interval)
                if self._running:
                    self._cleanup()

        self._cleanup_thread = threading.Thread(target=cleanup_loop, daemon=True)
        self._cleanup_thread.start()

    def store_mappings(self, session_id: str, mappings: list["PIIMapping"]) -> None:
        """매핑을 저장합니다.

        Args:
            session_id: 세션 ID
            mappings: PII 매핑 목록
        """
        with self._lock:
            self._store[session_id] = SessionEntry(
                mappings=mappings,
                timestamp=time.time(),
            )

        logger.debug("Stored PII mappings", {"session_id": session_id, "count": len(mappings)})

        # 저장 시 정리 트리거
        self._cleanup()

    def retrieve(self, session_id: str) -> list["PIIMapping"] | None:
        """매핑을 조회합니다.

        Args:
            session_id: 세션 ID

        Returns:
            매핑 목록 또는 None (세션 없거나 만료 시)
        """
        with self._lock:
            entry = self._store.get(session_id)

            if entry is None:
                logger.warn("Session not found", {"session_id": session_id})
                return None

            # TTL 체크
            if time.time() - entry.timestamp > self._ttl_seconds:
                del self._store[session_id]
                logger.warn("Session expired", {"session_id": session_id})
                return None

            logger.debug(
                "Retrieved PII mappings",
                {"session_id": session_id, "count": len(entry.mappings)},
            )

            return entry.mappings

    def clear_session(self, session_id: str) -> None:
        """세션을 삭제합니다.

        Args:
            session_id: 세션 ID
        """
        with self._lock:
            if session_id in self._store:
                del self._store[session_id]

        logger.info("Session cleared", {"session_id": session_id})

    def _cleanup(self) -> None:
        """만료된 세션을 정리합니다."""
        now = time.time()
        removed_count = 0

        with self._lock:
            expired_sessions = [
                sid
                for sid, entry in self._store.items()
                if now - entry.timestamp > self._ttl_seconds
            ]

            for sid in expired_sessions:
                del self._store[sid]
                removed_count += 1

        if removed_count > 0:
            logger.info("Cleanup completed", {"removed_count": removed_count})

    def get_stats(self) -> dict:
        """저장소 통계를 반환합니다.

        Returns:
            통계 정보
        """
        with self._lock:
            return {
                "totalSessions": len(self._store),
                "ttlSeconds": self._ttl_seconds,
            }

    def destroy(self) -> None:
        """저장소를 종료합니다."""
        self._running = False
        with self._lock:
            self._store.clear()
        logger.info("PIIMappingStore destroyed")
