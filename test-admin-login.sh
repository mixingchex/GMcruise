#!/bin/bash

echo "=== 관리자 로그인 테스트 ==="
echo ""

# 1. 로그인 API 테스트
echo "1. 로그인 API 호출 중..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"name":"관리자","phone":"01024958013","password":"0313","mode":"admin"}' \
  -c /tmp/admin_cookies.txt)

echo "로그인 응답:"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

# 2. 인증 확인
echo "2. 인증 확인 중..."
AUTH_CHECK=$(curl -s -b /tmp/admin_cookies.txt http://localhost:3000/api/admin/auth-check)
echo "인증 확인 응답:"
echo "$AUTH_CHECK" | jq '.' 2>/dev/null || echo "$AUTH_CHECK"
echo ""

# 3. 대시보드 접근 테스트
echo "3. 대시보드 접근 테스트 중..."
DASHBOARD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -b /tmp/admin_cookies.txt http://localhost:3000/admin/dashboard)
echo "대시보드 HTTP 상태 코드: $DASHBOARD_STATUS"
echo ""

if [ "$DASHBOARD_STATUS" = "200" ]; then
  echo "✅ 관리자 로그인 성공! 대시보드 접근 가능"
else
  echo "❌ 관리자 로그인 실패 또는 대시보드 접근 불가"
fi

