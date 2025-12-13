# AI 모델 API 호출명 전체 목록

> 마지막 업데이트: 2025년 12월

## 모델 분류 범례

| 아이콘 | 분류 | 설명 |
|--------|------|------|
| 🧠 | **추론 (Reasoning)** | 복잡한 논리/수학/코딩, Chain-of-Thought |
| ⚡ | **FAST** | 빠른 응답, 일반 대화/작업 |
| 💰 | **가성비** | 비용 대비 성능 최적화 |
| 📦 | **Legacy** | 이전 세대, 호환성 유지용 |

---

## 📏 Context Window 비교 요약

| 제공사 | 최대 Input | 최대 Output | 대표 모델 |
|--------|-----------|-------------|----------|
| Google | **1M** | 65K | Gemini 2.5 Pro/Flash |
| OpenAI | **1M** | 128K | GPT-4.1 시리즈 |
| OpenAI | 272K | 128K | GPT-5 시리즈 |
| Anthropic | 200K | 64K | Claude Sonnet 4 |
| Anthropic | 200K | 32K | Claude Opus 4 |
| DeepSeek | 64K | 8K | R1, Chat |

---

## OpenAI

### 🧠 추론 모델 (Reasoning)
| 모델명 | API 호출명 | Input | Output | Input$/1M | Output$/1M |
|--------|-----------|-------|--------|-----------|------------|
| o3 | `o3-2025-04-16` | 200K | 100K | $2.00 | $8.00 |
| o3 미니 | `o3-mini` | 200K | 100K | $1.10 | $4.40 |
| o4 미니 | `o4-mini-2025-04-16` | 200K | 100K | $1.10 | $4.40 |
| o1 | `o1` | 200K | 100K | $15.00 | $60.00 |
| o1 미니 | `o1-mini` | 200K | 100K | $1.10 | $4.40 |
| o3 프로 | `o3-pro` | 200K | 100K | $20.00 | $80.00 |
| o1 프로 | `o1-pro` | 200K | 100K | $150.00 | $600.00 |

### ⚡ FAST 모델 (플래그십)
| 모델명 | API 호출명 | Input | Output | Input$/1M | Output$/1M |
|--------|-----------|-------|--------|-----------|------------|
| GPT-5 | `gpt-5-2025-08-07` | 272K | 128K | $1.25 | $10.00 |
| GPT-5 최신 | `gpt-5-chat-latest` | 272K | 128K | $1.25 | $10.00 |
| GPT-5 코덱스 | `gpt-5-codex` | 272K | 128K | $1.25 | $10.00 |
| GPT-5.1 | `gpt-5.1` | 272K | 128K | $1.25 | $10.00 |
| GPT-5.1 코덱스 | `gpt-5.1-codex` | 272K | 128K | $1.25 | $10.00 |
| GPT-5 프로 | `gpt-5-pro` | 272K | 128K | $15.00 | $120.00 |

### 💰 가성비 모델
| 모델명 | API 호출명 | Input | Output | Input$/1M | Output$/1M |
|--------|-----------|-------|--------|-----------|------------|
| GPT-5 미니 | `gpt-5-mini` | 272K | 128K | $0.25 | $2.00 |
| GPT-5 나노 | `gpt-5-nano` | 272K | 128K | $0.05 | $0.40 |
| GPT-4o 미니 | `gpt-4o-mini` | 128K | 16K | $0.15 | $0.60 |
| GPT-4.1 미니 | `gpt-4.1-mini-2025-04-14` | **1M** | 128K | $0.40 | $1.60 |
| GPT-4.1 나노 | `gpt-4.1-nano-2025-04-14` | **1M** | 128K | $0.10 | $0.40 |

### 📦 Legacy 모델
| 모델명 | API 호출명 | Input | Output | Input$/1M | Output$/1M |
|--------|-----------|-------|--------|-----------|------------|
| GPT-4o | `gpt-4o` | 128K | 16K | $2.50 | $10.00 |
| GPT-4.1 | `gpt-4.1-2025-04-14` | **1M** | 128K | $2.00 | $8.00 |
| GPT-4 터보 | `gpt-4-turbo` | 128K | 4K | $10.00 | $30.00 |
| GPT-4 | `gpt-4` | 8K | 8K | $30.00 | $60.00 |
| GPT-3.5 터보 | `gpt-3.5-turbo` | 16K | 4K | $0.50 | $1.50 |

