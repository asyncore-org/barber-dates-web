---
description: Instructions building apps with MCP
globs: *
alwaysApply: true
---

# InsForge SDK Documentation - Overview

## What is InsForge?

Backend-as-a-service (BaaS) platform providing:

- **Database**: PostgreSQL with PostgREST API
- **Authentication**: Email/password + OAuth (Google, GitHub)
- **Storage**: File upload/download
- **AI**: Chat completions and image generation (OpenAI-compatible)
- **Functions**: Serverless function deployment
- **Realtime**: WebSocket pub/sub (database + client events)

## Installation

The following is a step-by-step guide to installing and using the InsForge TypeScript SDK for Web applications. If you are building other types of applications, please refer to:
- [Swift SDK documentation](/sdks/swift/overview) for iOS, macOS, tvOS, and watchOS applications.
- [Kotlin SDK documentation](/sdks/kotlin/overview) for Android applications.
- [REST API documentation](/sdks/rest/overview) for direct HTTP API access.

### 🚨 CRITICAL: Follow these steps in order

### Step 1: Download Template

Use the `download-template` MCP tool to create a new project with your backend URL and anon key pre-configured.

### Step 2: Install SDK

```bash
npm install @insforge/sdk@latest
```

### Step 3: Create SDK Client

You must create a client instance using `createClient()` with your base URL and anon key:

```javascript
import { createClient } from '@insforge/sdk';

const client = createClient({
  baseUrl: 'https://your-app.region.insforge.app',  // Your InsForge backend URL
  anonKey: 'your-anon-key-here'       // Get this from backend metadata
});

```

**API BASE URL**: Your API base URL is `https://your-app.region.insforge.app`.

## Getting Detailed Documentation

### 🚨 CRITICAL: Always Fetch Documentation Before Writing Code

InsForge provides official SDKs and REST APIs, use them to interact with InsForge services from your application code.

- [TypeScript SDK](/sdks/typescript/overview) - JavaScript/TypeScript
- [Swift SDK](/sdks/swift/overview) - iOS, macOS, tvOS, and watchOS
- [Kotlin SDK](/sdks/kotlin/overview) - Android and Kotlin Multiplatform
- [REST API](/sdks/rest/overview) - Direct HTTP API access

Before writing or editing any InsForge integration code, you **MUST** call the `fetch-docs` or `fetch-sdk-docs` MCP tool to get the latest SDK documentation. This ensures you have accurate, up-to-date implementation patterns.

### Use the InsForge `fetch-docs` MCP tool to get specific SDK documentation:

Available documentation types:

- `"instructions"` - Essential backend setup (START HERE)
- `"real-time"` - Real-time pub/sub (database + client events) via WebSockets
- `"db-sdk-typescript"` - Database operations with TypeScript SDK
- **Authentication** - Choose based on implementation:
  - `"auth-sdk-typescript"` - TypeScript SDK methods for custom auth flows
  - `"auth-components-react"` - Pre-built auth UI for React+Vite (singlepage App)
  - `"auth-components-react-router"` - Pre-built auth UI for React(Vite+React Router) (Multipage App)
  - `"auth-components-nextjs"` - Pre-built auth UI for Nextjs (SSR App)
- `"storage-sdk"` - File storage operations
- `"functions-sdk"` - Serverless functions invocation
- `"ai-integration-sdk"` - AI chat and image generation
- `"real-time"` - Real-time pub/sub (database + client events) via WebSockets
- `"deployment"` - Deploy frontend applications via MCP tool

These documentations are mostly for TypeScript SDK. For other languages, you can also use `fetch-sdk-docs` mcp tool to get specific documentation.

### Use the InsForge `fetch-sdk-docs` MCP tool to get specific SDK documentation

You can fetch sdk documentation using the `fetch-sdk-docs` MCP tool with specific feature type and language.

Available feature types:
- db - Database operations
- storage - File storage operations
- functions - Serverless functions invocation
- auth - User authentication
- ai - AI chat and image generation
- realtime - Real-time pub/sub (database + client events) via WebSockets

Available languages:
- typescript - JavaScript/TypeScript SDK
- swift - Swift SDK (for iOS, macOS, tvOS, and watchOS)
- kotlin - Kotlin SDK (for Android and JVM applications)
- rest-api - REST API

## When to Use SDK vs MCP Tools

### Always SDK for Application Logic:

- Authentication (register, login, logout, profiles)
- Database CRUD (select, insert, update, delete)
- Storage operations (upload, download files)
- AI operations (chat, image generation)
- Serverless function invocation

