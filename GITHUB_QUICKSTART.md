# GitHub Quickstart

## 1) 의존성 설치 및 빌드

```bash
# uv 설치 (없는 경우)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 의존성 설치
uv sync

# 패키지 임포트 확인
uv run python -c "from pii_security.detector import PIIDetector; print('OK')"
```

## 2) 민감 정보 검사 (선택)

```bash
# API 키 노출 확인
grep -r "sk-proj\|sk-ant" src/ --include="*.py"
# 결과가 없어야 함 ✅
```

## 3) Commit & Push

```bash
git add .
git commit -m "chore: initial import"
git push -u origin main
```

---

**Version**: 2.0.0 (Python/FastMCP)
