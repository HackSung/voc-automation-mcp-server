#!/usr/bin/env node

/**
 * Jira 이슈 생성 테스트
 * 사용자가 요청한 스펙대로 이슈를 생성합니다.
 */

const https = require('https');
const http = require('http');
const { config } = require('dotenv');
const path = require('path');

// .env 파일 로드
config({ path: path.join(__dirname, '.env') });

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const ASSIGNEE_AUTH = process.env.ASSIGNEE_AUTH;

console.log('🎫 Jira 이슈 생성 테스트\n');

// 환경변수 검증
if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('❌ .env 파일에 Jira 설정이 필요합니다:');
  console.error('   JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN\n');
  console.error('💡 .env 파일을 열어서 실제 Jira 정보로 수정하세요.');
  console.error('   예: JIRA_BASE_URL=https://mycompany.atlassian.net');
  process.exit(1);
}

// 플레이스홀더 확인
if (JIRA_BASE_URL.includes('your-company') || JIRA_EMAIL.includes('your-email')) {
  console.error('❌ .env 파일이 아직 실제 값으로 설정되지 않았습니다!\n');
  console.error('현재 설정:');
  console.error(`  JIRA_BASE_URL: ${JIRA_BASE_URL}`);
  console.error(`  JIRA_EMAIL: ${JIRA_EMAIL}\n`);
  console.error('💡 다음 단계:');
  console.error('   1. .env 파일 열기');
  console.error('   2. JIRA_BASE_URL을 실제 Jira URL로 변경');
  console.error('   3. JIRA_EMAIL을 본인 이메일로 변경');
  console.error('   4. JIRA_API_TOKEN을 실제 토큰으로 변경\n');
  console.error('🔑 Jira API 토큰 발급:');
  console.error('   https://id.atlassian.com/manage-profile/security/api-tokens\n');
  process.exit(1);
}

console.log('✅ 환경변수 확인됨');
console.log(`   Jira URL: ${JIRA_BASE_URL}`);
console.log(`   이메일: ${JIRA_EMAIL}`);
if (ASSIGNEE_AUTH) {
  console.log(`   Authentication 담당자: ${ASSIGNEE_AUTH}`);
}
console.log();

// Authentication header (supports both Basic Auth and Bearer token)
function getAuthHeader() {
  // Check if token is a Bearer token (Jira Server/Data Center)
  // Bearer tokens don't contain colons and are typically 40+ characters
  if (JIRA_API_TOKEN.length > 30 && !JIRA_API_TOKEN.includes(':') && !JIRA_API_TOKEN.startsWith('ATATT')) {
    console.log('🔑 Bearer 토큰 인증 사용 (Jira Server/Data Center)');
    return `Bearer ${JIRA_API_TOKEN}`;
  }
  // Basic Auth for Jira Cloud (Atlassian API tokens start with ATATT)
  console.log('🔑 Basic 인증 사용 (Jira Cloud)');
  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  return `Basic ${auth}`;
}

