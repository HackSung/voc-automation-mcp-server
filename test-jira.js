#!/usr/bin/env node

/**
 * Jira API 연동 테스트 스크립트
 * 
 * 사용법:
 * node test-jira.js
 * 
 * .env 파일에 다음 설정이 필요합니다:
 * - JIRA_BASE_URL
 * - JIRA_EMAIL
 * - JIRA_API_TOKEN
 */

const https = require('https');
const http = require('http');
const { config } = require('dotenv');
const path = require('path');

// .env 파일 로드
config({ path: path.join(__dirname, '.env') });

// 환경변수 확인
const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

console.log('🔍 Jira 연동 테스트 시작...\n');

// 환경변수 검증
if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('❌ 필수 환경변수가 설정되지 않았습니다:');
  if (!JIRA_BASE_URL) console.error('  - JIRA_BASE_URL');
  if (!JIRA_EMAIL) console.error('  - JIRA_EMAIL');
  if (!JIRA_API_TOKEN) console.error('  - JIRA_API_TOKEN');
  console.error('\n.env 파일을 확인하세요.');
  process.exit(1);
}

console.log('✅ 환경변수 확인:');
console.log(`  - JIRA_BASE_URL: ${JIRA_BASE_URL}`);
console.log(`  - JIRA_EMAIL: ${JIRA_EMAIL}`);
console.log(`  - JIRA_API_TOKEN: ${JIRA_API_TOKEN.substring(0, 10)}...`);
console.log();

// Basic Auth 헤더 생성
const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

// Jira API 호출 함수
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
        'Authorization': `Basic ${auth}`,
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

