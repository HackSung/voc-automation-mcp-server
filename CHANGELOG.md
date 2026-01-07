# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-07

### Added

#### PII Security Server
- 개인정보 자동 감지 및 비식별화
  - 이메일 주소
  - 전화번호 (한국 형식)
  - 주민등록번호
  - 신용카드 번호
- In-Memory 매핑 저장소 (1시간 TTL)
- 원문 복원 기능
- 세션 자동 정리 메커니즘

#### VOC Analysis Server
- LLM 기반 VOC 분석
  - Intent 분류 (5가지 유형)
  - 우선순위 자동 판단 (4단계)
  - 카테고리 추출
  - 감정 분석
- OpenAI 및 Anthropic 지원
- 임베딩 기반 유사 이슈 검색
- 중복 이슈 감지

#### Jira Integration Server
- Jira 이슈 자동 생성
- 카테고리 기반 담당자 자동 할당
- 이슈 상태 전환
- 코멘트 자동 추가
- MS Teams Adaptive Card 알림

#### Internal API Server
- 레거시 시스템 연동
- 사용자 상태 조회 (구독/인증/해지)
- 에러 컨텍스트 조회 (8가지 표준 에러)
- 에러 로그 조회
- 시스템 헬스체크

#### 공통 유틸리티
- Exponential backoff 재시도 로직
- 민감 정보 마스킹 로거
- 환경변수 검증 및 관리
- TypeScript 완전 지원

#### 문서
- 한글 README.md
- 상세한 사용자 가이드
- API 명세서
- 배포 가이드
- 보안 문서
- Nexus 배포 가이드

#### 예제
- 5가지 VOC 시나리오 샘플
- Cursor 프롬프트 템플릿
- 실전 워크플로우 예제

### Security
- PII 데이터 메모리 전용 저장 (디스크 미기록)
- 1시간 후 자동 삭제
- API 키 환경변수 관리
- 로그에서 민감정보 자동 마스킹
- HTTPS 통신 강제
- LLM에 PII 원문 전송 차단

### Performance
- 병렬 LLM 호출로 분석 속도 향상
- 재시도 로직으로 안정성 확보
- In-Memory 캐싱으로 빠른 응답

### Infrastructure
- Monorepo 구조 (npm workspaces)
- 4개 독립 MCP 서버
- 공유 라이브러리
- 타입 안전성 보장

---

## [Unreleased]

### Planned
- [ ] 더 많은 PII 패턴 지원 (여권번호, 주소 등)
- [ ] VOC 자동 분류 정확도 향상
- [ ] 다국어 지원 강화
- [ ] 실시간 모니터링 대시보드
- [ ] Slack 알림 지원
- [ ] 벡터 DB 연동 (Pinecone, Weaviate)
- [ ] 자동 테스트 추가
- [ ] Docker 이미지 제공

### Known Issues
- 일부 특수 형식의 전화번호 감지 안됨
- LLM 환각 현상 가끔 발생 (재시도로 해결 가능)
- 대량 배치 처리 시 속도 저하

---

## Version History

- **1.0.0** (2026-01-07) - 최초 릴리스

---

## Migration Guide

### From: Manual VOC Processing
### To: Automated VOC Processing

#### Before
1. 고객 VOC 수동 복사
2. 개인정보 직접 확인 및 삭제
3. 수동으로 우선순위 판단
4. Jira 티켓 직접 작성
5. 담당자 수동 할당
6. 이메일/Teams로 수동 공유

**소요 시간**: 약 10-15분/건

#### After
1. VOC 텍스트를 Cursor에 붙여넣기
2. 프롬프트 한 줄 실행
3. 완료

**소요 시간**: 약 30초/건

**효율 개선**: 약 95% 시간 절감

---

## Contributors

- VOC Automation Team
- DevOps Team
- Security Team

---

## Support

- 📧 Email: it-support@your-company.com
- 💬 Slack: #voc-automation
- 📝 Jira: IT-SUPPORT 프로젝트

