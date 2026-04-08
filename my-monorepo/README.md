# ✈️ TravelLust

> A full-stack travel planning platform built with a microservices architecture.  
> Plan trips, search & book flights/hotels/attractions, collaborate with friends, and manage your itinerary — all in one place.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Services](#services)
- [Frontend](#frontend)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Port Reference](#port-reference)
- [Project Structure](#project-structure)

---

## Overview

TravelLust is an enterprise-grade travel management application developed as part of SMU's IS213 Enterprise Solution Development module. It follows a **microservices architecture** where each domain (flights, hotels, attractions, bookings, trips, notifications, etc.) is an independently deployable service. All services are containerised with Docker and orchestrated via Docker Compose.

**Key features:**
- 🔍 Search flights, hotels, and attractions via SerpAPI
- 🗓️ Build and manage trip itineraries with a visual timeline
- 🤝 Real-time collaborative trip planning
- 🎟️ Book flights, hotels, and attractions with confirmation notifications
- 🔔 Event-driven notifications via RabbitMQ
- 💬 In-app notification feed via Redis + WebSockets

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                           │
│                   (Vite + React + Tailwind)                     │
│                       localhost:8080                            │
└───────┬─────────────┬──────────────┬──────────────┬────────────┘
        │             │              │              │
   /api/trips    /api/plan    /api/collab    /api/book-*
        │             │              │              │
┌───────▼──────┐ ┌────▼────┐ ┌──────▼──────┐ ┌────▼───────────────┐
│ trips_atomic │ │  plan   │ │collaboration│ │  book-flight       │
│   :5001      │ │ :5011   │ │  :5010      │ │  book-hotels       │
└──────────────┘ └────┬────┘ └─────────────┘ │  book-attractions  │
                      │                       └────────┬───────────┘
              ┌───────┼───────┐                        │
         ┌────▼──┐ ┌──▼───┐ ┌▼──────────┐      ┌─────▼──────┐
         │flight │ │hotel │ │ saved-    │      │  RabbitMQ  │
         │mgmt   │ │mgmt  │ │ hotels    │      │  :5672     │
         │:5005  │ │:5009 │ │ :5008     │      └─────┬──────┘
         └───┬───┘ └──┬───┘ └───────────┘            │
         ┌───▼───┐ ┌──▼──────────┐           ┌───────▼──────┐
         │flight │ │hotel-search │           │notifications │
         │search │ │wrapper:5007 │           │   :5013      │
         │:5003  │ └─────────────┘           └──────┬───────┘
         └───────┘                                  │
                                             ┌──────▼───┐
                                             │  Redis   │
                                             │  :6379   │
                                             └──────────┘
```

---

## Services

All microservices live under `apps/` and are **Python/Flask** based unless noted otherwise.

| Service | Port | Description |
|---|---|---|
| `trips_atomic` | 5001 | Core atomic CRUD service for trips — stores trip metadata, nodes (flights, hotels, attractions), and collaborators |
| `attractions` | 5002 | Atomic CRUD service for the attractions catalogue backed by Supabase |
| `flight-search-wrapper` | 5003 | Thin wrapper around SerpAPI's Google Flights endpoint |
| `saved-flights` | 5004 | Persists user-saved flight offers to Supabase |
| `flight-management` | 5005 | **Composite** — orchestrates search, saving, and retrieval of flights |
| `booked_tickets` | 5006 | Atomic CRUD for confirmed bookings (flights, hotels, attractions) |
| `hotel-search-wrapper` | 5007 | Thin wrapper around SerpAPI's Google Hotels endpoint |
| `saved-hotels` | 5008 | Persists user-saved hotel results to Supabase |
| `hotel-management` | 5009 | **Composite** — orchestrates hotel search, saving, and retrieval |
| `collaboration_service` | 5010 | Manages trip collaborators and real-time presence via WebSockets |
| `plan_service` | 5011 | **Composite** — coordinates the full trip planning flow (flights + hotels + savings + trip updates) |
| `book-hotels` | 5012 | **Composite** — handles the hotel booking flow, updates trip nodes, publishes notifications |
| `notifications` | 5013 | Consumes RabbitMQ events and delivers in-app notifications; uses Redis for pub/sub |
| `book-flight` | 5014 | **Composite** — handles the end-to-end flight booking flow |
| `book-attractions` | 5015 | **Composite** — handles the attraction booking flow |

### Message Broker

| Service | Port | Purpose |
|---|---|---|
| RabbitMQ | 5672 / 15672 | Async event bus for booking confirmations → notifications |
| Redis | 6379 | Notification pub/sub + caching for plan service |

---

## Frontend

| Detail | Value |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Animations | Framer Motion |
| Icons | Lucide React |
| State | TanStack Query + React Context |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod |
| Real-time | Socket.IO Client |
| Testing | Vitest + React Testing Library |

### Pages

| Route | Page | Description |
|---|---|---|
| `/` | `Landing.tsx` | Hero page with search forms |
| `/search` | `SearchResults.tsx` | Flight, hotel, and attraction search results |
| `/trips` / `/trips/:id` | `Index.tsx` | Trip itinerary workspace (timeline, map, ledger) |
| `/item/:type/:id` | `ItemDetail.tsx` | Detailed view of a flight or hotel before booking |
| `/booking` | `Booking.tsx` | Checkout and payment flow |
| `/booked` | `BookedTickets.tsx` | Confirmed booking dashboard |
| `/profile` | `Profile.tsx` | User profile and settings |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (v24+)
- [Node.js](https://nodejs.org/) (v20+) — for frontend development
- [npm](https://www.npmjs.com/) (v10+)

---

## Getting Started

### 1. Clone the repo

```bash
git clone <repo-url>
cd my-monorepo
```

### 2. Configure environment variables

Copy the example env file and fill in your own API keys and Supabase credentials:

```bash
cp .env.example .env
# then edit .env with your values
```

See [Environment Variables](#environment-variables) for a full reference.

### 3. Start all backend services

```bash
docker compose up --build
```

This spins up all 15 microservices plus RabbitMQ and Redis. Wait for all health checks to pass (typically ~40–60 seconds on first boot).

To run in the background:

```bash
docker compose up --build -d
```

### 4. Start the frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The app will be available at **http://localhost:8080**.

> The Vite dev server automatically proxies all `/api/*` requests to their respective backend services. See `frontend/vite.config.ts` for the full proxy map.

---

## Environment Variables

All microservices read from a single root `.env` file at the monorepo root. Below is a reference for what each section controls.

```bash
# ── Redis ────────────────────────────────────────────────────────
REDIS_HOST=redis
REDIS_PORT=6379

# ── Flight Services ──────────────────────────────────────────────
FLIGHTS_SERPAPI_KEY=<your-serpapi-key>
SAVED_FLIGHTS_SUPABASE_URL=<supabase-url>
SAVED_FLIGHTS_SUPABASE_KEY=<supabase-anon-key>

# ── Hotel Services ───────────────────────────────────────────────
HOTELS_SERPAPI_KEY=<your-serpapi-key>
HOTELS_SUPABASE_URL=<supabase-url>
HOTELS_SUPABASE_KEY=<supabase-anon-key>

# ── Attractions Service ──────────────────────────────────────────
ATTRACTIONS_SUPABASE_URL=<supabase-url>
ATTRACTIONS_SUPABASE_KEY=<supabase-anon-key>

# ── Booked Tickets Service ───────────────────────────────────────
BOOKED_TICKETS_SUPABASE_URL=<supabase-url>
BOOKED_TICKETS_SUPABASE_KEY=<supabase-anon-key>

# ── Trips Atomic Service ─────────────────────────────────────────
TRIPS_SUPABASE_URL=<supabase-url>
TRIPS_SUPABASE_KEY=<supabase-anon-key>
```

> **Note:** The Collaboration Service reuses the Trips Supabase credentials for user access verification.

---

## Port Reference

| Port | Service |
|---|---|
| **8080** | Frontend (Vite dev server) |
| **5001** | trips_atomic |
| **5002** | attractions |
| **5003** | flight-search-wrapper |
| **5004** | saved-flights |
| **5005** | flight-management |
| **5006** | booked_tickets |
| **5007** | hotel-search-wrapper |
| **5008** | saved-hotels |
| **5009** | hotel-management |
| **5010** | collaboration_service |
| **5011** | plan_service |
| **5012** | book-hotels |
| **5013** | notifications |
| **5014** | book-flight |
| **5015** | book-attractions |
| **5672** | RabbitMQ (AMQP) |
| **6379** | Redis |
| **15672** | RabbitMQ Management UI |

---

## Project Structure

```
my-monorepo/
├── apps/                         # All backend microservices
│   ├── attractions/              # Attractions atomic service
│   ├── book-attractions/         # Composite: attraction booking
│   ├── book-flight/              # Composite: flight booking
│   ├── book-hotels/              # Composite: hotel booking
│   ├── booked_tickets/           # Booked tickets atomic service
│   ├── collaboration_service/    # Real-time collaboration
│   ├── flight-management/        # Composite: flight management
│   ├── flight-search-wrapper/    # SerpAPI flight search
│   ├── hotel-management/         # Composite: hotel management
│   ├── hotel-search-wrapper/     # SerpAPI hotel search
│   ├── notifications/            # Event-driven notifications
│   ├── plan_service/             # Composite: trip planning
│   ├── saved-flights/            # Saved flights atomic service
│   ├── saved-hotels/             # Saved hotels atomic service
│   └── trips_atomic/             # Trips atomic service
├── frontend/                     # React + Vite frontend
│   ├── src/
│   │   ├── api/                  # API client functions
│   │   ├── components/           # Reusable UI components
│   │   ├── contexts/             # React Context providers
│   │   ├── data/                 # Data fetching & mappers
│   │   ├── hooks/                # Custom React hooks
│   │   ├── pages/                # Route-level page components
│   │   ├── types/                # TypeScript type definitions
│   │   └── utils/                # Utility functions
│   └── vite.config.ts            # Vite config + API proxy map
├── packages/                     # Shared internal packages
├── docker-compose.yml            # Full stack orchestration
├── .env                          # Root env file for all services
└── nx.json                       # Nx monorepo configuration
```
