"""Bitbucket REST API 클라이언트."""

from typing import Any

import httpx

from shared.config import BitbucketConfig, get_env_config
from shared.logger import get_logger
from shared.retry import RetryableError, retry_sync_with_backoff

logger = get_logger("BitbucketClient")


class BitbucketClient:
    """Bitbucket Server REST API 클라이언트."""

    def __init__(self, config: BitbucketConfig | None = None) -> None:
        """클라이언트를 초기화합니다.

        Args:
            config: Bitbucket 설정 (없으면 환경변수에서 로드)
        """
        if config is None:
            env_config = get_env_config()
            config = env_config.bitbucket

        self._config = config

        logger.info("BitbucketClient initialized", {"base_url": config.base_url})

    def _get_auth_header(self) -> str:
        """인증 헤더를 반환합니다."""
        return f"Bearer {self._config.token}"

    def _request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        json_data: dict[str, Any] | None = None,
        timeout: float = 30.0,
    ) -> dict[str, Any]:
        """API 요청을 수행합니다."""
        url = f"{self._config.base_url}/rest/api/1.0{path}"

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
                    f"Bitbucket API error: {response.status_code} - {response.text}",
                    status_code=response.status_code,
                )

            # 빈 응답 처리
            if not response.text:
                return {}

            return response.json()

        return retry_sync_with_backoff(_do_request)

    def list_repositories(self, project_key: str) -> list[dict[str, Any]]:
        """프로젝트의 저장소 목록을 가져옵니다.

        Args:
            project_key: 프로젝트 키

        Returns:
            저장소 목록
        """
        logger.debug("Listing repositories", {"projectKey": project_key})

        result = self._request("GET", f"/projects/{project_key}/repos")
        return result.get("values", [])

    def get_repository(self, project_key: str, repo_slug: str) -> dict[str, Any]:
        """저장소 정보를 가져옵니다.

        Args:
            project_key: 프로젝트 키
            repo_slug: 저장소 슬러그

        Returns:
            저장소 정보
        """
        logger.debug("Getting repository", {"projectKey": project_key, "repoSlug": repo_slug})

        return self._request("GET", f"/projects/{project_key}/repos/{repo_slug}")

    def browse_directory(
        self,
        project_key: str,
        repo_slug: str,
        path: str = "",
        branch: str = "main",
    ) -> dict[str, Any]:
        """디렉토리 내용을 탐색합니다.

        Args:
            project_key: 프로젝트 키
            repo_slug: 저장소 슬러그
            path: 디렉토리 경로 (빈 문자열이면 루트)
            branch: 브랜치 이름

        Returns:
            디렉토리 내용
        """
        logger.debug(
            "Browsing directory",
            {"projectKey": project_key, "repoSlug": repo_slug, "path": path, "branch": branch},
        )

        endpoint = f"/projects/{project_key}/repos/{repo_slug}/browse"
        if path:
            endpoint += f"/{path}"

        return self._request("GET", endpoint, params={"at": f"refs/heads/{branch}"})

    def get_file_content(
        self,
        project_key: str,
        repo_slug: str,
        file_path: str,
        branch: str = "main",
    ) -> str:
        """파일 내용을 가져옵니다.

        Args:
            project_key: 프로젝트 키
            repo_slug: 저장소 슬러그
            file_path: 파일 경로
            branch: 브랜치 이름

        Returns:
            파일 내용
        """
        logger.debug(
            "Getting file content",
            {"projectKey": project_key, "repoSlug": repo_slug, "filePath": file_path},
        )

        result = self._request(
            "GET",
            f"/projects/{project_key}/repos/{repo_slug}/browse/{file_path}",
            params={"at": f"refs/heads/{branch}"},
        )

        # 라인 단위로 반환됨
        lines = result.get("lines", [])
        return "\n".join(line.get("text", "") for line in lines)

    def list_branches(self, project_key: str, repo_slug: str) -> list[dict[str, Any]]:
        """브랜치 목록을 가져옵니다.

        Args:
            project_key: 프로젝트 키
            repo_slug: 저장소 슬러그

        Returns:
            브랜치 목록
        """
        logger.debug("Listing branches", {"projectKey": project_key, "repoSlug": repo_slug})

        result = self._request("GET", f"/projects/{project_key}/repos/{repo_slug}/branches")
        return result.get("values", [])

    def search_code(
        self,
        project_key: str,
        repo_slug: str,
        query: str,
        branch: str | None = None,
    ) -> dict[str, Any]:
        """코드를 검색합니다.

        Args:
            project_key: 프로젝트 키
            repo_slug: 저장소 슬러그
            query: 검색어
            branch: 브랜치 이름 (선택)

        Returns:
            검색 결과
        """
        logger.debug(
            "Searching code",
            {"projectKey": project_key, "repoSlug": repo_slug, "query": query},
        )

        # Bitbucket Server 코드 검색 API
        # Note: 일부 버전에서는 다른 엔드포인트를 사용할 수 있음
        params: dict[str, str] = {"query": query}
        if branch:
            params["branch"] = branch

        return self._request(
            "GET",
            f"/projects/{project_key}/repos/{repo_slug}/search",
            params=params,
        )

    def get_archive_url(
        self,
        project_key: str,
        repo_slug: str,
        format: str = "zip",
        branch: str = "main",
    ) -> str:
        """저장소 아카이브 다운로드 URL을 생성합니다.

        Args:
            project_key: 프로젝트 키
            repo_slug: 저장소 슬러그
            format: 아카이브 형식 (zip, tar.gz)
            branch: 브랜치 이름

        Returns:
            다운로드 URL
        """
        return (
            f"{self._config.base_url}/rest/api/1.0"
            f"/projects/{project_key}/repos/{repo_slug}/archive"
            f"?at=refs/heads/{branch}&format={format}"
        )

    def get_commits(
        self,
        project_key: str,
        repo_slug: str,
        branch: str = "main",
        limit: int = 25,
    ) -> list[dict[str, Any]]:
        """커밋 목록을 가져옵니다.

        Args:
            project_key: 프로젝트 키
            repo_slug: 저장소 슬러그
            branch: 브랜치 이름
            limit: 최대 개수

        Returns:
            커밋 목록
        """
        logger.debug(
            "Getting commits",
            {"projectKey": project_key, "repoSlug": repo_slug, "branch": branch},
        )

        result = self._request(
            "GET",
            f"/projects/{project_key}/repos/{repo_slug}/commits",
            params={"until": f"refs/heads/{branch}", "limit": limit},
        )
        return result.get("values", [])

    def list_pull_requests(
        self,
        project_key: str,
        repo_slug: str,
        state: str = "OPEN",
    ) -> list[dict[str, Any]]:
        """풀 리퀘스트 목록을 가져옵니다.

        Args:
            project_key: 프로젝트 키
            repo_slug: 저장소 슬러그
            state: 상태 필터 (OPEN, MERGED, DECLINED, ALL)

        Returns:
            풀 리퀘스트 목록
        """
        logger.debug(
            "Listing pull requests",
            {"projectKey": project_key, "repoSlug": repo_slug, "state": state},
        )

        result = self._request(
            "GET",
            f"/projects/{project_key}/repos/{repo_slug}/pull-requests",
            params={"state": state},
        )
        return result.get("values", [])

    def get_pull_request(
        self,
        project_key: str,
        repo_slug: str,
        pr_id: int,
    ) -> dict[str, Any]:
        """풀 리퀘스트 정보를 가져옵니다.

        Args:
            project_key: 프로젝트 키
            repo_slug: 저장소 슬러그
            pr_id: 풀 리퀘스트 ID

        Returns:
            풀 리퀘스트 정보
        """
        logger.debug(
            "Getting pull request",
            {"projectKey": project_key, "repoSlug": repo_slug, "prId": pr_id},
        )

        return self._request(
            "GET",
            f"/projects/{project_key}/repos/{repo_slug}/pull-requests/{pr_id}",
        )
