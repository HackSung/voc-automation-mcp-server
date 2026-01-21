# 기여 가이드

VOC 자동화 MCP 서버 프로젝트에 기여해주셔서 감사합니다!

## 개발 환경

- Node.js 18+
- npm 9+

## 로컬 실행/테스트

이 프로젝트는 **런타임에 env 파일을 자동 로드하지 않습니다.**  
필요한 환경변수는 다음 중 하나로 주입하세요.

- Cursor 사용 시: `~/.cursor/mcp.json`의 `mcpServers.<server>.env`
- 로컬 실행 시: 셸/OS 환경변수(export)

### 빌드

```bash
npm install
npm run build
```

### 타입체크

```bash
npx tsc --noEmit
```

## 커밋/PR 체크리스트

- 민감 정보(토큰/키/개인정보)가 커밋에 포함되지 않음
- `npm run build` 성공
- 문서 변경 시 관련 문서 업데이트

