"""에러 코드 해석기."""

from dataclasses import dataclass

from shared.logger import get_logger

logger = get_logger("ErrorResolver")


@dataclass
class ErrorContext:
    """에러 컨텍스트."""

    category: str
    description: str
    possible_causes: list[str]
    solutions: list[str]


# 에러 코드 사전
ERROR_CODES: dict[str, ErrorContext] = {
    # 인증 관련
    "AUTH_001": ErrorContext(
        category="인증",
        description="인증 토큰 만료 또는 유효하지 않음",
        possible_causes=[
            "세션 만료 (30분 이상 미사용)",
            "다른 기기에서 로그인",
            "비밀번호 변경 후 재로그인 필요",
        ],
        solutions=[
            "로그아웃 후 재로그인",
            "브라우저 캐시 및 쿠키 삭제",
            "비밀번호 재설정",
        ],
    ),
    "AUTH_002": ErrorContext(
        category="인증",
        description="비밀번호 불일치",
        possible_causes=[
            "잘못된 비밀번호 입력",
            "Caps Lock 활성화",
            "비밀번호 변경 후 이전 비밀번호 사용",
        ],
        solutions=[
            "비밀번호 확인 후 재입력",
            "Caps Lock 상태 확인",
            "비밀번호 재설정",
        ],
    ),
    "AUTH_003": ErrorContext(
        category="인증",
        description="계정 잠금",
        possible_causes=[
            "5회 이상 로그인 실패",
            "비정상적인 로그인 시도 감지",
            "보안 정책에 의한 잠금",
        ],
        solutions=[
            "30분 후 재시도",
            "비밀번호 재설정",
            "고객센터 문의",
        ],
    ),
    # 결제 관련
    "BILL_001": ErrorContext(
        category="결제",
        description="결제 수단 유효하지 않음",
        possible_causes=[
            "카드 만료",
            "잔액 부족",
            "카드사 시스템 점검",
        ],
        solutions=[
            "카드 정보 확인 및 업데이트",
            "다른 결제 수단 등록",
            "카드사 문의",
        ],
    ),
    "BILL_002": ErrorContext(
        category="결제",
        description="중복 결제 시도",
        possible_causes=[
            "이미 처리된 결제",
            "결제 진행 중 재시도",
            "시스템 오류로 인한 중복 요청",
        ],
        solutions=[
            "결제 내역 확인",
            "5분 후 재시도",
            "고객센터 문의",
        ],
    ),
    # 구독 관련
    "SUB_001": ErrorContext(
        category="구독",
        description="구독 만료",
        possible_causes=[
            "구독 기간 종료",
            "결제 실패로 인한 자동 해지",
            "사용자 요청에 의한 해지",
        ],
        solutions=[
            "구독 갱신",
            "결제 정보 확인",
            "구독 상태 확인",
        ],
    ),
    "SUB_002": ErrorContext(
        category="구독",
        description="구독 플랜 변경 실패",
        possible_causes=[
            "현재 결제 주기 진행 중",
            "잔여 크레딧 존재",
            "시스템 처리 중",
        ],
        solutions=[
            "현재 주기 종료 후 재시도",
            "크레딧 소진 후 변경",
            "고객센터 문의",
        ],
    ),
    # 성능 관련
    "PERF_001": ErrorContext(
        category="성능",
        description="서비스 응답 지연",
        possible_causes=[
            "서버 부하 증가",
            "네트워크 지연",
            "대용량 데이터 처리 중",
        ],
        solutions=[
            "잠시 후 재시도",
            "네트워크 상태 확인",
            "브라우저 새로고침",
        ],
    ),
    "PERF_002": ErrorContext(
        category="성능",
        description="요청 타임아웃",
        possible_causes=[
            "서버 처리 시간 초과",
            "네트워크 연결 불안정",
            "복잡한 쿼리 실행 중",
        ],
        solutions=[
            "요청 단순화 후 재시도",
            "네트워크 연결 확인",
            "잠시 후 재시도",
        ],
    ),
}


class ErrorResolver:
    """에러 코드 해석기."""

    def __init__(self) -> None:
        logger.info("ErrorResolver initialized", {"errorCodes": len(ERROR_CODES)})

    def resolve(self, error_code: str) -> dict | None:
        """에러 코드를 해석합니다.

        Args:
            error_code: 에러 코드 (예: 'AUTH_001')

        Returns:
            에러 컨텍스트 또는 None
        """
        context = ERROR_CODES.get(error_code.upper())

        if context is None:
            logger.warn("Unknown error code", {"errorCode": error_code})
            return None

        logger.debug("Error resolved", {"errorCode": error_code, "category": context.category})

        return {
            "category": context.category,
            "description": context.description,
            "possibleCauses": context.possible_causes,
            "solutions": context.solutions,
        }

    def get_all_error_codes(self) -> list[str]:
        """모든 에러 코드 목록을 반환합니다.

        Returns:
            에러 코드 목록
        """
        return list(ERROR_CODES.keys())

    def search_by_keyword(self, keyword: str) -> list[dict]:
        """키워드로 에러를 검색합니다.

        Args:
            keyword: 검색 키워드

        Returns:
            매칭되는 에러 목록
        """
        keyword_lower = keyword.lower()
        results = []

        for code, context in ERROR_CODES.items():
            # 카테고리, 설명, 원인, 해결방안에서 검색
            searchable = (
                f"{context.category} {context.description} "
                f"{' '.join(context.possible_causes)} {' '.join(context.solutions)}"
            ).lower()

            if keyword_lower in searchable:
                results.append(
                    {
                        "errorCode": code,
                        "category": context.category,
                        "description": context.description,
                    }
                )

        logger.debug("Search completed", {"keyword": keyword, "resultCount": len(results)})
        return results