### 🔧 특수 모델
| 모델명 | API 호출명 | 용도 |
|--------|-----------|------|
| Computer Use | `computer-use-preview` | GUI 자동화 |
| GPT-5 Search | `gpt-5-search-api` | 웹 검색 통합 |
| Codex Mini | `codex-mini-latest` | 코드 전용 |

---

## Anthropic Claude

### 🧠 추론/플래그십 모델
| 모델명 | API 호출명 | Input | Output | Input$/1M | Output$/1M |
|--------|-----------|-------|--------|-----------|------------|
| Claude Opus 4.5 | `claude-opus-4-5-20251101` | 200K | 32K | $5.00 | $25.00 |
| Claude Opus 4 | `claude-opus-4-20250514` | 200K | 32K | $15.00 | $75.00 |
| Claude Opus 4.1 | `claude-opus-4-1-*` | 200K | 32K | $15.00 | $75.00 |

### ⚡ FAST 모델
| 모델명 | API 호출명 | Input | Output | Input$/1M | Output$/1M |
|--------|-----------|-------|--------|-----------|------------|
| Claude Sonnet 4.5 | `claude-sonnet-4-5-20250929` | 200K | 64K | $3.00 | $15.00 |
| Claude Sonnet 4 | `claude-sonnet-4-20250514` | 200K | 64K | $3.00 | $15.00 |
| Claude 3.7 Sonnet | `claude-3-7-sonnet-20250219` | 200K | 64K | $3.00 | $15.00 |
| Claude 3.5 Sonnet | `claude-3-5-sonnet-20241022` | 200K | 8K | $3.00 | $15.00 |

### 💰 가성비 모델
| 모델명 | API 호출명 | Input | Output | Input$/1M | Output$/1M |
|--------|-----------|-------|--------|-----------|------------|
| Claude Haiku 4.5 | `claude-haiku-4-5-*` | 200K | 64K | $1.00 | $5.00 |
| Claude 3.5 Haiku | `claude-3-5-haiku-20241022` | 200K | 8K | $0.80 | $4.00 |
| Claude 3 Haiku | `claude-3-haiku-20240307` | 200K | 4K | $0.25 | $1.25 |

---

## Google Gemini

### 🧠 추론 모델
| 모델명 | API 호출명 | Input | Output | Input$/1M | Output$/1M |
|--------|-----------|-------|--------|-----------|------------|
| Gemini 2.5 Pro | `gemini-2.5-pro` | **1M** | 65K | $1.25 (≤200K) | $10.00 |
| Gemini 2.5 Pro (>200K) | `gemini-2.5-pro` | **1M** | 65K | $2.50 | $15.00 |
| Gemini 3 Pro Preview | `gemini-3-pro-preview` | **1M** | 65K | TBD | TBD |

### ⚡ FAST 모델
| 모델명 | API 호출명 | Input | Output | Input$/1M | Output$/1M |
|--------|-----------|-------|--------|-----------|------------|
| Gemini 2.5 Flash | `gemini-2.5-flash` | **1M** | 65K | $0.15 | $0.60 (no reasoning) |
| Gemini 2.5 Flash (추론) | `gemini-2.5-flash` | **1M** | 65K | $0.15 | $3.50 (with reasoning) |
| Gemini 2.0 Flash | `gemini-2.0-flash` | **1M** | 8K | $0.10 | $0.40 |

### 💰 가성비 모델
| 모델명 | API 호출명 | Input | Output | Input$/1M | Output$/1M |
|--------|-----------|-------|--------|-----------|------------|
| Gemini 2.5 Flash-Lite | `gemini-2.5-flash-lite` | **1M** | 65K | $0.10 | $0.40 |
| Gemini 2.0 Flash-Lite | `gemini-2.0-flash-lite` | **1M** | 8K | $0.075 | $0.30 |

### 📦 Legacy 모델
| 모델명 | API 호출명 | Input | Output | 상태 |
|--------|-----------|-------|--------|------|
| Gemini 1.5 Pro | `gemini-1.5-pro` | **2M** | 8K | 지원 중단 예정 |
| Gemini 1.5 Flash | `gemini-1.5-flash` | **1M** | 8K | 지원 중단 예정 |
| Gemini 1.5 Flash-8B | `gemini-1.5-flash-8b` | **1M** | 8K | 지원 중단 예정 |

