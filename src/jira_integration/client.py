"""Jira REST API 클라이언트."""

import base64
import re
import time
from dataclasses import dataclass
from typing import Any

import httpx

from shared.config import JiraConfig, get_env_config
from shared.logger import get_logger
from shared.retry import RetryableError, retry_sync_with_backoff

from .assignee import AssigneeResolver

logger = get_logger("JiraClient")


def normalize_description_for_jira(description: str) -> str:
    """Jira Wiki Markup에 맞게 설명을 정규화합니다.

    Markdown 헤딩(##)을 Jira 위키 헤딩(h2.)으로 변환합니다.
    코드 블록 내부는 변환하지 않습니다.
    """
    lines = (description or "").replace("\r\n", "\n").split("\n")
    in_code_block = False
    result = []

    for line in lines:
        trimmed = line.lstrip()
        if trimmed.startswith("```"):
            in_code_block = not in_code_block
            result.append(line)
            continue

        if in_code_block:
            result.append(line)
            continue

        # Markdown 헤딩을 Jira 위키 헤딩으로 변환
        match = re.match(r"^\s*(#{1,6})\s+(.*)$", line)
        if match:
            level = len(match.group(1))
            title = match.group(2).strip()
            if title:
                result.append(f"h{level}. {title}")
                continue

        result.append(line)

    return "\n".join(result)


@dataclass
class CreateIssueResult:
    """이슈 생성 결과."""

    issue_key: str
    issue_id: str
    url: str
    created: bool
    assignee_requested: str | None = None
    assignee_final_display_name: str | None = None
    assignee_final_username: str | None = None
    assignee_applied: bool = False


@dataclass
class AddCommentResult:
    """코멘트 추가 결과."""

    comment_id: str
    added: bool


@dataclass
class TransitionResult:
    """상태 전환 결과."""

    success: bool
    current_status: str


@dataclass
class Attachment:
    """첨부파일 정보."""

    id: str
    filename: str
    size: int
    mime_type: str
    created: str
    author: str
    content: str  # 다운로드 URL


