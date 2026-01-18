/**
 * Phase 1: Wrapper Logger
 *
 * 전략 A의 1단계: console.log를 감싸는 래퍼 함수
 *
 * 초기에는 내부적으로 console을 호출하지만,
 * 모든 파일이 이 래퍼를 사용하도록 변경되면
 * Winston logger로 전환할 수 있습니다.
 *
 * Feature Flag를 통해 온/오프 가능합니다.
 */

import logger from './logger-v2';

// Feature Flag: 환경변수로 Winston 사용 여부 제어
const USE_WINSTON = process.env.USE_WINSTON === 'true';

/**
 * Info 레벨 로그 (console.log 대체)
 */
export const log = (...args: any[]) => {
  if (USE_WINSTON) {
    // Winston 사용 (나중에 활성화)
    logger.info(...args);
  } else {
    // 기존 console.log 유지 (현재)
    console.log(...args);
  }
};

/**
 * Error 레벨 로그 (console.error 대체)
 */
export const error = (...args: any[]) => {
  if (USE_WINSTON) {
    logger.error(...args);
  } else {
    console.error(...args);
  }
};

/**
 * Warning 레벨 로그 (console.warn 대체)
 */
export const warn = (...args: any[]) => {
  if (USE_WINSTON) {
    logger.warn(...args);
  } else {
    console.warn(...args);
  }
};

/**
 * Debug 레벨 로그 (console.debug 대체)
 */
export const debug = (...args: any[]) => {
  if (USE_WINSTON) {
    logger.debug(...args);
  } else {
    console.debug(...args);
  }
};

/**
 * 기본 export (import logger from '@/lib/logger-wrapper')
 */
export default {
  log,
  info: log,  // log와 info는 동일
  error,
  warn,
  debug,
};

/**
 * Named exports (import { log, error } from '@/lib/logger-wrapper')
 */
export { log as info };