### 🎤 특수 모델 (오디오/이미지/라이브)
| 모델명 | API 호출명 | Input | Output | 용도 |
|--------|-----------|-------|--------|------|
| Gemini 2.5 Flash Live | `gemini-live-2.5-flash-preview` | **1M** | 8K | 실시간 대화 |
| Gemini 2.5 Flash 이미지 | `gemini-2.5-flash-image-preview` | 32K | 32K | 이미지 생성/편집 |
| Gemini 2.5 Flash TTS | `gemini-2.5-flash-preview-tts` | 8K | 16K | Text-to-Speech |
| Gemini 2.5 Pro TTS | `gemini-2.5-pro-preview-tts` | 8K | 16K | 고품질 TTS |
| Gemini 2.5 Flash 네이티브 오디오 | `gemini-2.5-flash-preview-native-audio-dialog` | 128K | 8K | 네이티브 음성 |
| Gemini 2.0 Flash 이미지 | `gemini-2.0-flash-preview-image-generation` | 32K | 8K | 이미지 생성 |
| Gemini 2.0 Flash Live | `gemini-2.0-flash-live-001` | **1M** | 8K | 실시간 대화 |

---

## DeepSeek

### 🧠 추론 모델
| 모델명 | API 호출명 | Input | Output | Input$/1M (Miss) | Output$/1M |
|--------|-----------|-------|--------|-----------------|------------|
| DeepSeek R1 | `deepseek-reasoner` | 64K | 8K | $0.55 | $2.19 |
| DeepSeek R1 (Cache Hit) | `deepseek-reasoner` | 64K | 8K | $0.14 | $2.19 |

### ⚡ FAST/가성비 모델
| 모델명 | API 호출명 | Input | Output | Input$/1M (Miss) | Output$/1M |
|--------|-----------|-------|--------|-----------------|------------|
| DeepSeek Chat (V3) | `deepseek-chat` | 64K | 8K | $0.27 | $1.10 |
| DeepSeek Chat (Cache Hit) | `deepseek-chat` | 64K | 8K | $0.07 | $1.10 |
| DeepSeek Coder V2 | `deepseek-coder` | 128K | 8K | $0.14 | $0.28 |

### 💸 Off-Peak 할인 (75% 할인)
- 적용 시간: 16:30 ~ 00:30 UTC (한국시간 01:30~09:30)
- DeepSeek R1: $0.14 → $0.035 (Cache Miss)
- DeepSeek Chat: $0.27 → $0.068 (Cache Miss)

---

## 용도별 추천 모델

### 🎯 복잡한 추론/수학/과학
| 우선순위 | 모델 | Context | 비용(Input/Output) |
|---------|------|---------|-------------------|
| 1 | `o3` | 200K | $2.00/$8.00 |
| 2 | `deepseek-reasoner` | 64K | $0.55/$2.19 |
| 3 | `gemini-2.5-pro` | **1M** | $1.25/$10.00 |
| 4 | `claude-opus-4-5-20251101` | 200K | $5.00/$25.00 |

### 💻 코딩/개발
| 우선순위 | 모델 | Context | 비용(Input/Output) |
|---------|------|---------|-------------------|
| 1 | `gpt-5-codex` | 272K | $1.25/$10.00 |
| 2 | `claude-sonnet-4-5-20250929` | 200K | $3.00/$15.00 |
| 3 | `deepseek-coder` | 128K | $0.14/$0.28 |
| 4 | `gemini-2.5-flash` | **1M** | $0.15/$3.50 |

### 💬 일반 대화/채팅
| 우선순위 | 모델 | Context | 비용(Input/Output) |
|---------|------|---------|-------------------|
| 1 | `gpt-5-nano` | 272K | $0.05/$0.40 |
| 2 | `gemini-2.5-flash-lite` | **1M** | $0.10/$0.40 |
| 3 | `claude-3-haiku-20240307` | 200K | $0.25/$1.25 |
| 4 | `gpt-4o-mini` | 128K | $0.15/$0.60 |

### 📊 대량 데이터 처리 (긴 문서)
| 우선순위 | 모델 | Context | 비용(Input/Output) | 특징 |
|---------|------|---------|-------------------|------|
| 1 | `gpt-4.1-nano` | **1M** | $0.05/$0.20 (Batch) | 긴 문서 + 최저가 |
| 2 | `gemini-2.5-flash-lite` | **1M** | $0.10/$0.40 | 1M 컨텍스트 |
| 3 | `gpt-5-nano` + Batch | 272K | $0.025/$0.20 | 50% 할인 |
| 4 | `deepseek-chat` (off-peak) | 64K | $0.068/$1.10 | 75% 할인 |