function callJiraAPI(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${JIRA_BASE_URL}${endpoint}`);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    if (data) {
      const body = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = lib.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = responseBody ? JSON.parse(responseBody) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, data: parsed });
          } else {
            reject({
              status: res.statusCode,
              error: parsed,
              rawBody: responseBody,
            });
          }
        } catch (e) {
          reject({
            status: res.statusCode,
            error: 'Failed to parse response',
            rawBody: responseBody,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({ error: error.message });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function createIssue() {
  try {
    console.log('📝 이슈 생성 중...\n');
    console.log('요청 내용:');
    console.log('  - 프로젝트: VRBT');
    console.log('  - 타입: Work');
    console.log('  - 제목: 로그인 오류 발생');
    console.log('  - 설명: 사용자가 로그인 시 AUTH_001 에러가 발생합니다.');
    console.log('  - 우선순위: Major');
    console.log('  - 컴포넌트: [VOC]');
    console.log('  - 카테고리: authentication');
    console.log();

    // 이슈 데이터 구성 (Jira REST API v2 스펙)
    const issueData = {
      fields: {
        project: { key: 'VRBT' },
        summary: '로그인 오류 발생',
        description: '사용자가 로그인 시 AUTH_001 에러가 발생합니다.\n\n' +
          '카테고리: authentication\n' +
          '자동 생성: VOC 자동화 MCP 서버',
        issuetype: { name: 'Work' },
        priority: { name: 'Major' },
        components: [{ name: '[VOC]' }],
      },
    };

    // 카테고리별 자동 할당 (authentication -> ASSIGNEE_AUTH)
    if (ASSIGNEE_AUTH) {
      issueData.fields.assignee = { accountId: ASSIGNEE_AUTH };
      console.log(`✅ 자동 할당: authentication -> ${ASSIGNEE_AUTH}\n`);
    }

    // API 호출
    const result = await callJiraAPI('POST', '/rest/api/2/issue', issueData);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Jira 이슈 생성 성공!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`이슈 키: ${result.data.key}`);
    console.log(`이슈 ID: ${result.data.id}`);
    console.log(`URL: ${JIRA_BASE_URL}/browse/${result.data.key}\n`);

    // 이슈 상세 조회
    console.log('📋 생성된 이슈 확인 중...');
    const issueDetail = await callJiraAPI('GET', `/rest/api/2/issue/${result.data.key}`);
    
    console.log('\n✅ 이슈 상세 정보:');
    console.log(`  제목: ${issueDetail.data.fields.summary}`);
    console.log(`  타입: ${issueDetail.data.fields.issuetype.name}`);
    console.log(`  상태: ${issueDetail.data.fields.status.name}`);
    console.log(`  우선순위: ${issueDetail.data.fields.priority.name}`);
    if (issueDetail.data.fields.assignee) {
      console.log(`  담당자: ${issueDetail.data.fields.assignee.displayName}`);
    }
    if (issueDetail.data.fields.components && issueDetail.data.fields.components.length > 0) {
      console.log(`  컴포넌트: ${issueDetail.data.fields.components.map(c => c.name).join(', ')}`);
    }
    console.log();

    console.log('🎉 테스트 완료!\n');
    console.log('💡 이제 Cursor에서 사용하세요:');
    console.log('   Cursor를 재시작한 후 채팅에 다음과 같이 입력하세요:');
    console.log('   "Jira 이슈를 생성해줘: ..."');
    console.log('   Cursor가 자동으로 createJiraIssue MCP 도구를 호출합니다.\n');

  } catch (error) {
    console.error('\n❌ 이슈 생성 실패!\n');
    
    if (error.status) {
      console.error(`HTTP Status: ${error.status}`);
    }
    
    if (error.error) {
      console.error('\n에러 상세:');
      console.error(JSON.stringify(error.error, null, 2));
    }
    
    if (error.rawBody) {
      console.error('\n응답 내용:', error.rawBody);
    }

    console.error('\n💡 문제 해결:\n');
    
    // 구체적인 에러 메시지에 따른 안내
    if (error.status === 404) {
      console.error('❌ 404 에러: 프로젝트 또는 필드를 찾을 수 없습니다.');
      console.error('   - 프로젝트 키 "VOC"가 존재하는지 확인');
      console.error('   - 이슈 타입 "Work"가 프로젝트에 있는지 확인');
      console.error('   - 우선순위 "Major"가 설정되어 있는지 확인');
      console.error('   - 컴포넌트 "VOC"가 프로젝트에 있는지 확인\n');
    } else if (error.status === 401) {
      console.error('❌ 401 에러: 인증 실패');
      console.error('   - JIRA_EMAIL이 정확한지 확인');
      console.error('   - JIRA_API_TOKEN이 유효한지 확인\n');
    } else if (error.status === 403) {
      console.error('❌ 403 에러: 권한 없음');
      console.error('   - 프로젝트 "VOC"에 이슈 생성 권한이 있는지 확인\n');
    } else if (error.error && error.error.errors) {
      console.error('❌ 필드 에러:');
      Object.keys(error.error.errors).forEach(field => {
        console.error(`   - ${field}: ${error.error.errors[field]}`);
      });
      console.error();
    }

    console.error('🔧 대안:');
    console.error('   1. node test-jira.cjs 실행하여 프로젝트 정보 확인');
    console.error('   2. Jira에서 직접 프로젝트 설정 확인');
    console.error('   3. 이슈 타입을 "Task"로 변경');
    console.error('   4. 우선순위를 "High"로 변경');
    console.error('   5. 컴포넌트 없이 테스트\n');

    process.exit(1);
  }
}

createIssue();

