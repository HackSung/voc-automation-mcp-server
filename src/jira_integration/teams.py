"""MS Teams 알림 모듈 - Adaptive Card."""

import httpx

from shared.config import get_env_config
from shared.logger import get_logger

logger = get_logger("TeamsNotifier")


class TeamsNotifier:
    """MS Teams Webhook 알림."""

    def __init__(self) -> None:
        config = get_env_config()
        self._webhook_url = config.teams.webhook_url

        if self._webhook_url:
            logger.info("TeamsNotifier initialized with webhook")
        else:
            logger.info("TeamsNotifier initialized (no webhook configured)")

    @property
    def is_configured(self) -> bool:
        """Webhook이 설정되어 있는지 확인합니다."""
        return bool(self._webhook_url)

    async def send_notification(
        self,
        title: str,
        summary: str,
        issue_key: str,
        issue_url: str,
        priority: str,
    ) -> bool:
        """Teams 알림을 전송합니다.

        Args:
            title: 알림 제목
            summary: 요약 내용
            issue_key: Jira 이슈 키
            issue_url: Jira 이슈 URL
            priority: 우선순위

        Returns:
            전송 성공 여부
        """
        if not self._webhook_url:
            logger.warn("Teams notification skipped (no webhook configured)")
            return False

        # 우선순위별 색상
        priority_colors = {
            "Critical": "attention",  # 빨강
            "Blocker": "attention",
            "High": "warning",  # 주황
            "Major": "warning",
            "Medium": "accent",  # 파랑
            "Low": "good",  # 초록
            "Minor": "good",
            "Trivial": "good",
        }
        color = priority_colors.get(priority, "default")

        # Adaptive Card 페이로드
        payload = {
            "type": "message",
            "attachments": [
                {
                    "contentType": "application/vnd.microsoft.card.adaptive",
                    "contentUrl": None,
                    "content": {
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "type": "AdaptiveCard",
                        "version": "1.4",
                        "body": [
                            {
                                "type": "TextBlock",
                                "text": f"🎫 {title}",
                                "weight": "bolder",
                                "size": "medium",
                                "wrap": True,
                            },
                            {
                                "type": "FactSet",
                                "facts": [
                                    {"title": "이슈 키", "value": issue_key},
                                    {"title": "우선순위", "value": priority},
                                ],
                            },
                            {
                                "type": "TextBlock",
                                "text": summary[:500] if summary else "내용 없음",
                                "wrap": True,
                                "maxLines": 5,
                            },
                        ],
                        "actions": [
                            {
                                "type": "Action.OpenUrl",
                                "title": "Jira에서 보기",
                                "url": issue_url,
                            }
                        ],
                        "msteams": {
                            "width": "Full",
                        },
                    },
                }
            ],
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self._webhook_url,
                    json=payload,
                    timeout=10.0,
                )

            if response.status_code == 200:
                logger.info("Teams notification sent", {"issue_key": issue_key})
                return True
            else:
                logger.error(
                    "Teams notification failed",
                    {"status": response.status_code, "body": response.text},
                )
                return False

        except Exception as e:
            logger.error("Teams notification error", e)
            return False

    def send_notification_sync(
        self,
        title: str,
        summary: str,
        issue_key: str,
        issue_url: str,
        priority: str,
    ) -> bool:
        """Teams 알림을 동기적으로 전송합니다."""
        if not self._webhook_url:
            logger.warn("Teams notification skipped (no webhook configured)")
            return False

        # 우선순위별 색상
        priority_colors = {
            "Critical": "attention",
            "Blocker": "attention",
            "High": "warning",
            "Major": "warning",
            "Medium": "accent",
            "Low": "good",
            "Minor": "good",
            "Trivial": "good",
        }

        payload = {
            "type": "message",
            "attachments": [
                {
                    "contentType": "application/vnd.microsoft.card.adaptive",
                    "contentUrl": None,
                    "content": {
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "type": "AdaptiveCard",
                        "version": "1.4",
                        "body": [
                            {
                                "type": "TextBlock",
                                "text": f"🎫 {title}",
                                "weight": "bolder",
                                "size": "medium",
                                "wrap": True,
                            },
                            {
                                "type": "FactSet",
                                "facts": [
                                    {"title": "이슈 키", "value": issue_key},
                                    {"title": "우선순위", "value": priority},
                                ],
                            },
                            {
                                "type": "TextBlock",
                                "text": summary[:500] if summary else "내용 없음",
                                "wrap": True,
                                "maxLines": 5,
                            },
                        ],
                        "actions": [
                            {
                                "type": "Action.OpenUrl",
                                "title": "Jira에서 보기",
                                "url": issue_url,
                            }
                        ],
                    },
                }
            ],
        }

        try:
            with httpx.Client() as client:
                response = client.post(
                    self._webhook_url,
                    json=payload,
                    timeout=10.0,
                )

            if response.status_code == 200:
                logger.info("Teams notification sent", {"issue_key": issue_key})
                return True
            else:
                logger.error(
                    "Teams notification failed",
                    {"status": response.status_code, "body": response.text},
                )
                return False

        except Exception as e:
            logger.error("Teams notification error", e)
            return False