### Use MCP Tools for Infrastructure:

- Project scaffolding (`download-template`) - Download starter templates with InsForge integration
- Backend setup and metadata (`get-backend-metadata`)
- Database schema management (`run-raw-sql`, `get-table-schema`)
- Storage bucket creation (`create-bucket`, `list-buckets`, `delete-bucket`)
- Serverless function deployment (`create-function`, `update-function`, `delete-function`)
- Frontend deployment (`create-deployment`) - Deploy frontend apps to InsForge hosting

## Important Notes

- For auth: use `auth-sdk` for custom UI, or framework-specific components for pre-built UI
- SDK returns `{data, error}` structure for all operations
- Database inserts require array format: `[{...}]`
- Serverless functions have single endpoint (no subpaths)
- Storage: Upload files to buckets, store URLs in database
- AI operations are OpenAI-compatible
- **PROJECT OVERRIDE**: This project uses **TailwindCSS v4** (not v3.4). Do not downgrade.

---

## Project Context — Gio Barber Shop

This is **barber-dates-web**, a web booking app for a men's barbershop. Two roles: **client** (books appointments, earns loyalty points, redeems rewards) and **admin** (manages services, schedules, blocked days, metrics).

**Stack**: React 19 + Vite + TypeScript strict · TailwindCSS v4 · shadcn/ui · React Router v7 · TanStack Query v5 · Zustand · Vitest + MSW v2 · InsForge (PostgreSQL + Auth + Storage)

### Architecture — Clean Architecture (strict layers)

```
src/domain/           # Pure types + business rules — zero external imports
src/infrastructure/   # InsForge adapters — imports only from domain/
src/hooks/            # TanStack Query + orchestration — imports domain/ + infrastructure/
src/components/       # Reusable UI — imports hooks/ + domain/
src/pages/            # Screens — imports hooks/ + components/ + domain/
src/stores/           # Zustand — UI state only (never remote data)
src/lib/              # Shared utilities (cn, formatters)
src/mocks/            # MSW handlers + fixtures (dev + tests)
```

**Import law**: `pages → components → hooks → infrastructure → domain`. Never backwards.
**domain/ never imports**: React, InsForge SDK, date-fns, or any external package.
**Naming**: snake_case in DB ↔ camelCase in domain. Mappers live in `infrastructure/`, never leak snake_case to upper layers.

### Database Schema (PostgreSQL / InsForge)

```sql
profiles              id, full_name, phone, avatar_url, role('client'|'admin'), created_at, updated_at
services              id, name, description, duration_minutes, price, loyalty_points, is_active, sort_order
appointments          id, client_id→profiles, service_id→services, start_time, end_time, status, notes
                      status: 'confirmed' | 'completed' | 'cancelled' | 'no_show'
schedule_blocks       id, block_date, start_time, end_time, day_of_week, reason, is_recurring
shop_config           id, key (unique), value (JSONB)
loyalty_cards         id, client_id→profiles (unique), total_points, total_visits
loyalty_transactions  id, card_id→loyalty_cards, appointment_id→appointments, points, type, description
                      type: 'earned' | 'redeemed' | 'bonus' | 'adjustment'
rewards               id, name, description, points_cost, is_active
redeemed_rewards      id, card_id→loyalty_cards, reward_id→rewards, redeemed_at
```

### Row Level Security (RLS) — enabled on all tables

| Table | Client can | Admin can |
|-------|-----------|-----------|
| `profiles` | Read/update own row | Read/update all |
| `appointments` | Read/create/update own rows | Full CRUD |
| `services` | Read (public) | Full CRUD |
| `rewards` | Read (public) | Full CRUD |
| `loyalty_cards` | Read own | Read all |
| `loyalty_transactions` | Read own | Read all |
| `schedule_blocks` | Read | Full CRUD |
| `shop_config` | Read | Full CRUD |

### Business Rules (live in `src/domain/`, never in components)

1. A client can have at most **1 future active appointment** (`status='confirmed'`) at a time.
2. Appointments can be cancelled up to **2 hours before** start time (`CANCELLATION_LIMIT_HOURS = 2`).
3. Loyalty points are awarded when the appointment status changes to **`completed`** (not on booking or confirmation).
4. Admin can block specific days/hours via `schedule_blocks`.
5. Services have fixed duration that determines available booking slots.
6. **Client session**: persistent indefinitely.
7. **Admin session**: maximum **15 days** from login (`ADMIN_SESSION_MAX_DAYS = 15`). Force logout if exceeded. Login timestamp stored in `localStorage` under key `admin_login_time`.