class JiraClient:
    """Jira REST API 클라이언트.

    Jira Server/Data Center와 Jira Cloud 모두 지원합니다.
    """

    def __init__(self, config: JiraConfig | None = None) -> None:
        """클라이언트를 초기화합니다.

        Args:
            config: Jira 설정 (없으면 환경변수에서 로드)
        """
        if config is None:
            env_config = get_env_config()
            config = env_config.jira

        self._config = config
        self._assignee_resolver = AssigneeResolver()
        self._assignee_field_mode: str = "name"  # "name" or "accountId"
        self._assignee_mode_detected = False

        logger.info("JiraClient initialized", {"base_url": config.base_url})

    def _get_auth_header(self) -> str:
        """인증 헤더를 반환합니다."""
        token = self._config.api_token

        # Bearer 토큰인지 확인 (30자 이상, 콜론 없음)
        if len(token) > 30 and ":" not in token:
            logger.debug("Using Bearer token authentication (Jira Server)")
            return f"Bearer {token}"

        # Basic Auth
        logger.debug("Using Basic authentication (Jira Server/Data Center)")
        credentials = f"{self._config.email}:{token}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"

    def _build_assignee_field(self, assignee: str) -> dict[str, str]:
        """담당자 필드를 빌드합니다."""
        trimmed = assignee.strip()
        if self._assignee_field_mode == "accountId":
            return {"accountId": trimmed}
        return {"name": trimmed}

    def _detect_assignee_mode(self) -> None:
        """Jira 배포 유형을 감지하여 담당자 필드 모드를 결정합니다."""
        if self._assignee_mode_detected:
            return

        self._assignee_mode_detected = True

        try:
            with httpx.Client() as client:
                response = client.get(
                    f"{self._config.base_url}/rest/api/2/serverInfo",
                    headers={"Authorization": self._get_auth_header()},
                    timeout=10.0,
                )

            if not response.is_success:
                return

            data = response.json()
            deployment_type = str(data.get("deploymentType", "")).lower()

            if deployment_type == "cloud":
                self._assignee_field_mode = "accountId"
                logger.info("Detected Jira Cloud; using assignee.accountId mode")
            elif deployment_type:
                self._assignee_field_mode = "name"
                logger.info(
                    "Detected Jira deployment; using assignee.name mode",
                    {"deploymentType": deployment_type},
                )

        except Exception as e:
            logger.debug(
                "Failed to detect Jira deployment type; defaulting to assignee.name mode",
                {"error": str(e)},
            )

    def _set_assignee(self, issue_key: str, assignee: str) -> None:
        """이슈에 담당자를 설정합니다."""
        trimmed = assignee.strip()
        if not trimmed:
            return

        self._detect_assignee_mode()

        # 두 가지 모드 시도
        try_modes = (
            ["accountId", "name"]
            if self._assignee_field_mode == "accountId"
            else ["name", "accountId"]
        )

        last_error: dict[str, Any] | None = None

        for mode in try_modes:

            def _try_set() -> dict[str, Any]:
                body = {"accountId": trimmed} if mode == "accountId" else {"name": trimmed}

                with httpx.Client() as client:
                    response = client.put(
                        f"{self._config.base_url}/rest/api/2/issue/{issue_key}/assignee",
                        headers={
                            "Authorization": self._get_auth_header(),
                            "Content-Type": "application/json",
                        },
                        json=body,
                        timeout=10.0,
                    )

                if response.is_success:
                    return {"ok": True}

                error_text = response.text
                status = response.status_code

                # 인증/권한 오류는 재시도하지 않음
                if status in (401, 403):
                    raise RetryableError(
                        f"Failed to set assignee (auth/permission): {status} - {error_text}",
                        status_code=status,
                        retryable=False,
                    )

                # 400/404는 다른 모드 시도
                if status in (400, 404):
                    return {"ok": False, "status": status, "error": error_text, "mode": mode}

                raise RetryableError(
                    f"Failed to set assignee: {status} - {error_text}",
                    status_code=status,
                )

            result = retry_sync_with_backoff(_try_set)

            if result.get("ok"):
                if self._assignee_field_mode != mode:
                    self._assignee_field_mode = mode
                    logger.info("Assignee mode updated after successful set", {"mode": mode})
                return

            last_error = result

        if last_error:
            raise RetryableError(
                f"Failed to set assignee after trying modes ({', '.join(try_modes)}). "
                f"Last error ({last_error.get('mode')}): {last_error.get('status')} - {last_error.get('error')}",
                status_code=last_error.get("status"),
            )

    def _get_assignee_info(self, issue_key: str) -> dict[str, str | None]:
        """이슈의 담당자 정보를 가져옵니다."""
        try:
            with httpx.Client() as client:
                response = client.get(
                    f"{self._config.base_url}/rest/api/2/issue/{issue_key}?fields=assignee",
                    headers={"Authorization": self._get_auth_header()},
                    timeout=10.0,
                )

            if not response.is_success:
                return {"displayName": None, "username": None}

            data = response.json()
            assignee = data.get("fields", {}).get("assignee") or {}

            return {
                "displayName": assignee.get("displayName"),
                "username": assignee.get("name"),
            }

        except Exception:
            return {"displayName": None, "username": None}

    def create_issue(
        self,
        summary: str,
        description: str,
        priority: str,
        project: str | None = None,
        issue_type: str = "Work",
        labels: list[str] | None = None,
        components: list[str] | None = None,
        category: str | None = None,
        assignee: str | None = None,
    ) -> CreateIssueResult:
        """Jira 이슈를 생성합니다.

        Args:
            summary: 이슈 제목
            description: 이슈 설명
            priority: 우선순위
            project: 프로젝트 키 (기본값: 환경변수)
            issue_type: 이슈 유형 (기본값: Work)
            labels: 라벨 목록
            components: 컴포넌트 목록
            category: 카테고리 (담당자 자동 할당용)
            assignee: 담당자 (직접 지정)

        Returns:
            생성 결과
        """
        project_key = project or self._config.project_key

        logger.info(
            "Creating Jira issue",
            {"project": project_key, "issueType": issue_type, "priority": priority},
        )

        # 담당자 자동 결정
        resolved_assignee = assignee

        # 1순위: VOC 내용에서 키워드 감지
        if not resolved_assignee:
            resolved_assignee = self._assignee_resolver.resolve_from_text(summary, description)

        # 2순위: 카테고리 기반 할당
        if not resolved_assignee and category:
            resolved_assignee = self._assignee_resolver.resolve(category)

        # 페이로드 구성
        payload: dict[str, Any] = {
            "fields": {
                "project": {"key": project_key},
                "summary": summary,
                "description": normalize_description_for_jira(description),
                "issuetype": {"name": issue_type},
                "priority": {"name": priority},
                "labels": labels or [],
            }
        }

        # 컴포넌트 추가
        if components:
            payload["fields"]["components"] = [{"name": c} for c in components]

        # 담당자 추가
        if resolved_assignee and resolved_assignee.strip():
            self._detect_assignee_mode()
            payload["fields"]["assignee"] = self._build_assignee_field(resolved_assignee)
            logger.debug(
                "Adding assignee to payload",
                {"assignee": resolved_assignee, "mode": self._assignee_field_mode},
            )

        def _create() -> dict[str, Any]:
            with httpx.Client() as client:
                response = client.post(
                    f"{self._config.base_url}/rest/api/2/issue",
                    headers={
                        "Authorization": self._get_auth_header(),
                        "Content-Type": "application/json",
                    },
                    json=payload,
                    timeout=30.0,
                )

            if not response.is_success:
                raise RetryableError(
                    f"Jira API error: {response.status_code} - {response.text}",
                    status_code=response.status_code,
                )

            return response.json()

        result = retry_sync_with_backoff(_create)

        issue_key = result["key"]
        issue_id = result["id"]

        logger.info("Jira issue created", {"issueKey": issue_key, "issueId": issue_id})

        # 담당자 재적용 (Jira 자동화에 의해 덮어쓰기될 수 있음)
        assignee_final_display_name: str | None = None
        assignee_final_username: str | None = None
        assignee_applied = False

        if resolved_assignee and resolved_assignee.strip():
            try:
                self._set_assignee(issue_key, resolved_assignee)
                final_assignee = self._get_assignee_info(issue_key)
                assignee_final_display_name = final_assignee.get("displayName")
                assignee_final_username = final_assignee.get("username")

                # 적용 확인, 필요시 재시도
                if assignee_final_username and assignee_final_username != resolved_assignee:
                    time.sleep(1)
                    self._set_assignee(issue_key, resolved_assignee)
                    final_assignee = self._get_assignee_info(issue_key)
                    assignee_final_display_name = final_assignee.get("displayName")
                    assignee_final_username = final_assignee.get("username")

                assignee_applied = bool(
                    assignee_final_username and assignee_final_username == resolved_assignee
                )

                logger.info(
                    "Assignee applied after create",
                    {
                        "issueKey": issue_key,
                        "assigneeRequested": resolved_assignee,
                        "assigneeFinal": assignee_final_display_name,
                    },
                )

            except Exception as e:
                logger.warn(
                    "Failed to apply assignee after create",
                    {"issueKey": issue_key, "error": str(e)},
                )

        return CreateIssueResult(
            issue_key=issue_key,
            issue_id=issue_id,
            url=f"{self._config.base_url}/browse/{issue_key}",
            created=True,
            assignee_requested=resolved_assignee,
            assignee_final_display_name=assignee_final_display_name,
            assignee_final_username=assignee_final_username,
            assignee_applied=assignee_applied,
        )

    def add_comment(self, issue_key: str, comment: str) -> AddCommentResult:
        """이슈에 코멘트를 추가합니다."""
        logger.info("Adding comment to issue", {"issueKey": issue_key})

        def _add() -> dict[str, Any]:
            with httpx.Client() as client:
                response = client.post(
                    f"{self._config.base_url}/rest/api/2/issue/{issue_key}/comment",
                    headers={
                        "Authorization": self._get_auth_header(),
                        "Content-Type": "application/json",
                    },
                    json={"body": normalize_description_for_jira(comment)},
                    timeout=30.0,
                )

            if not response.is_success:
                raise RetryableError(
                    f"Failed to add comment: {response.status_code} - {response.text}",
                    status_code=response.status_code,
                )

            return response.json()

        result = retry_sync_with_backoff(_add)

        logger.info("Comment added", {"issueKey": issue_key, "commentId": result["id"]})

        return AddCommentResult(comment_id=result["id"], added=True)

    def transition_issue(self, issue_key: str, transition_name: str) -> TransitionResult:
        """이슈 상태를 변경합니다."""
        logger.info("Transitioning issue", {"issueKey": issue_key, "transitionName": transition_name})

        # 가능한 전환 조회
        with httpx.Client() as client:
            response = client.get(
                f"{self._config.base_url}/rest/api/2/issue/{issue_key}/transitions",
                headers={"Authorization": self._get_auth_header()},
                timeout=10.0,
            )

        if not response.is_success:
            raise ValueError(f"Failed to get transitions: {response.status_code}")

        transitions_data = response.json()
        transition = next(
            (
                t
                for t in transitions_data.get("transitions", [])
                if t.get("name", "").lower() == transition_name.lower()
            ),
            None,
        )

        if not transition:
            raise ValueError(f"Transition '{transition_name}' not available for issue {issue_key}")

        # 전환 실행
        def _transition() -> None:
            with httpx.Client() as client:
                response = client.post(
                    f"{self._config.base_url}/rest/api/2/issue/{issue_key}/transitions",
                    headers={
                        "Authorization": self._get_auth_header(),
                        "Content-Type": "application/json",
                    },
                    json={"transition": {"id": transition["id"]}},
                    timeout=30.0,
                )

            if not response.is_success:
                raise RetryableError(
                    f"Failed to transition: {response.status_code} - {response.text}",
                    status_code=response.status_code,
                )

        retry_sync_with_backoff(_transition)

        new_status = transition.get("to", {}).get("name", "Unknown")
        logger.info("Issue transitioned", {"issueKey": issue_key, "newStatus": new_status})

        return TransitionResult(success=True, current_status=new_status)

    def get_issue(self, issue_key: str) -> dict[str, Any]:
        """이슈 정보를 가져옵니다."""
        logger.debug("Fetching issue", {"issueKey": issue_key})

        with httpx.Client() as client:
            response = client.get(
                f"{self._config.base_url}/rest/api/2/issue/{issue_key}",
                headers={"Authorization": self._get_auth_header()},
                timeout=10.0,
            )

        if not response.is_success:
            raise ValueError(f"Failed to get issue: {response.status_code}")

        return response.json()

    def get_attachments(self, issue_key: str) -> dict[str, Any]:
        """이슈의 첨부파일 목록을 가져옵니다."""
        logger.info("Fetching attachments", {"issueKey": issue_key})

        issue = self.get_issue(issue_key)
        attachments_data = issue.get("fields", {}).get("attachment", [])

        attachments = [
            Attachment(
                id=att.get("id", ""),
                filename=att.get("filename", ""),
                size=att.get("size", 0),
                mime_type=att.get("mimeType", ""),
                created=att.get("created", ""),
                author=att.get("author", {}).get("displayName")
                or att.get("author", {}).get("name", "Unknown"),
                content=att.get("content", ""),
            )
            for att in attachments_data
        ]

        logger.info(
            "Attachments fetched",
            {"issueKey": issue_key, "count": len(attachments)},
        )

        return {
            "issueKey": issue_key,
            "count": len(attachments),
            "attachments": [
                {
                    "id": a.id,
                    "filename": a.filename,
                    "size": a.size,
                    "mimeType": a.mime_type,
                    "created": a.created,
                    "author": a.author,
                    "content": a.content,
                }
                for a in attachments
            ],
        }

    def download_attachment(self, attachment_url: str, as_base64: bool = True) -> str | bytes:
        """첨부파일을 다운로드합니다."""
        logger.info("Downloading attachment", {"url": attachment_url})

        def _download() -> bytes:
            with httpx.Client() as client:
                response = client.get(
                    attachment_url,
                    headers={"Authorization": self._get_auth_header()},
                    timeout=60.0,
                )

            if not response.is_success:
                raise RetryableError(
                    f"Failed to download attachment: {response.status_code} {response.reason_phrase}",
                    status_code=response.status_code,
                )

            return response.content

        data = retry_sync_with_backoff(_download)

        logger.info(
            "Attachment downloaded",
            {"size": len(data), "sizeKB": f"{len(data) / 1024:.2f}"},
        )

        if as_base64:
            return base64.b64encode(data).decode()

        return data
