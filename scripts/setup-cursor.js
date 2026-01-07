#!/usr/bin/env node

/**
 * Cursor MCP 자동 설정 스크립트
 * 
 * 이 스크립트는 사용자의 Cursor 설정을 자동으로 구성합니다.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HOME = homedir();
const CURSOR_CONFIG_DIR = join(HOME, '.cursor');
const CURSOR_MCP_CONFIG = join(CURSOR_CONFIG_DIR, 'mcp.json');
const PROJECT_ROOT = join(__dirname, '..');

console.log('🚀 Cursor MCP 자동 설정 시작...\n');

// 1. Cursor 설정 디렉토리 확인
if (!existsSync(CURSOR_CONFIG_DIR)) {
  console.log('📁 Cursor 설정 디렉토리 생성:', CURSOR_CONFIG_DIR);
  mkdirSync(CURSOR_CONFIG_DIR, { recursive: true });
}

// 2. 현재 설정 읽기 (있으면)
let existingConfig = {};
if (existsSync(CURSOR_MCP_CONFIG)) {
  console.log('📖 기존 Cursor 설정 읽기...');
  try {
    const content = readFileSync(CURSOR_MCP_CONFIG, 'utf-8');
    existingConfig = JSON.parse(content);
    console.log('   ✓ 기존 설정 발견\n');
  } catch (error) {
    console.warn('   ⚠️  기존 설정 파일이 손상되었습니다. 새로 생성합니다.\n');
  }
}

// 3. 새 MCP 서버 설정 생성
const newServers = {
  'pii-security': {
    command: 'node',
    args: [join(PROJECT_ROOT, 'servers/pii-security-server/dist/index.js')],
    env: {}
  },
  'voc-analysis': {
    command: 'node',
    args: [join(PROJECT_ROOT, 'servers/voc-analysis-server/dist/index.js')],
    env: {}
  },
  'jira-integration': {
    command: 'node',
    args: [join(PROJECT_ROOT, 'servers/jira-integration-server/dist/index.js')],
    env: {}
  },
  'internal-api': {
    command: 'node',
    args: [join(PROJECT_ROOT, 'servers/internal-api-server/dist/index.js')],
    env: {}
  }
};

// 4. 설정 병합
const finalConfig = {
  ...existingConfig,
  mcpServers: {
    ...(existingConfig.mcpServers || {}),
    ...newServers
  }
};

// 5. 설정 파일 저장
console.log('💾 Cursor MCP 설정 저장 중...');
writeFileSync(CURSOR_MCP_CONFIG, JSON.stringify(finalConfig, null, 2), 'utf-8');
console.log('   ✓ 저장 완료:', CURSOR_MCP_CONFIG);
console.log('');

// 6. 환경변수 파일 확인
const ENV_FILE = join(PROJECT_ROOT, '.env');
const ENV_EXAMPLE = join(PROJECT_ROOT, '.env.example');

if (!existsSync(ENV_FILE)) {
  console.log('⚠️  환경변수 파일(.env)이 없습니다!');
  console.log('');
  console.log('다음 명령어로 생성하세요:');
  console.log(`   cp ${ENV_EXAMPLE} ${ENV_FILE}`);
  console.log('');
  console.log('그리고 실제 값을 입력하세요:');
  console.log('   - JIRA_BASE_URL');
  console.log('   - JIRA_EMAIL');
  console.log('   - JIRA_API_TOKEN');
  console.log('   - OPENAI_API_KEY 또는 ANTHROPIC_API_KEY');
  console.log('');
} else {
  console.log('✅ 환경변수 파일 확인 완료');
  console.log('');
}

// 7. 빌드 확인
const servers = ['pii-security-server', 'voc-analysis-server', 'jira-integration-server', 'internal-api-server'];
let allBuilt = true;

console.log('🔍 빌드 상태 확인...');
for (const server of servers) {
  const distPath = join(PROJECT_ROOT, 'servers', server, 'dist', 'index.js');
  if (!existsSync(distPath)) {
    console.log(`   ✗ ${server} 빌드 안됨`);
    allBuilt = false;
  } else {
    console.log(`   ✓ ${server} 빌드 완료`);
  }
}
console.log('');

if (!allBuilt) {
  console.log('⚠️  일부 서버가 빌드되지 않았습니다!');
  console.log('');
  console.log('다음 명령어로 빌드하세요:');
  console.log('   npm run build');
  console.log('');
}

// 8. 완료 메시지
console.log('✨ 설정 완료!\n');
console.log('다음 단계:');
console.log('');
console.log('1. Cursor Editor를 완전히 재시작하세요');
console.log('2. Cursor 채팅창에서 테스트:');
console.log('   "사용 가능한 MCP 도구를 보여줘"');
console.log('');
console.log('3. 16개 이상의 도구가 표시되면 성공! 🎉');
console.log('');
console.log('문제가 있으면 docs/USER_GUIDE.md의 트러블슈팅을 참고하세요.');
console.log('');

