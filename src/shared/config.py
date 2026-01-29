"""환경변수 설정 및 검증 모듈.

NOTE:
이 프로젝트는 런타임에 .env 파일을 로드하지 않습니다.
MCP 서버는 ~/.cursor/mcp.json (mcpServers.<server>.env) 또는
프로세스 환경변수를 통해 설정을 받습니다.
"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings


class JiraConfig(BaseSettings):
    """Jira 연동 설정."""

    base_url: str = ""
    email: str = ""
    api_token: str = ""
    project_key: str = "VRBT"

    model_config = {"env_prefix": "JIRA_"}


class AssigneeConfig(BaseSettings):
    """담당자 자동 할당 설정."""

    default: str | None = None
    auth: str | None = None
    billing: str | None = None
    subscription: str | None = None
    perf: str | None = None
    ui: str | None = None
    bizring: str | None = None

    model_config = {"env_prefix": "ASSIGNEE_"}


class BitbucketConfig(BaseSettings):
    """Bitbucket 연동 설정."""

    base_url: str = ""
    username: str | None = None
    token: str = ""
    project_key: str | None = None
    repo_slug: str | None = None

    model_config = {"env_prefix": "BITBUCKET_"}


class InternalApiConfig(BaseSettings):
    """내부 API 연동 설정."""

    base_url: str = ""
    api_key: str = ""

    model_config = {"env_prefix": "INTERNAL_API_"}


class TeamsConfig(BaseSettings):
    """MS Teams 알림 설정."""

    webhook_url: str | None = None

    model_config = {"env_prefix": "TEAMS_"}


class LLMConfig(BaseSettings):
    """LLM API 설정 (선택사항 - 임베딩 검색용)."""

    openai_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    anthropic_key: str | None = Field(default=None, alias="ANTHROPIC_API_KEY")

    model_config = {"populate_by_name": True}


class PIIConfig(BaseSettings):
    """PII 보안 설정."""

    session_ttl: int = 3600000  # 1시간 (밀리초)

    model_config = {"env_prefix": "PII_"}


class EnvConfig(BaseSettings):
    """통합 환경 설정."""

    jira: JiraConfig = Field(default_factory=JiraConfig)
    assignees: AssigneeConfig = Field(default_factory=AssigneeConfig)
    bitbucket: BitbucketConfig = Field(default_factory=BitbucketConfig)
    internal_api: InternalApiConfig = Field(default_factory=InternalApiConfig)
    teams: TeamsConfig = Field(default_factory=TeamsConfig)
    llm: LLMConfig = Field(default_factory=LLMConfig)
    pii: PIIConfig = Field(default_factory=PIIConfig)


@lru_cache
def get_env_config() -> EnvConfig:
    """환경 설정을 가져옵니다 (캐싱됨)."""
    return EnvConfig()


def validate_env(required_vars: list[str]) -> None:
    """필수 환경변수가 설정되어 있는지 검증합니다.

    Args:
        required_vars: 필수 환경변수 이름 목록

    Raises:
        ValueError: 누락된 환경변수가 있는 경우
    """
    import os

    missing: list[str] = []

    for var_name in required_vars:
        if not os.environ.get(var_name):
            missing.append(var_name)

    if missing:
        raise ValueError(
            f"Missing required environment variables:\n"
            + "\n".join(f"  - {v}" for v in missing)
        )
