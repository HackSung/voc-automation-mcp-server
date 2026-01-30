"""유사 이슈 검색 모듈 - OpenAI 임베딩 기반."""

import math
from dataclasses import dataclass, field

from openai import OpenAI

from shared.logger import get_logger
from shared.retry import retry_sync_with_backoff

logger = get_logger("SimilaritySearch")


@dataclass
class SimilarIssue:
    """유사 이슈 정보."""

    jira_key: str
    similarity: float
    summary: str
    description: str | None = None


@dataclass
class CachedIssue:
    """캐시된 이슈 정보."""

    embedding: list[float]
    summary: str
    timestamp: float


@dataclass
class EmbeddingCache:
    """임베딩 캐시."""

    issues: dict[str, CachedIssue] = field(default_factory=dict)


class SimilaritySearch:
    """임베딩 기반 유사 이슈 검색."""

    def __init__(self, api_key: str):
        """유사 검색을 초기화합니다.

        Args:
            api_key: OpenAI API 키
        """
        self._client = OpenAI(api_key=api_key)
        self._cache = EmbeddingCache()
        self._model = "text-embedding-3-small"

        logger.info("SimilaritySearch initialized")

    def find_similar_issues(
        self, voc_text: str, top_k: int = 5, threshold: float = 0.7
    ) -> list[SimilarIssue]:
        """유사 이슈를 검색합니다.

        Args:
            voc_text: VOC 텍스트
            top_k: 반환할 최대 이슈 수
            threshold: 유사도 임계값 (0.0 ~ 1.0)

        Returns:
            유사 이슈 목록 (유사도 내림차순)
        """
        logger.info("Finding similar issues", {"top_k": top_k})

        try:
            # VOC 텍스트 임베딩
            voc_embedding = self._get_embedding(voc_text)

            # 캐시된 이슈와 유사도 계산
            similarities: list[SimilarIssue] = []

            for jira_key, cached in self._cache.issues.items():
                similarity = self._cosine_similarity(voc_embedding, cached.embedding)
                similarities.append(
                    SimilarIssue(
                        jira_key=jira_key,
                        similarity=similarity,
                        summary=cached.summary,
                    )
                )

            # 유사도 내림차순 정렬, 임계값 필터링
            top_similar = sorted(similarities, key=lambda x: x.similarity, reverse=True)
            top_similar = [s for s in top_similar if s.similarity >= threshold][:top_k]

            logger.info("Similar issues found", {"count": len(top_similar)})
            return top_similar

        except Exception as e:
            logger.error("Similarity search failed", e)
            return []

    def index_issue(self, jira_key: str, summary: str) -> None:
        """이슈를 인덱싱합니다.

        Args:
            jira_key: Jira 이슈 키 (예: 'VOC-123')
            summary: 이슈 요약
        """
        logger.debug("Indexing issue", {"jira_key": jira_key})

        try:
            import time

            embedding = self._get_embedding(summary)

            self._cache.issues[jira_key] = CachedIssue(
                embedding=embedding,
                summary=summary,
                timestamp=time.time(),
            )

            logger.debug("Issue indexed", {"jira_key": jira_key})

        except Exception as e:
            logger.error("Failed to index issue", e)

    def _get_embedding(self, text: str) -> list[float]:
        """텍스트의 임베딩을 가져옵니다.

        Args:
            text: 임베딩할 텍스트

        Returns:
            임베딩 벡터
        """

        def _call_api() -> list[float]:
            response = self._client.embeddings.create(
                model=self._model,
                input=text,
            )
            return response.data[0].embedding

        return retry_sync_with_backoff(_call_api)

    def _cosine_similarity(self, a: list[float], b: list[float]) -> float:
        """코사인 유사도를 계산합니다.

        Args:
            a: 벡터 A
            b: 벡터 B

        Returns:
            코사인 유사도 (-1.0 ~ 1.0)
        """
        if len(a) != len(b):
            raise ValueError("Vectors must have same length")

        dot_product = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(x * x for x in b))

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return dot_product / (norm_a * norm_b)

    def get_cache_stats(self) -> dict:
        """캐시 통계를 반환합니다.

        Returns:
            통계 정보
        """
        return {
            "totalIssues": len(self._cache.issues),
        }

    def clear_cache(self) -> None:
        """캐시를 초기화합니다."""
        self._cache.issues.clear()
        logger.info("Cache cleared")