// 테스트 실행
async function runTests() {
  try {
    // 1. 인증 테스트
    console.log('📝 1단계: Jira 인증 테스트...');
    const authTest = await callJiraAPI('GET', '/rest/api/2/myself');
    console.log('✅ 인증 성공!');
    console.log(`   사용자: ${authTest.data.displayName} (${authTest.data.emailAddress})`);
    console.log();

    // 2. 프로젝트 목록 조회
    console.log('📝 2단계: 프로젝트 목록 조회...');
    const projects = await callJiraAPI('GET', '/rest/api/2/project');
    console.log(`✅ ${projects.data.length}개의 프로젝트 발견:`);
    projects.data.slice(0, 5).forEach(p => {
      console.log(`   - ${p.key}: ${p.name}`);
    });
    if (projects.data.length > 5) {
      console.log(`   ... 외 ${projects.data.length - 5}개`);
    }
    console.log();

    // 사용자에게 프로젝트 키 입력 요청 (첫 번째 프로젝트 사용)
    const projectKey = projects.data[0]?.key;
    if (!projectKey) {
      throw new Error('사용 가능한 프로젝트가 없습니다.');
    }
    console.log(`🎯 테스트용 프로젝트: ${projectKey}`);
    console.log();

    // 3. 이슈 타입 조회
    console.log('📝 3단계: 이슈 타입 조회...');
    const project = await callJiraAPI('GET', `/rest/api/2/project/${projectKey}`);
    console.log('✅ 사용 가능한 이슈 타입:');
    project.data.issueTypes.forEach(type => {
      if (!type.subtask) {
        console.log(`   - ${type.name} (${type.id})`);
      }
    });
    console.log();

    // 4. 우선순위 조회
    console.log('📝 4단계: 우선순위 조회...');
    const priorities = await callJiraAPI('GET', '/rest/api/2/priority');
    console.log('✅ 사용 가능한 우선순위:');
    priorities.data.forEach(p => {
      console.log(`   - ${p.name} (${p.id})`);
    });
    console.log();

    // 5. 컴포넌트 조회
    console.log('📝 5단계: 컴포넌트 조회...');
    try {
      const components = await callJiraAPI('GET', `/rest/api/2/project/${projectKey}/components`);
      if (components.data.length > 0) {
        console.log('✅ 사용 가능한 컴포넌트:');
        components.data.forEach(c => {
          console.log(`   - ${c.name} (${c.id})`);
        });
      } else {
        console.log('⚠️  프로젝트에 컴포넌트가 없습니다.');
      }
    } catch (e) {
      console.log('⚠️  컴포넌트 조회 실패:', e.error || e.message);
    }
    console.log();

    // 6. 테스트 이슈 생성
    console.log('📝 6단계: 테스트 이슈 생성...');
    console.log('⚠️  실제 이슈가 생성됩니다! (프로젝트:', projectKey + ')');
    
    const issueData = {
      fields: {
        project: { key: projectKey },
        summary: '[TEST] VOC 자동화 테스트 - ' + new Date().toISOString(),
        description: '이것은 VOC 자동화 MCP 서버의 Jira 연동 테스트입니다.\n\n' +
          '테스트 항목:\n' +
          '- type: Work (또는 Task)\n' +
          '- priority: Major (또는 High)\n' +
          '- components: VOC\n' +
          '- 카테고리별 자동 할당\n\n' +
          '이 이슈는 테스트 후 삭제하셔도 됩니다.',
        issuetype: { name: 'Task' }, // Work가 없으면 Task 사용
        priority: { name: 'High' }, // Major가 없으면 High 사용
      },
    };

    // VOC 컴포넌트가 있으면 추가
    // issueData.fields.components = [{ name: 'VOC' }];

    const createResult = await callJiraAPI('POST', '/rest/api/2/issue', issueData);
    console.log('✅ 테스트 이슈 생성 성공!');
    console.log(`   이슈 키: ${createResult.data.key}`);
    console.log(`   이슈 ID: ${createResult.data.id}`);
    console.log(`   URL: ${JIRA_BASE_URL}/browse/${createResult.data.key}`);
    console.log();

    // 7. 생성된 이슈 조회
    console.log('📝 7단계: 생성된 이슈 조회...');
    const issueDetail = await callJiraAPI('GET', `/rest/api/2/issue/${createResult.data.key}`);
    console.log('✅ 이슈 조회 성공!');
    console.log(`   제목: ${issueDetail.data.fields.summary}`);
    console.log(`   상태: ${issueDetail.data.fields.status.name}`);
    console.log(`   우선순위: ${issueDetail.data.fields.priority.name}`);
    console.log();

    // 8. 코멘트 추가
    console.log('📝 8단계: 코멘트 추가...');
    const commentResult = await callJiraAPI(
      'POST',
      `/rest/api/2/issue/${createResult.data.key}/comment`,
      { body: 'VOC 자동화 MCP 서버 테스트 완료 ✅\n\n테스트 시간: ' + new Date().toLocaleString('ko-KR') }
    );
    console.log('✅ 코멘트 추가 성공!');
    console.log();

    // 최종 결과
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 모든 테스트 통과!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log();
    console.log('✅ Jira 연동이 정상적으로 작동합니다.');
    console.log(`✅ 테스트 이슈: ${JIRA_BASE_URL}/browse/${createResult.data.key}`);
    console.log();
    console.log('💡 다음 단계:');
    console.log('   1. Cursor를 재시작하여 MCP 서버 로드');
    console.log('   2. Cursor 채팅에서 "사용 가능한 MCP 도구를 모두 보여줘" 실행');
    console.log('   3. createJiraIssue 도구로 실제 VOC 처리');
    console.log();

  } catch (error) {
    console.error('❌ 테스트 실패!');
    console.error();
    if (error.status) {
      console.error(`HTTP Status: ${error.status}`);
    }
    if (error.error) {
      console.error('에러 상세:', JSON.stringify(error.error, null, 2));
    }
    if (error.rawBody) {
      console.error('응답 내용:', error.rawBody);
    }
    if (error.message) {
      console.error('에러 메시지:', error.message);
    }
    console.error();
    console.error('💡 문제 해결:');
    console.error('   1. .env 파일의 JIRA_BASE_URL이 정확한지 확인');
    console.error('   2. JIRA_EMAIL이 Jira 계정 이메일과 일치하는지 확인');
    console.error('   3. JIRA_API_TOKEN이 유효한지 확인');
    console.error('   4. Jira에서 프로젝트 접근 권한이 있는지 확인');
    process.exit(1);
  }
}

// 실행
runTests();

