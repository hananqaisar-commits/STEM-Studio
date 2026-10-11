import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const TARGET_USERS = Number.parseInt(__ENV.TARGET_USERS || '20', 10);
const MAX_USERS = Number.parseInt(__ENV.MAX_USERS || '50', 10);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const targetHost = new URL(BASE_URL).hostname;
const isLocalTarget = LOCAL_HOSTS.has(targetHost);

if (!Number.isInteger(TARGET_USERS) || TARGET_USERS < 1 || TARGET_USERS > 200000) {
  throw new Error('TARGET_USERS must be an integer between 1 and 200000.');
}
if (!Number.isInteger(MAX_USERS) || MAX_USERS < 1 || MAX_USERS > 200000 || TARGET_USERS > MAX_USERS) {
  throw new Error('Set MAX_USERS to a value at least TARGET_USERS and no greater than 200000.');
}
if (TARGET_USERS > 1000 && __ENV.ALLOW_HIGH_LOAD !== 'true') {
  throw new Error('High-volume runs require ALLOW_HIGH_LOAD=true after reviewing the target and resource plan.');
}
if (!isLocalTarget && __ENV.ALLOW_EXTERNAL_TARGET !== 'true') {
  throw new Error('Non-local targets require ALLOW_EXTERNAL_TARGET=true and authorization to test that environment.');
}

const stageDuration = __ENV.RAMP_STAGE_DURATION || '30s';
const checkpoints = [10, 50, 100, 500, 1000, 5000, 45000, TARGET_USERS]
  .filter((users, index, all) => users <= TARGET_USERS && all.indexOf(users) === index)
  .sort((a, b) => a - b);

export const options = {
  scenarios: {
    realistic_learning_traffic: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        ...checkpoints.map((target) => ({ duration: stageDuration, target })),
        { duration: __ENV.HOLD_DURATION || '1m', target: TARGET_USERS },
        { duration: __ENV.RAMP_DOWN_DURATION || '30s', target: 0 },
      ],
      gracefulRampDown: '30s',
      gracefulStop: '30s',
    },
  },
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.01', abortOnFail: true, delayAbortEval: '30s' }],
    http_req_duration: [
      { threshold: 'p(95)<1000', abortOnFail: true, delayAbortEval: '30s' },
      { threshold: 'p(99)<2500', abortOnFail: true, delayAbortEval: '30s' },
    ],
    checks: [{ threshold: 'rate>0.99', abortOnFail: true, delayAbortEval: '30s' }],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export function setup() {
  const ready = http.get(`${BASE_URL}/api/ready`, { tags: { endpoint: 'readiness' }, timeout: '5s' });
  if (ready.status !== 200) {
    throw new Error(`Target readiness check failed with HTTP ${ready.status}; load test was not started.`);
  }
  return { token: __ENV.LOAD_TEST_BEARER_TOKEN || '' };
}

export default function (data) {
  const headers = data.token ? { Authorization: `Bearer ${data.token}` } : {};
  const authenticatedRead = data.token && Math.random() < 0.2;
  let response;

  if (authenticatedRead) {
    response = http.get(`${BASE_URL}/api/progress/stats`, {
      headers,
      tags: { endpoint: 'progress-stats' },
      timeout: '10s',
    });
  } else {
    const choice = Math.random();
    if (choice < 0.55) {
      response = http.get(`${BASE_URL}/api/stats/platform`, {
        tags: { endpoint: 'platform-stats' },
        timeout: '10s',
      });
    } else if (choice < 0.95) {
      response = http.get(`${BASE_URL}/api/stats/reviews`, {
        tags: { endpoint: 'reviews' },
        timeout: '10s',
      });
    } else {
      response = http.get(`${BASE_URL}/api/health`, {
        tags: { endpoint: 'liveness' },
        timeout: '5s',
      });
    }
  }

  check(response, {
    'API returns a successful response': (res) => res.status >= 200 && res.status < 300,
  });
  const minThink = Number.parseFloat(__ENV.THINK_TIME_MIN_SECONDS || '2');
  const maxThink = Number.parseFloat(__ENV.THINK_TIME_MAX_SECONDS || '5');
  sleep(minThink + Math.random() * Math.max(0, maxThink - minThink));
}
