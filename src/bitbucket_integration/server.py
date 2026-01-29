"""Bitbucket Integration MCP Server.

Bitbucket 저장소 분석을 담당하는 MCP 서버입니다.
파일 내용 조회, 코드 검색, 브랜치/커밋/PR 조회를 지원합니다.
"""

from fastmcp import FastMCP

from shared.config import validate_env
from shared.logger import get_logger

from .client import BitbucketClient

logger = get_logger("BitbucketIntegrationServer")

# FastMCP 서버 생성
mcp = FastMCP("bitbucket-integration-server")

# 지연 초기화
_bitbucket_client: BitbucketClient | None = None


def _require_bitbucket_client() -> BitbucketClient:
    """Bitbucket 클라이언트를 가져옵니다 (지연 초기화)."""
    global _bitbucket_client

    if _bitbucket_client is not None:
        return _bitbucket_client

    try:
        validate_env(["BITBUCKET_BASE_URL", "BITBUCKET_TOKEN"])
    except ValueError as e:
        raise ValueError(
            f"{e}\n\n"
            "How to fix:\n"
            "- Set these in ~/.cursor/mcp.json under bitbucket-integration.env\n"
            "- Or export them in the environment that launches Cursor\n"
        ) from e

    _bitbucket_client = BitbucketClient()
    return _bitbucket_client


@mcp.tool()
def listRepositories(projectKey: str) -> dict:
    """Lists all repositories in a Bitbucket project.

    Args:
        projectKey: Project key (e.g., "PROJ", "MYTEAM")

    Returns:
        Dictionary containing count and repository list with names, slugs, and clone URLs
    """
    client = _require_bitbucket_client()

    repos = client.list_repositories(projectKey)

    return {
        "count": len(repos),
        "repositories": [
            {
                "name": repo.get("name"),
                "slug": repo.get("slug"),
                "project": repo.get("project", {}).get("name"),
                "cloneUrl": repo.get("links", {}).get("clone", [{}])[0].get("href"),
            }
            for repo in repos
        ],
    }


@mcp.tool()
def getRepository(projectKey: str, repoSlug: str) -> dict:
    """Gets detailed information about a specific repository.

    Args:
        projectKey: Project key
        repoSlug: Repository slug (e.g., "my-repo")

    Returns:
        Repository details including project info and links
    """
    client = _require_bitbucket_client()

    return client.get_repository(projectKey, repoSlug)


@mcp.tool()
def browseDirectory(
    projectKey: str,
    repoSlug: str,
    path: str = "",
    branch: str = "main",
) -> dict:
    """Browse directory contents in a repository.

    Args:
        projectKey: Project key
        repoSlug: Repository slug
        path: Directory path (e.g., "src/main/java"). Leave empty for root.
        branch: Branch name (default: "main")

    Returns:
        Dictionary containing path and list of files/subdirectories
    """
    client = _require_bitbucket_client()

    listing = client.browse_directory(projectKey, repoSlug, path, branch)

    return {
        "path": listing.get("path", {}).get("toString", path),
        "items": [
            {
                "path": item.get("path", {}).get("toString", ""),
                "type": item.get("type"),
                "size": item.get("size"),
            }
            for item in listing.get("children", {}).get("values", [])
        ],
    }


@mcp.tool()
def getFileContent(
    projectKey: str,
    repoSlug: str,
    filePath: str,
    branch: str = "main",
) -> dict:
    """Retrieves the complete content of a file from a repository.

    Args:
        projectKey: Project key
        repoSlug: Repository slug
        filePath: File path (e.g., "src/index.ts", "README.md")
        branch: Branch name (default: "main")

    Returns:
        Dictionary containing filePath, branch, content, and line count
    """
    client = _require_bitbucket_client()

    content = client.get_file_content(projectKey, repoSlug, filePath, branch)

    return {
        "filePath": filePath,
        "branch": branch,
        "content": content,
        "lines": len(content.split("\n")),
    }


@mcp.tool()
def listBranches(projectKey: str, repoSlug: str) -> dict:
    """Lists all branches in a repository.

    Args:
        projectKey: Project key
        repoSlug: Repository slug

    Returns:
        Dictionary containing count and branch list with names and latest commits
    """
    client = _require_bitbucket_client()

    branches = client.list_branches(projectKey, repoSlug)

    return {
        "count": len(branches),
        "branches": [
            {
                "name": branch.get("displayId"),
                "id": branch.get("id"),
                "latestCommit": branch.get("latestCommit"),
                "isDefault": branch.get("isDefault", False),
            }
            for branch in branches
        ],
    }


