'use client';

import Link from 'next/link';
import {
  FiLink,
  FiUsers,
  FiUser,
  FiClock,
  FiMessageSquare,
  FiShoppingCart,
  FiTrendingUp,
  FiSend,
  FiFileText,
  FiLock,
  FiImage,
} from 'react-icons/fi';

interface PartnerDashboardMenuProps {
  partnerBase: string;
  user: {
    id: number;
    mallUserId: string | null;
    phone: string | null;
  };
  isBranchManager: boolean;
  isSalesAgent: boolean;
  onCustomerRegister: () => void;
  onContractSend: () => void;
  onPasswordChange: () => void;
}

export default function PartnerDashboardMenu({
  partnerBase,
  user,
  isBranchManager,
  isSalesAgent,
  onCustomerRegister,
  onContractSend,
  onPasswordChange,
}: PartnerDashboardMenuProps) {
  const partnerId = user.phone || user.mallUserId;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-lg md:rounded-3xl md:p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-900 md:text-xl">빠른 메뉴</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {(user.mallUserId || user.phone) && (
          <Link
            href={`/${user.mallUserId || user.phone || partnerId}/shop`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 text-center transition-all hover:from-blue-100 hover:to-blue-200 hover:shadow-md md:p-6"
          >
            <span className="text-2xl md:text-3xl">🛍️</span>
            <span className="text-xs font-semibold text-blue-700 md:text-sm">나의 판매몰</span>
          </Link>
        )}
        <Link
          href={`${partnerBase}/links`}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-4 text-center transition-all hover:from-green-100 hover:to-green-200 hover:shadow-md md:p-6"
        >
          <FiLink className="text-2xl text-green-600 md:text-3xl" />
          <span className="text-xs font-semibold text-green-700 md:text-sm">링크 관리</span>
        </Link>
        <Link
          href={`${partnerBase}/customers`}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-4 text-center transition-all hover:from-purple-100 hover:to-purple-200 hover:shadow-md md:p-6"
        >
          <FiUsers className="text-2xl text-purple-600 md:text-3xl" />
          <span className="text-xs font-semibold text-purple-700 md:text-sm">
            {isBranchManager ? '나의 고객' : isSalesAgent ? '나의 고객관리' : '고객 관리'}
          </span>
        </Link>
        <Link
          href={`${partnerBase}/customers?tab=inquiries`}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 p-4 text-center transition-all hover:from-orange-100 hover:to-orange-200 hover:shadow-md md:p-6"
        >
          <span className="text-2xl md:text-3xl">📞</span>
          <span className="text-xs font-semibold text-orange-700 md:text-sm">전화상담<br />고객</span>
        </Link>
        <button
          onClick={onCustomerRegister}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-4 text-center transition-all hover:from-green-100 hover:to-green-200 hover:shadow-md md:p-6"
        >
          <FiUser className="text-2xl text-green-600 md:text-3xl" />
          <span className="text-xs font-semibold text-green-700 md:text-sm">크루즈가이드<br />동행인 등록</span>
        </button>
        <Link
          href={`${partnerBase}/customer-groups`}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 text-center transition-all hover:from-indigo-100 hover:to-indigo-200 hover:shadow-md md:p-6"
        >
          <FiUsers className="text-2xl text-indigo-600 md:text-3xl" />
          <span className="text-xs font-semibold text-indigo-700 md:text-sm">고객 그룹<br />관리</span>
        </Link>
        <Link
          href={`${partnerBase}/scheduled-messages`}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-4 text-center transition-all hover:from-purple-100 hover:to-purple-200 hover:shadow-md md:p-6"
        >
          <FiClock className="text-2xl text-purple-600 md:text-3xl" />
          <span className="text-xs font-semibold text-purple-700 md:text-sm">예약 메시지<br />관리</span>
        </Link>
        <Link
          href={`${partnerBase}/funnel`}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-fuchsia-50 to-fuchsia-100 p-4 text-center transition-all hover:from-fuchsia-100 hover:to-fuchsia-200 hover:shadow-md md:p-6"
        >
          <span className="text-2xl md:text-3xl">🔄</span>
          <span className="text-xs font-semibold text-fuchsia-700 md:text-sm">퍼널 메시지<br />관리</span>
        </Link>
        <Link
          href={`${partnerBase}/passport-requests`}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 p-4 text-center transition-all hover:from-teal-100 hover:to-teal-200 hover:shadow-md md:p-6"
        >
          <span className="text-2xl md:text-3xl">🛂</span>
          <span className="text-xs font-semibold text-teal-700 md:text-sm">수동여권<br />등록</span>
        </Link>
        <Link
          href={`${partnerBase}/customers?action=sms`}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 text-center transition-all hover:from-emerald-100 hover:to-emerald-200 hover:shadow-md md:p-6"
        >
          <FiMessageSquare className="text-2xl text-emerald-600 md:text-3xl" />
          <span className="text-xs font-semibold text-emerald-700 md:text-sm">문자 보내기</span>
        </Link>
        <Link
          href={`${partnerBase}/payment`}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 p-4 text-center transition-all hover:from-orange-100 hover:to-orange-200 hover:shadow-md md:p-6"
        >
          <FiShoppingCart className="text-2xl text-orange-600 md:text-3xl" />
          <span className="text-xs font-semibold text-orange-700 md:text-sm">결제/정산</span>
        </Link>
        <Link
          href={`${partnerBase}/documents`}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-4 text-center transition-all hover:from-slate-100 hover:to-slate-200 hover:shadow-md md:p-6"
        >
          <span className="text-2xl md:text-3xl">📄</span>
          <span className="text-xs font-semibold text-slate-700 md:text-sm">서류관리</span>
        </Link>
        <Link
          href={`${partnerBase}/images`}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 p-4 text-center transition-all hover:from-violet-100 hover:to-violet-200 hover:shadow-md md:p-6"
        >
          <FiImage className="text-2xl text-violet-600 md:text-3xl" />
          <span className="text-xs font-semibold text-violet-700 md:text-sm">이미지<br />관리</span>
        </Link>
        {isBranchManager && (
          <>
            <Link
              href={`${partnerBase}/landing-pages`}
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 text-center transition-all hover:from-cyan-100 hover:to-cyan-200 hover:shadow-md md:p-6"
            >
              <span className="text-2xl md:text-3xl">📄</span>
              <span className="text-xs font-semibold text-cyan-700 md:text-sm">랜딩페이지<br />관리</span>
            </Link>
            <Link
              href={`${partnerBase}/customers`}
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-4 text-center transition-all hover:from-purple-100 hover:to-purple-200 hover:shadow-md md:p-6"
            >
              <FiUsers className="text-2xl text-purple-600 md:text-3xl" />
              <span className="text-xs font-semibold text-purple-700 md:text-sm">판매원별<br />DB 관리</span>
            </Link>
            <Link
              href={`${partnerBase}/team`}
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 text-center transition-all hover:from-indigo-100 hover:to-indigo-200 hover:shadow-md md:p-6"
            >
              <FiTrendingUp className="text-2xl text-indigo-600 md:text-3xl" />
              <span className="text-xs font-semibold text-indigo-700 md:text-sm">팀 관리</span>
            </Link>
            <button
              onClick={onContractSend}
              className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 p-4 text-center transition-all hover:from-pink-100 hover:to-pink-200 hover:shadow-md md:p-6"
            >
              <FiSend className="text-2xl text-pink-600 md:text-3xl" />
              <span className="text-xs font-semibold text-pink-700 md:text-sm">계약서 보내기</span>
            </button>
          </>
        )}
        <Link
          href={`${partnerBase}/profile`}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-4 text-center transition-all hover:from-gray-100 hover:to-gray-200 hover:shadow-md md:p-6"
        >
          <FiUser className="text-2xl text-gray-600 md:text-3xl" />
          <span className="text-xs font-semibold text-gray-700 md:text-sm">프로필 수정</span>
        </Link>
        <Link
          href={`${partnerBase}/sns-profile`}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 p-4 text-center transition-all hover:from-pink-100 hover:to-pink-200 hover:shadow-md md:p-6"
        >
          <FiLink className="text-2xl text-pink-600 md:text-3xl" />
          <span className="text-xs font-semibold text-pink-700 md:text-sm">나의 SNS<br />프로필</span>
        </Link>
        <Link
          href={`${partnerBase}/contract`}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 text-center transition-all hover:from-blue-100 hover:to-blue-200 hover:shadow-md md:p-6"
        >
          <FiFileText className="text-2xl text-blue-600 md:text-3xl" />
          <span className="text-xs font-semibold text-blue-700 md:text-sm">나의 계약서</span>
        </Link>
        <button
          onClick={onPasswordChange}
          className="flex flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 p-4 text-center transition-all hover:from-teal-100 hover:to-teal-200 hover:shadow-md md:p-6"
        >
          <FiLock className="text-2xl text-teal-600 md:text-3xl" />
          <span className="text-xs font-semibold text-teal-700 md:text-sm">비밀번호 변경</span>
        </button>
      </div>
    </section>
  );
}