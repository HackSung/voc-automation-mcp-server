# 사용 예시

## Cursor 설정

환경변수는 `~/.cursor/mcp.json`의 각 서버 설정(`mcpServers.<server>`의 `env`)에 입력합니다.

## VOC 처리 흐름 (요약)

1. `detectAndAnonymizePII`로 개인정보 자동 비식별화
2. 익명화된 텍스트로 VOC 분석 프롬프트 생성
3. 분석 결과 파싱
4. Jira 티켓 생성/코멘트 추가
5. 세션 정리

