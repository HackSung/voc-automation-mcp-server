"""담당자 자동 할당 모듈."""

from shared.config import get_env_config
from shared.logger import get_logger

logger = get_logger("AssigneeResolver")


class AssigneeResolver:
    """카테고리 기반 담당자 자동 할당.

    IMPORTANT:
    - 실제 사용자 이름을 하드코딩하지 않습니다.
    - 환경변수가 없으면 "자동 할당 없음"을 선호합니다.

    NOTE:
    - Jira Server/Data Center는 `assignee.name` (username) 사용
    - Jira Cloud는 `assignee.accountId` 사용
    """

    def __init__(self) -> None:
        config = get_env_config()

        # 기본 담당자
        default = config.assignees.default
        self._default_assignee = default.strip() if default and default.strip() else None

        # Bizring 담당자
        bizring = config.assignees.bizring
        self._bizring_assignee = bizring.strip() if bizring and bizring.strip() else None

        # 카테고리 → 담당자 매핑
        self._category_to_assignee: dict[str, str] = {}

        # 매핑 설정 (빈 값 제외)
        mappings = {
            # 인증 관련
            "authentication": config.assignees.auth,
            "auth": config.assignees.auth,
            "login": config.assignees.auth,
            # 결제 관련
            "billing": config.assignees.billing,
            "payment": config.assignees.billing,
            # 구독 관련 (billing 폴백)
            "subscription": config.assignees.subscription or config.assignees.billing,
            # 성능 관련
            "performance": config.assignees.perf,
            "perf": config.assignees.perf,
            "slow": config.assignees.perf,
            # UI 관련
            "ui": config.assignees.ui,
            "ux": config.assignees.ui,
            "ui-ux": config.assignees.ui,
            "interface": config.assignees.ui,
            # V비즈링 관련
            "bizring": config.assignees.bizring,
            "비즈링": config.assignees.bizring,
            "v비즈링": config.assignees.bizring,
            "vbizring": config.assignees.bizring,
        }

        for key, value in mappings.items():
            if value and value.strip():
                self._category_to_assignee[key] = value.strip()

        logger.info(
            "AssigneeResolver initialized",
            {
                "mappings": len(self._category_to_assignee),
                "hasDefault": bool(self._default_assignee),
            },
        )

    def resolve(self, category: str) -> str | None:
        """카테고리에 맞는 담당자를 반환합니다.

        Args:
            category: VOC 카테고리

        Returns:
            담당자 (username 또는 accountId), 없으면 None
        """
        if not category:
            return self._default_assignee

        # 정규화
        normalized = (
            category.lower()
            .replace("_", "-")
            .replace(" ", "-")
            .replace("/", "-")
            .replace("\\", "-")
        )
        normalized = "-".join(filter(None, normalized.split("-")))

        # Bizring 카테고리 특별 처리
        bizring_markers = ["비즈링", "bizring", "v비즈링", "vbizring"]
        is_bizring = any(m in normalized for m in bizring_markers)

        if is_bizring and not self._bizring_assignee:
            logger.warn(
                "bizring 카테고리이지만 ASSIGNEE_BIZRING 미설정 - 자동 할당 생략",
                {"category": category},
            )
            return None

        # 직접 매칭
        if normalized in self._category_to_assignee:
            assignee = self._category_to_assignee[normalized]
            logger.debug("Assignee resolved", {"category": category, "assignee": assignee})
            return assignee

        # 부분 매칭
        for key, assignee in self._category_to_assignee.items():
            if normalized in key or key in normalized:
                logger.debug(
                    "Assignee resolved (partial match)",
                    {"category": category, "matchedKey": key, "assignee": assignee},
                )
                return assignee

        logger.debug("No assignee found for category", {"category": category})
        return self._default_assignee

    def resolve_multiple(self, categories: list[str]) -> str | None:
        """여러 카테고리에서 담당자를 찾습니다.

        Args:
            categories: 카테고리 목록

        Returns:
            첫 번째로 찾은 담당자
        """
        for category in categories:
            assignee = self.resolve(category)
            if assignee:
                return assignee
        return self._default_assignee

    def resolve_from_text(self, summary: str, description: str) -> str | None:
        """VOC 내용에서 키워드를 감지하여 담당자를 할당합니다.

        Args:
            summary: VOC 제목
            description: VOC 설명

        Returns:
            담당자 또는 None
        """
        text = f"{summary} {description}".lower()

        # V비즈링 관련 키워드 감지
        bizring_keywords = ["비즈링", "bizring", "v비즈링", "vbizring"]
        for keyword in bizring_keywords:
            if keyword in text:
                if not self._bizring_assignee:
                    logger.warn(
                        "V비즈링 키워드 감지했지만 ASSIGNEE_BIZRING 미설정 - 자동 할당 생략",
                        {"keyword": keyword, "summary": summary[:50]},
                    )
                    return None

                logger.info(
                    "V비즈링 관련 VOC 감지 - 담당자 자동 할당",
                    {
                        "keyword": keyword,
                        "assignee": self._bizring_assignee,
                        "summary": summary[:50],
                    },
                )
                return self._bizring_assignee

        return None
