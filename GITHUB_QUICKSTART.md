# GitHub Quickstart

## 1) Build

```bash
npm install
npm run build
```

## 2) Basic secret scan (optional)

```bash
grep -r "sk-proj\\|sk-ant" . --exclude-dir node_modules --exclude-dir .git
```

## 3) Commit & push

```bash
git add .
git commit -m "chore: initial import"
git push -u origin main
```

