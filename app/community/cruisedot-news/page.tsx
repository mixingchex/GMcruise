"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { STATIC_NEWS_POSTS, CruisedotNewsPost, normalizeNewsHtml } from "./news-data";
import { isAllowedCruisedotMallId, normalizeMallUserId } from "@/lib/cruisedot-news-access";
import { FiEye, FiHeart, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import KakaoShareButton from "@/components/KakaoShareButton";

type ApiNewsPost = {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  views: number;
  likes: number;
  authorName?: string | null;
  highlight?: string | null;
  summary?: string | null;
};

type CombinedPost = CruisedotNewsPost & {
  source: "static" | "db";
  dbId?: number;
};

const LOGO_SRC = "/images/ai-cruise-logo.png";

const stripHtml = (raw: string) => {
  if (!raw) return "";
  return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
};

const formatDate = (iso: string) => {
  try {
    return format(new Date(iso), "yyyy년 M월 d일 (EEE)", { locale: ko });
  } catch {
    return iso;
  }
};

const toCombinedPost = (post: CruisedotNewsPost, source: "static" | "db", dbId?: number): CombinedPost => ({
  ...post,
  source,
  dbId,
});

function CruisedotNewsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [apiPosts, setApiPosts] = useState<ApiNewsPost[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeHeight, setIframeHeight] = useState(720);
  const [liveViews, setLiveViews] = useState(0);
  const [liveLikes, setLiveLikes] = useState(0);
  const [activeViewers, setActiveViewers] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        const res = await fetch("/api/community/posts?limit=24&category=cruisedot-news", {
          credentials: "include",
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.ok && Array.isArray(data.posts)) {
          setApiPosts(data.posts);
        } else {
          setApiPosts([]);
        }
      } catch (error) {
        if ((error as any)?.name !== "AbortError") {
          console.error("[Cruisedot News] Failed to load posts:", error);
        }
        setApiPosts([]);
      } finally {
      }
    };
    run();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    // 관리자 권한만 확인 (작성 권한 체크용)
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        const role = (data?.user?.role ?? "").toLowerCase();
        const isAdmin = role === "admin";
        // 작성은 관리자만 가능
        setCanWrite(isAdmin);
      })
      .catch(() => {
        setCanWrite(false);
      })
      .finally(() => {
        setAuthChecked(true);
      });
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;
      setIsMobile(window.innerWidth < 1024);
      setViewportHeight(window.innerHeight);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const normalizedApiPosts = useMemo<CombinedPost[]>(() => {
    if (!apiPosts.length) return [];
    return apiPosts.map((post) => {
      const summaryText =
        post.summary?.trim() ||
        post.highlight?.trim() ||
        stripHtml(post.content).slice(0, 140);
      const normalized: CruisedotNewsPost = {
        id: `db-${post.id}`,
        title: post.title,
        highlight:
          post.highlight?.trim() ||
          "크루즈닷 본사가 직접 정리한 최신 전략 보고서입니다.",
        summary: summaryText,
        emoji: "📰",
        category: "본사 소식",
        publishedAt: post.createdAt,
        baseViews: Math.max(post.views || 0, 4200),
        baseLikes: Math.max(post.likes || 0, 240),
        baseActiveViewers: 81,
        html: normalizeNewsHtml(post.content || ""),
      };
      return { ...toCombinedPost(normalized, "db", post.id) };
    });
  }, [apiPosts]);

  const combinedPosts = useMemo<CombinedPost[]>(() => {
    const merged = [
      ...normalizedApiPosts,
      ...STATIC_NEWS_POSTS.map((post) => toCombinedPost(post, "static")),
    ];
    
    // 오늘 생성된 글을 우선 정렬
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return merged.sort((a, b) => {
      const aDate = new Date(a.publishedAt);
      aDate.setHours(0, 0, 0, 0);
      const bDate = new Date(b.publishedAt);
      bDate.setHours(0, 0, 0, 0);
      
      const aIsToday = aDate.getTime() === today.getTime();
      const bIsToday = bDate.getTime() === today.getTime();
      
      // 오늘 생성된 글을 맨 앞으로
      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;
      
      // 둘 다 오늘이거나 둘 다 아니면 최신순
      const aTime = new Date(a.publishedAt).getTime();
      const bTime = new Date(b.publishedAt).getTime();
      return bTime - aTime;
    });
  }, [normalizedApiPosts]);

  useEffect(() => {
    const param = searchParams?.get("post");
    if (param) {
      setSelectedId(param);
    } else {
      // URL 파라미터가 없으면 최신 뉴스(첫 번째) 자동 선택
      if (combinedPosts.length > 0) {
        setSelectedId(combinedPosts[0].id);
        // URL도 업데이트 (하지만 스크롤은 유지)
        router.replace(`/community/cruisedot-news?post=${encodeURIComponent(combinedPosts[0].id)}`, {
          scroll: false,
        });
      }
    }
  }, [searchParams, combinedPosts, router]);

  useEffect(() => {
    if (!combinedPosts.length) return;
    // combinedPosts가 변경되면 최신 뉴스로 업데이트 (URL 파라미터가 없을 때만)
    const param = searchParams?.get("post");
    if (!param) {
      setSelectedId(combinedPosts[0].id);
    }
  }, [combinedPosts, searchParams]);

  const selectedPost = useMemo(
    () => combinedPosts.find((post) => post.id === selectedId) || null,
    [combinedPosts, selectedId]
  );

  const currentIndex = useMemo(() => {
    if (!selectedPost) return -1;
    return combinedPosts.findIndex((post) => post.id === selectedPost.id);
  }, [combinedPosts, selectedPost]);

  const previousPost =
    currentIndex > 0 ? combinedPosts[currentIndex - 1] : null;
  const nextPost =
    currentIndex >= 0 && currentIndex < combinedPosts.length - 1
      ? combinedPosts[currentIndex + 1]
      : null;
  const displayIndex = currentIndex >= 0 ? currentIndex + 1 : 0;

  useEffect(() => {
    if (!selectedPost) return;
    const minViews = selectedPost.baseViews;
    const minLikes = selectedPost.baseLikes;
    setLiveViews(minViews + Math.floor(Math.random() * 70));
    setLiveLikes(minLikes + Math.floor(Math.random() * 18));
    setActiveViewers(selectedPost.baseActiveViewers);

    const viewInterval = setInterval(() => {
      setLiveViews((prev) => prev + Math.floor(Math.random() * 35) + 18);
    }, 6000 + Math.floor(Math.random() * 4000));

    const likeInterval = setInterval(() => {
      setLiveLikes((prev) => prev + Math.floor(Math.random() * 6) + 2);
    }, 9000 + Math.floor(Math.random() * 6000));

    const activeInterval = setInterval(() => {
      const base = selectedPost.baseActiveViewers;
      const offset = Math.floor(Math.random() * 14) - 7;
      setActiveViewers(Math.max(20, base + offset));
    }, 4200 + Math.floor(Math.random() * 3800));

    return () => {
      clearInterval(viewInterval);
      clearInterval(likeInterval);
      clearInterval(activeInterval);
    };
  }, [selectedPost?.id, selectedPost?.baseActiveViewers, selectedPost?.baseLikes, selectedPost?.baseViews]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const adjustHeight = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;
        const height = doc.body?.scrollHeight ?? 0;
        if (height > 0) {
          setIframeHeight(height + 48);
        }
      } catch (error) {
        console.warn("[Cruisedot News] Failed to auto-resize iframe:", error);
      }
    };
    iframe.addEventListener("load", adjustHeight);
    adjustHeight();
    return () => {
      iframe.removeEventListener("load", adjustHeight);
    };
  }, [selectedPost?.id, selectedPost?.html, selectedPost?.staticPath]);

  const handleSelect = (post: CombinedPost) => {
    setSelectedId(post.id);
    router.replace(`/community/cruisedot-news?post=${encodeURIComponent(post.id)}`, {
      scroll: false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-white/70 px-10 py-12 shadow-lg backdrop-blur">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
            <p className="text-sm font-medium text-slate-500">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  const goPrev = () => {
    if (previousPost) {
      handleSelect(previousPost);
    }
  };

  const goNext = () => {
    if (nextPost) {
      handleSelect(nextPost);
    }
  };

  const safeViewportHeight = viewportHeight > 0 ? viewportHeight : 900;
  const frameViewportBase = Math.max(
    Math.round(safeViewportHeight - (isMobile ? 120 : 220)),
    isMobile ? 540 : 760
  );
  const frameMinHeight = Math.max(iframeHeight, frameViewportBase);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-10">
        <header className="mb-12 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-500"
            >
              &larr; 크루즈몰로 돌아가기
            </Link>
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-rose-100 bg-rose-50">
                <Image
                  src={LOGO_SRC}
                  alt="Cruisedot"
                  fill
                  className="object-contain p-2"
                />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rose-400">
                  HEADQUARTERS COLUMN
                </p>
                <h1 className="text-3xl font-extrabold text-slate-900 md:text-4xl">
                  크루즈닷늬우스
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  본사만 작성·열람 가능한 전략 아카이브. 매주 월요일 09:00 업데이트됩니다.
                </p>
              </div>
            </div>
            {/* 크루즈뉘우스 작성은 관리자 패널에서만 가능 */}
          </div>
          {selectedPost && (
            <div className="rounded-3xl border border-slate-100 bg-white/70 p-6 shadow-sm backdrop-blur">
              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600 md:text-base">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👁️</span>
                  <span className="font-semibold text-slate-900">
                    {liveViews.toLocaleString("ko-KR")}
                  </span>
                  <span className="text-slate-500">누적 조회</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">❤️</span>
                  <span className="font-semibold text-slate-900">
                    {liveLikes.toLocaleString("ko-KR")}
                  </span>
                  <span className="text-slate-500">공감</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">🟢</span>
                  <span className="font-semibold text-slate-900">
                    {activeViewers.toLocaleString("ko-KR")}
                  </span>
                  <span className="text-slate-500">현재 접속 중</span>
                </div>
                <div className="ml-auto flex items-center gap-2 text-slate-500">
                  <span className="text-sm font-medium text-slate-400">발행</span>
                  <span className="font-semibold text-slate-700">
                    {formatDate(selectedPost.publishedAt)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </header>

        <section
          className="relative flex flex-col rounded-[32px] border border-slate-100 bg-white shadow-xl shadow-slate-200/30"
          style={{ minHeight: isMobile ? "calc(100vh - 120px)" : "calc(100vh - 160px)" }}
        >
          {selectedPost ? (
            <>
              <div className="px-6 pt-8 md:px-8 md:pt-10">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    {(() => {
                      const postDate = new Date(selectedPost.publishedAt);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      postDate.setHours(0, 0, 0, 0);
                      const isToday = postDate.getTime() === today.getTime();
                      
                      return (
                        <div className="flex items-center gap-3 mb-2">
                          {isToday && (
                            <span className="px-4 py-1.5 bg-red-500 text-white text-sm font-bold rounded-full animate-pulse shadow-lg">
                              🔥 오늘의 뉴스
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    <h2 className="text-3xl font-extrabold text-slate-900 md:text-[2.4rem]">
                      {selectedPost.title}
                    </h2>
                  </div>
                  {canWrite && selectedPost.source === "db" && selectedPost.dbId && (
                    <Link
                      href={`/community/cruisedot-news/edit/${selectedPost.dbId}`}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-rose-300/40 transition hover:-translate-y-0.5 hover:from-rose-400 hover:to-rose-600"
                    >
                      ✏️ 칼럼 수정
                    </Link>
                  )}
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-100 bg-rose-50/40 px-4 py-3 text-sm text-rose-500 md:gap-4 md:px-6 md:py-4 md:text-base">
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={!previousPost}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold transition ${
                      previousPost
                        ? "bg-white text-rose-600 shadow shadow-rose-200/50 hover:-translate-x-0.5"
                        : "cursor-not-allowed bg-rose-100 text-rose-300"
                    }`}
                  >
                    <FiChevronLeft />
                    이전 칼럼
                  </button>
                  <div className="flex flex-1 flex-col items-center justify-center text-center text-sm text-rose-600 md:text-base">
                    <span className="font-semibold">
                      총 {combinedPosts.length}편 중 {displayIndex}편
                    </span>
                    <span className="text-xs text-rose-400 md:text-sm">
                      {selectedPost.emoji} {selectedPost.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!nextPost}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold transition ${
                      nextPost
                        ? "bg-white text-rose-600 shadow shadow-rose-200/50 hover:translate-x-0.5"
                        : "cursor-not-allowed bg-rose-100 text-rose-300"
                    }`}
                  >
                    다음 칼럼
                    <FiChevronRight />
                  </button>
                </div>
                {selectedPost.highlight && (
                  <p className="mt-5 rounded-2xl bg-gradient-to-r from-rose-50 to-white px-5 py-4 text-base font-medium text-rose-600 shadow-inner md:px-6">
                    {selectedPost.highlight}
                  </p>
                )}
              </div>
              <div className="relative mt-6 flex-1 rounded-[28px] px-3 pb-12 pt-4 md:px-6">
                <div className="pointer-events-none absolute inset-y-0 left-3 hidden w-12 items-center justify-center md:flex">
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={!previousPost}
                    className={`pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-500 shadow transition ${
                      previousPost
                        ? "hover:-translate-x-0.5 hover:border-rose-300 hover:text-rose-600"
                        : "cursor-not-allowed border-slate-100 text-slate-300"
                    }`}
                  >
                    <FiChevronLeft size={20} />
                  </button>
                </div>
                <div className="pointer-events-none absolute inset-y-0 right-3 hidden w-12 items-center justify-center md:flex">
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={!nextPost}
                    className={`pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-500 shadow transition ${
                      nextPost
                        ? "hover:translate-x-0.5 hover:border-rose-300 hover:text-rose-600"
                        : "cursor-not-allowed border-slate-100 text-slate-300"
                    }`}
                  >
                    <FiChevronRight size={20} />
                  </button>
                </div>
                <iframe
                  key={selectedPost.id}
                  ref={iframeRef}
                  src={selectedPost.staticPath}
                  srcDoc={selectedPost.staticPath ? undefined : selectedPost.html}
                  className="h-full w-full rounded-[24px] border border-slate-100"
                  style={{ minHeight: `${frameMinHeight}px` }}
                  sandbox="allow-scripts allow-same-origin allow-popups"
                  title={selectedPost.title}
                />
                <div className="mt-8 space-y-4 rounded-[24px] border border-slate-100 bg-white/90 p-6 shadow-sm">
                  <div className="flex flex-col gap-3 md:flex-row">
                    <Link
                      href="https://www.cruiseai.co.kr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-rose-300/40 transition hover:-translate-y-0.5 hover:from-rose-600 hover:to-rose-700"
                    >
                      크루즈 가이드 3일 체험 로그인
                    </Link>
                    <Link
                      href="https://leadgeny.kr/i/yog"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center rounded-2xl border-2 border-rose-100 px-5 py-3 text-base font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 bg-white"
                    >
                      크루즈 여행 가성비갑 만나기
                    </Link>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 px-6 pb-8 text-sm text-slate-500 md:px-8">
                <span>크루즈닷 본사에서 자동 발행됩니다.</span>
                <Link
                  href="/community"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 font-semibold text-slate-600 transition hover:border-rose-300 hover:text-rose-500"
                >
                  &larr; 커뮤니티 홈으로
                </Link>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 text-slate-500">
              <p className="text-lg font-semibold">조회할 칼럼을 선택해 주세요.</p>
              <p className="text-sm text-slate-400">목록에서 최신 HQ 칼럼을 선택하면 이곳에 내용이 표시됩니다.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function CruisedotNewsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">로딩 중...</div>}>
      <CruisedotNewsPageContent />
    </Suspense>
  );
}