@mcp.tool()
def searchCode(
    projectKey: str,
    repoSlug: str,
    query: str,
    branch: str | None = None,
) -> dict:
    """Searches for code within a repository using text matching.

    Args:
        projectKey: Project key
        repoSlug: Repository slug
        query: Search query (text to find in code)
        branch: Branch name (default: "main")

    Returns:
        Dictionary containing query, result count, and matching files with contexts
    """
    client = _require_bitbucket_client()

    results = client.search_code(projectKey, repoSlug, query, branch)

    code_results = results.get("code", {})

    return {
        "query": query,
        "count": code_results.get("count", 0),
        "isLastPage": code_results.get("isLastPage", True),
        "results": [
            {
                "repository": result.get("repository", {}).get("name"),
                "file": result.get("file"),
                "hitCount": result.get("hitCount", 0),
                "matches": [
                    {"line": hit.get("line"), "text": hit.get("text")}
                    for context in result.get("hitContexts", [])
                    for hit in context
                ],
            }
            for result in code_results.get("values", [])
        ],
    }


@mcp.tool()
def getArchiveUrl(
    projectKey: str,
    repoSlug: str,
    format: str = "zip",
    branch: str = "main",
) -> dict:
    """Generates a download URL for a complete repository archive.

    Args:
        projectKey: Project key
        repoSlug: Repository slug
        format: Archive format ("zip" or "tar.gz", default: "zip")
        branch: Branch name (default: "main")

    Returns:
        Dictionary containing archiveUrl, format, and branch
    """
    client = _require_bitbucket_client()

    url = client.get_archive_url(projectKey, repoSlug, format, branch)

    return {
        "archiveUrl": url,
        "format": format,
        "branch": branch,
        "note": "Use this URL with curl or wget to download the archive",
    }


@mcp.tool()
def getCommits(
    projectKey: str,
    repoSlug: str,
    branch: str = "main",
    limit: int = 25,
) -> dict:
    """Retrieves recent commits from a repository branch.

    Args:
        projectKey: Project key
        repoSlug: Repository slug
        branch: Branch name (default: "main")
        limit: Number of commits to retrieve (default: 25)

    Returns:
        Dictionary containing count and commit list with IDs, messages, authors, and timestamps
    """
    client = _require_bitbucket_client()

    commits = client.get_commits(projectKey, repoSlug, branch, limit)

    return {
        "count": len(commits),
        "commits": [
            {
                "id": commit.get("id"),
                "message": commit.get("message"),
                "author": commit.get("author", {}).get("name"),
                "timestamp": commit.get("authorTimestamp"),
            }
            for commit in commits
        ],
    }


@mcp.tool()
def listPullRequests(
    projectKey: str,
    repoSlug: str,
    state: str = "OPEN",
) -> dict:
    """Lists pull requests in a repository filtered by state.

    Args:
        projectKey: Project key
        repoSlug: Repository slug
        state: Pull request state filter ("OPEN", "MERGED", "DECLINED", or "ALL", default: "OPEN")

    Returns:
        Dictionary containing count, state, and pull request list
    """
    client = _require_bitbucket_client()

    prs = client.list_pull_requests(projectKey, repoSlug, state)

    return {
        "count": len(prs),
        "state": state,
        "pullRequests": [
            {
                "id": pr.get("id"),
                "title": pr.get("title"),
                "state": pr.get("state"),
                "author": pr.get("author", {}).get("user", {}).get("displayName"),
                "createdDate": pr.get("createdDate"),
                "updatedDate": pr.get("updatedDate"),
            }
            for pr in prs
        ],
    }


@mcp.tool()
def getPullRequest(projectKey: str, repoSlug: str, prId: int) -> dict:
    """Gets detailed information about a specific pull request.

    Args:
        projectKey: Project key
        repoSlug: Repository slug
        prId: Pull request ID

    Returns:
        Dictionary containing PR details including description, reviewers, and status
    """
    client = _require_bitbucket_client()

    pr = client.get_pull_request(projectKey, repoSlug, prId)

    return {
        "id": pr.get("id"),
        "title": pr.get("title"),
        "description": pr.get("description"),
        "state": pr.get("state"),
        "author": pr.get("author", {}).get("user", {}).get("displayName"),
        "reviewers": [
            {
                "name": r.get("user", {}).get("displayName"),
                "approved": r.get("approved"),
                "status": r.get("status"),
            }
            for r in pr.get("reviewers", [])
        ],
        "fromBranch": pr.get("fromRef", {}).get("displayId"),
        "toBranch": pr.get("toRef", {}).get("displayId"),
        "createdDate": pr.get("createdDate"),
        "updatedDate": pr.get("updatedDate"),
    }


def main() -> None:
    """MCP 서버를 시작합니다."""
    logger.info("Bitbucket Integration Server started on stdio")

    # stdio transport로 실행
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
