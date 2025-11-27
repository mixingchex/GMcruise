'use client';

import { useState, useEffect } from 'react';

export default function RedisTestPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkRedis = async () => {
      try {
        const response = await fetch('/api/redis/health');
        const result = await response.json();
        
        if (result.connected) {
          setStatus('success');
          setData(result);
        } else {
          setStatus('error');
          setError(result.error || 'Redis 연결 실패');
        }
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : '알 수 없는 오류');
      }
    };

    checkRedis();
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>🔴 Redis 연결 상태 확인</h1>
      
      {status === 'loading' && (
        <div style={{ padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>
          <p>⏳ Redis 연결 확인 중...</p>
        </div>
      )}

      {status === 'success' && data && (
        <div style={{ padding: '1rem', background: '#d4edda', borderRadius: '8px', marginTop: '1rem' }}>
          <h2 style={{ color: '#155724', marginTop: 0 }}>✅ Redis 연결 성공!</h2>
          <div style={{ background: 'white', padding: '1rem', borderRadius: '4px', marginTop: '1rem' }}>
            <h3>연결 정보:</h3>
            <ul>
              <li><strong>상태:</strong> {data.status}</li>
              <li><strong>메시지:</strong> {data.message}</li>
              <li><strong>타임스탬프:</strong> {new Date(data.timestamp).toLocaleString()}</li>
            </ul>
            <h3>테스트 결과:</h3>
            <ul>
              <li><strong>쓰기:</strong> {data.test.write ? '✅ 성공' : '❌ 실패'}</li>
              <li><strong>읽기:</strong> {data.test.read ? '✅ 성공' : '❌ 실패'}</li>
              <li><strong>데이터:</strong> {JSON.stringify(data.test.data, null, 2)}</li>
            </ul>
          </div>
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#cce5ff', borderRadius: '4px' }}>
            <p><strong>🎉 Upstash Redis가 정상적으로 작동하고 있습니다!</strong></p>
            <p>이제 로그인 시 세션 정보가 Redis에 캐싱됩니다.</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div style={{ padding: '1rem', background: '#f8d7da', borderRadius: '8px', marginTop: '1rem' }}>
          <h2 style={{ color: '#721c24', marginTop: 0 }}>❌ Redis 연결 실패</h2>
          <p style={{ color: '#721c24' }}>{error}</p>
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', background: '#e9ecef', borderRadius: '8px' }}>
        <h3>다음 단계:</h3>
        <ol>
          <li>로그인 페이지로 이동: <a href="/admin/login" style={{ color: '#007bff' }}>/admin/login</a></li>
          <li>로그인 시도 (세션 정보가 Redis에 저장됨)</li>
          <li>서버 로그에서 <code>[Redis]</code> 메시지 확인</li>
        </ol>
      </div>
    </div>
  );
}

