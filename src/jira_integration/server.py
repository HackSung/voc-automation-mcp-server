"""Jira Integration MCP Server.

Jira 티켓 자동화를 담당하는 MCP 서버입니다.
카테고리 기반 담당자 자동 할당, MS Teams 알림을 지원합니다.
"""

import os

from fastmcp import FastMCP

from shared.config import get_env_config, validate_env
from shared.logger import get_logger

from .client import JiraClient
from .teams import TeamsNotifier

logger = get_logger("JiraIntegrationServer")

# FastMCP 서버 생성
mcp = FastMCP("jira-integration-server")

# 지연 초기화를 위한 클라이언트 (환경변수가 설정되어 있을 때만 생성)
_jira_client: JiraClient | None = None
_teams_notifier: TeamsNotifier | None = None


def _require_jira_client() -> JiraClient:
    """Jira 클라이언트를 가져옵니다 (지연 초기화)."""
    global _jira_client

    if _jira_client is not None:
        return _jira_client

    try:
        validate_env(["JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN"])
    except ValueError as e:
        raise ValueError(
            f"{e}\n\n"
            "How to fix:\n"
            "- Set these in ~/.cursor/mcp.json under jira-integration.env\n"
            "- Or export them in the environment that launches Cursor\n"
        ) from e

    _jira_client = JiraClient()
    return _jira_client


def _get_teams_notifier() -> TeamsNotifier:
    """Teams 알림 클라이언트를 가져옵니다."""
    global _teams_notifier

    if _teams_notifier is None:
        _teams_notifier = TeamsNotifier()

    return _teams_notifier


@mcp.tool()
def getJiraEnvDebug() -> dict:
    """Returns safe debug info about env loading and assignee configuration.

    No secrets are exposed.

    Returns:
        Dictionary with environment configuration status
    """
    config = get_env_config()

    def has_env(key: str) -> bool:
        val = os.environ.get(key, "")
        return bool(val and val.strip())

    return {
        "envSource": "process.env (mcp.json env / exported env vars)",
        "jira": {
            "baseUrl": "[set]" if config.jira.base_url else "[missing]",
            "projectKey": config.jira.project_key or "[missing]",
            "email": "[set]" if config.jira.email else "[missing]",
            "apiToken": "[set]" if config.jira.api_token else "[missing]",
        },
        "assignees": {
            "ASSIGNEE_DEFAULT": has_env("ASSIGNEE_DEFAULT"),
            "ASSIGNEE_AUTH": has_env("ASSIGNEE_AUTH"),
            "ASSIGNEE_BILLING": has_env("ASSIGNEE_BILLING"),
            "ASSIGNEE_SUBSCRIPTION": has_env("ASSIGNEE_SUBSCRIPTION"),
            "ASSIGNEE_PERF": has_env("ASSIGNEE_PERF"),
            "ASSIGNEE_UI": has_env("ASSIGNEE_UI"),
            "ASSIGNEE_BIZRING": has_env("ASSIGNEE_BIZRING"),
        },
        "hints": [
            "Inject env vars via ~/.cursor/mcp.json (mcpServers.jira-integration.env).",
            "ASSIGNEE_* should be Jira username (Server/DC) or accountId (Cloud).",
        ],
    }


