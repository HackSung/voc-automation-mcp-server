"""PII 감지 및 비식별화 모듈."""

import re
from dataclasses import dataclass
from typing import Literal

PIIType = Literal["email", "phone", "ssn", "card", "birthDate"]


@dataclass
class PIIMatch:
    """감지된 PII 정보."""

    type: PIIType
    original: str
    placeholder: str
    position: tuple[int, int]  # (start, end)


@dataclass
class PIIMapping:
    """PII 매핑 정보 (복원용)."""

    placeholder: str
    original: str
    type: str


class PIIDetector:
    """PII 감지 및 비식별화 처리."""

    # PII 감지 패턴
    PATTERNS: dict[PIIType, re.Pattern[str]] = {
        # 이메일
        "email": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),
        # 한국 전화번호 (010-1234-5678, 01012345678, +82-10-1234-5678, 6344-9445)
        "phone": re.compile(
            r"(?:(?:\+82[-\s]?|0)?(?:10|11|16|17|18|19)[-\s]?\d{3,4}[-\s]?\d{4}|\d{4}[\s-]\d{4})"
        ),
        # 주민등록번호 (123456-1234567 or 1234561234567)
        "ssn": re.compile(r"\b\d{6}[-\s]?[1-4]\d{6}\b"),
        # 신용카드 번호 (1234-5678-9012-3456 or 1234567890123456)
        "card": re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b"),
        # 생년월일 (YYYYMMDD: 19721206)
        "birthDate": re.compile(r"\b(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\b"),
    }

    def detect(self, text: str) -> list[PIIMatch]:
        """텍스트에서 PII를 감지합니다.

        Args:
            text: 분석할 텍스트

        Returns:
            감지된 PII 목록 (위치 역순 정렬)
        """
        matches: list[PIIMatch] = []
        counter: dict[str, int] = {pii_type: 0 for pii_type in self.PATTERNS}

        for pii_type, pattern in self.PATTERNS.items():
            for match in pattern.finditer(text):
                counter[pii_type] += 1
                matches.append(
                    PIIMatch(
                        type=pii_type,
                        original=match.group(),
                        placeholder=f"[{pii_type.upper()}_{counter[pii_type]:03d}]",
                        position=(match.start(), match.end()),
                    )
                )

        # 위치 역순 정렬 (뒤에서부터 치환하기 위함)
        matches.sort(key=lambda m: m.position[0], reverse=True)
        return matches

    def anonymize(
        self, text: str, pii_matches: list[PIIMatch]
    ) -> tuple[str, list[PIIMapping]]:
        """텍스트의 PII를 비식별화합니다.

        Args:
            text: 원본 텍스트
            pii_matches: 감지된 PII 목록 (detect 결과)

        Returns:
            (비식별화된 텍스트, 매핑 목록)
        """
        anonymized_text = text
        mappings: list[PIIMapping] = []

        # 뒤에서부터 치환 (인덱스 유지)
        for match in pii_matches:
            start, end = match.position
            anonymized_text = anonymized_text[:start] + match.placeholder + anonymized_text[end:]
            mappings.append(
                PIIMapping(
                    placeholder=match.placeholder,
                    original=match.original,
                    type=match.type,
                )
            )

        return anonymized_text, mappings

    def restore(self, anonymized_text: str, mappings: list[PIIMapping]) -> str:
        """비식별화된 텍스트를 원본으로 복원합니다.

        Args:
            anonymized_text: 비식별화된 텍스트
            mappings: 매핑 목록

        Returns:
            복원된 원본 텍스트
        """
        restored_text = anonymized_text

        for mapping in mappings:
            # 플레이스홀더의 특수문자 이스케이프
            escaped_placeholder = re.escape(mapping.placeholder)
            restored_text = re.sub(escaped_placeholder, mapping.original, restored_text)

        return restored_text
