// 외부 의존성 없는 단순 카운팅 세마포어 — Puppeteer 동시 실행 제한
let _activeCount = 0;
const MAX_CONCURRENT = 2;
const _queue: Array<() => void> = [];

export async function withPdfLimit<T>(fn: () => Promise<T>): Promise<T> {
  // P0-04: acquired 플래그 — 에러 발생 시 _activeCount 음수 방지
  let acquired = false;
  await new Promise<void>(resolve => {
    if (_activeCount < MAX_CONCURRENT) {
      _activeCount++;
      acquired = true;
      resolve();
    } else {
      _queue.push(() => {
        _activeCount++;
        acquired = true;
        resolve();
      });
    }
  });
  try {
    return await fn();
  } finally {
    if (acquired) {
      _activeCount--;
      const next = _queue.shift();
      if (next) next();
    }
  }
}