@mcp.tool()
def createJiraIssue(
    summary: str,
    description: str,
    priority: str,
    project: str | None = None,
    issueType: str = "Work",
    labels: list[str] | None = None,
    components: list[str] | None = None,
    category: str | None = None,
    assignee: str | None = None,
    sendNotification: bool = False,
) -> dict:
    """Creates a new Jira issue with automatic assignee resolution based on category.

    Args:
        summary: Issue title/summary (max 255 chars)
        description: Detailed description (supports Jira markdown)
        priority: Issue priority (Major, Blocker, Critical, Minor, Medium, Trivial, High, Low)
        project: Project key (default: from env JIRA_PROJECT_KEY)
        issueType: Issue type (for VOC this is always 'Work')
        labels: Optional labels for categorization
        components: Jira components (default: ["[VOC]"])
        category: VOC category for auto-assignment (e.g., authentication, billing)
        assignee: Optional Jira username to override auto-assignment
        sendNotification: Send Teams notification (default: False)

    Returns:
        Dictionary containing issueKey, issueId, url, and assignee info
    """
    client = _require_jira_client()
    config = get_env_config()

    result = client.create_issue(
        summary=summary,
        description=description,
        priority=priority,
        project=project or config.jira.project_key,
        issue_type="Work",  # VOC는 항상 Work
        labels=labels,
        components=components or ["[VOC]"],
        category=category,
        assignee=assignee,
    )

    # Teams 알림 전송
    if sendNotification:
        notifier = _get_teams_notifier()
        notifier.send_notification_sync(
            title=f"New {issueType}: {summary}",
            summary=description[:200] if description else "",
            issue_key=result.issue_key,
            issue_url=result.url,
            priority=priority,
        )

    return {
        "issueKey": result.issue_key,
        "issueId": result.issue_id,
        "url": result.url,
        "created": result.created,
        "assigneeRequested": result.assignee_requested,
        "assigneeFinalDisplayName": result.assignee_final_display_name,
        "assigneeFinalUsername": result.assignee_final_username,
        "assigneeApplied": result.assignee_applied,
    }


@mcp.tool()
def addComment(issueKey: str, comment: str) -> dict:
    """Adds a comment to an existing Jira issue.

    Args:
        issueKey: Jira issue key (e.g., 'VOC-123')
        comment: Comment text (supports Jira markdown)

    Returns:
        Dictionary containing commentId and added flag
    """
    client = _require_jira_client()

    result = client.add_comment(issueKey, comment)

    return {
        "commentId": result.comment_id,
        "added": result.added,
    }


@mcp.tool()
def transitionIssue(issueKey: str, transitionName: str) -> dict:
    """Changes the status of a Jira issue.

    Args:
        issueKey: Jira issue key (e.g., 'VOC-123')
        transitionName: Target status name (e.g., 'In Progress', 'Done'). Case-insensitive.

    Returns:
        Dictionary containing success flag and currentStatus
    """
    client = _require_jira_client()

    result = client.transition_issue(issueKey, transitionName)

    return {
        "success": result.success,
        "currentStatus": result.current_status,
    }


@mcp.tool()
def getIssue(issueKey: str) -> dict:
    """Retrieves details of a Jira issue.

    Args:
        issueKey: Jira issue key (e.g., 'VOC-123')

    Returns:
        Dictionary containing issue details
    """
    client = _require_jira_client()

    issue = client.get_issue(issueKey)
    fields = issue.get("fields", {})

    return {
        "key": issue.get("key"),
        "summary": fields.get("summary"),
        "status": fields.get("status", {}).get("name"),
        "priority": fields.get("priority", {}).get("name"),
        "assignee": fields.get("assignee", {}).get("displayName") if fields.get("assignee") else None,
        "assigneeUsername": fields.get("assignee", {}).get("name") if fields.get("assignee") else None,
        "created": fields.get("created"),
        "updated": fields.get("updated"),
    }


@mcp.tool()
def getIssueAttachments(issueKey: str) -> dict:
    """Retrieves all attachments from a Jira issue.

    Args:
        issueKey: Jira issue key (e.g., 'VRBT-10676')

    Returns:
        Dictionary containing attachments list with filenames, sizes, types, and download URLs
    """
    client = _require_jira_client()

    return client.get_attachments(issueKey)


@mcp.tool()
def downloadAttachment(attachmentUrl: str, saveAsBase64: bool = True) -> dict:
    """Downloads a Jira attachment and returns it as base64-encoded data.

    Args:
        attachmentUrl: Attachment download URL from getIssueAttachments
        saveAsBase64: Return as base64 string (default: True)

    Returns:
        Dictionary containing success flag, format, and data
    """
    client = _require_jira_client()

    data = client.download_attachment(attachmentUrl, as_base64=saveAsBase64)

    if isinstance(data, str):
        return {
            "success": True,
            "format": "base64",
            "data": data,
            "note": "Use this base64 data to save or analyze the file",
        }
    else:
        import base64

        return {
            "success": True,
            "format": "base64",
            "data": base64.b64encode(data).decode(),
            "size": len(data),
        }


def main() -> None:
    """MCP 서버를 시작합니다."""
    logger.info("Jira Integration Server started on stdio")

    # stdio transport로 실행
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
