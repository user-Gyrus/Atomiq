# Application Architecture & Directory Structure

## Overview
This application (**Atomiq**) is a full-stack Progressive Web Application (PWA) designed for tracking personal habits, maintaining streaks, and supporting social/community habit challenges with friends and groups.

### Technology Stack
- **Frontend**: React 18 (Vite, TypeScript), Tailwind CSS, Radix UI / Shadcn UI primitives, Framer Motion, Recharts, `vite-plugin-pwa` with custom Service Worker (`sw-custom.ts`).
- **Backend**: Node.js, Express.js (TypeScript), MongoDB with Mongoose ORM, Passport.js (JWT & Google OAuth 2.0), `web-push` for Push Notifications, `node-cron` for automated streak evaluation & scheduled notifications.

---

## High-Level Architecture Diagram

```
+-----------------------------------------------------------------------+
|                             Frontend                                  |
|  React 18 + Vite PWA (Client)                                         |
|  - UI Components (Radix UI / Tailwind CSS)                            |
|  - Service Worker (sw-custom.ts for Web Push & Offline Support)       |
|  - API Client Layer (src/lib/api.ts & adminApi.ts)                    |
+-----------------------------------+-----------------------------------+
                                    | HTTP / REST API (Bearer JWT Header)
                                    v
+-----------------------------------------------------------------------+
|                             Backend                                   |
|  Node.js + Express 5 (Server)                                         |
|  - Routes & Controllers (Auth, Habits, Friends, Groups, Push, Admin)  |
|  - Middleware (JWT Auth Guard, Passport Google Strategy)              |
|  - Services & Schedulers (Notification Scheduler via node-cron)       |
|  - Utilities (Streak calculation, Date formatting, Code generation)   |
+-----------------------------------+-----------------------------------+
                                    | Mongoose ODM
                                    v
+-----------------------------------------------------------------------+
|                             Database                                  |
|  MongoDB Database                                                     |
|  - Collections: Users, Habits, Streaks, Groups, Notifications         |
+-----------------------------------------------------------------------+
```

---

## Repository Directory Tree Structure

```
habit-tracker/
├── .github/                      # GitHub Workflows and Actions
├── docs/                         # Architecture and Project Documentation
│   └── architecture.md           # Full Architecture & Tree Breakdown (This File)
├── public/                       # Static Assets & PWA Icons
│   ├── apple-touch-icon-180x180.png
│   ├── badge-96x96.png
│   ├── favicon.png
│   ├── logo-pwa-edit.png
│   ├── maskable-icon-512x512.png
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   ├── sw.js                    # Generated Service Worker script
│   └── sw-custom.js             # Service Worker custom event handlers
├── server/                       # Express Backend Service
│   ├── .env                      # Server Environment Variables (DB URI, JWT secrets, Web Push keys)
│   ├── package.json              # Server dependencies (Express, Mongoose, Passport, Web-push, Node-cron)
│   ├── tsconfig.json             # TypeScript configuration for backend
│   └── src/                      # Backend Source Code
│       ├── index.ts              # Express server entry point & MongoDB connection
│       ├── config/               # Database & Authentication config
│       │   ├── db.ts             # MongoDB Mongoose connection setup
│       │   └── passport.ts       # Google OAuth 2.0 Passport strategy configuration
│       ├── controllers/          # Business logic handlers for REST endpoints
│       │   ├── adminController.ts        # Admin analytics, user management, system controls
│       │   ├── authController.ts         # Login, register, profile update, Google OAuth auth
│       │   ├── friendController.ts       # Add/remove friends, friend codes, friend habit view
│       │   ├── groupController.ts        # Create/join groups, group streaks, member management
│       │   ├── habitController.ts        # CRUD operations for habits, habit completions & freezes
│       │   ├── notificationController.ts # Fetch & mark notifications as read
│       │   └── pushController.ts         # Push notification subscription management
│       ├── middleware/           # HTTP Request Middlewares
│       │   └── authMiddleware.ts # JWT authentication guard middleware
│       ├── models/               # Mongoose Data Schemas & Models
│       │   ├── Group.ts          # Group model (members, habits, invite code, streaks)
│       │   ├── Habit.ts          # Habit schema (frequency, target, reminder time, category)
│       │   ├── Notification.ts   # In-app notification schema
│       │   ├── Streak.ts         # Streak calculation log schema
│       │   └── User.ts           # User schema (credentials, stats, freeze tokens, friend code)
│       ├── routes/               # API Route Definitions
│       │   ├── adminRoutes.ts    # Administrative endpoints
│       │   ├── authRoutes.ts     # Login, register, Google OAuth endpoints
│       │   ├── friendRoutes.ts   # Friend management endpoints
│       │   ├── groupRoutes.ts    # Community group endpoints
│       │   ├── habitRoutes.ts    # Habit tracking endpoints
│       │   ├── notificationRoutes.ts # Notification endpoints
│       │   ├── pushRoutes.ts     # Push notification subscription endpoints
│       │   └── pushTestRoutes.ts # Push testing endpoints
│       ├── scripts/              # Migration and maintenance scripts
│       │   └── migrateGroupCodes.ts # Utility script to generate missing group invite codes
│       ├── services/             # Background processes & scheduled workers
│       │   └── notificationScheduler.ts # Node-cron job for daily reminders & streak resetting
│       └── utils/                # Server Helper Utility Functions
│           ├── checkGroupStreaks.ts  # Evaluates and updates group streak milestones
│           ├── dateUtils.ts         # Timezone & date normalization functions
│           ├── generateFriendCode.ts # Random unique friend code generator
│           ├── generateGroupCode.ts  # Unique group invitation code generator
│           ├── generateToken.ts       # JWT token generator
│           └── streakUtils.ts         # Daily/weekly habit completion & streak math
├── src/                          # Frontend React Client
│   ├── config.ts                 # Frontend runtime config (API Base URL resolution)
│   ├── main.tsx                  # React application root DOM mount point
│   ├── sw-custom.ts              # Service worker TypeScript source for Web Push notifications
│   ├── vite-env.d.ts             # Vite environment typings
│   ├── app/                      # Application Components and Screens
│   │   ├── App.tsx               # Main application container, router, navigation state & view renderer
│   │   ├── components/           # UI Components and Screen Views
│   │   │   ├── BottomNav.tsx            # Navigation bar for mobile views
│   │   │   ├── CreateGroupScreen.tsx    # Modal/screen for creating new group habits
│   │   │   ├── CreateHabitScreen.tsx    # Modal/screen for creating & editing individual habits
│   │   │   ├── FriendHabitsModal.tsx    # Overlay for viewing friends' active habits and progress
│   │   │   ├── GroupDetailsScreen.tsx   # Detailed view of a group habit, leaderboards, and logs
│   │   │   ├── GroupsScreen.tsx         # List of user's active groups & available group actions
│   │   │   ├── HabitCard.tsx            # Individual habit card rendering completion status & streaks
│   │   │   ├── HabitsScreen.tsx         # Main habits list view (Today, Upcoming, Completed)
│   │   │   ├── InviteFriendScreen.tsx   # Screen for generating and sharing friend invite codes
│   │   │   ├── LoadingSkeletons.tsx     # Skeleton loaders for async UI states
│   │   │   ├── LoginScreen.tsx          # Login & registration authentication screen
│   │   │   ├── OnboardingScreen.tsx     # New user walkthrough screens
│   │   │   ├── PrivacyPolicyScreen.tsx  # In-app privacy policy & data disclosure view
│   │   │   ├── ProfileScreen.tsx        # User profile, statistics, freeze token management & settings
│   │   │   ├── PWAInstallPrompt.tsx     # Native PWA install banner prompt
│   │   │   ├── SocialScreen.tsx         # Social hub screen (Friends, Requests, Leaderboards, Activity)
│   │   │   ├── UpdateNotification.tsx   # PWA update prompt toast for new app versions
│   │   │   ├── figma/                   # Custom UI design integration helpers
│   │   │   │   └── ImageWithFallback.tsx
│   │   │   └── ui/                      # Reusable Component Library (Shadcn UI / Radix primitives)
│   │   │       ├── AchievementToast.tsx
│   │   │       ├── accordion.tsx
│   │   │       ├── alert-dialog.tsx
│   │   │       ├── button.tsx
│   │   │       ├── card.tsx
│   │   │       ├── dialog.tsx
│   │   │       ├── progress.tsx
│   │   │       ├── select.tsx
│   │   │       ├── sidebar.tsx
│   │   │       ├── tabs.tsx
│   │   │       └── ... (40+ Radix UI / Tailwind primitives)
│   │   ├── context/              # React Context Providers
│   │   │   └── AchievementContext.tsx # Global achievement unlocked toast triggers
│   │   └── hooks/                # Custom React Hooks
│   │       └── useUpdateNotification.ts # Custom hook detecting service worker updates
│   ├── lib/                      # Client API Layer & Helper Libraries
│   │   ├── adminApi.ts           # Admin dashboard API endpoint callers
│   │   ├── api.ts                # Axios HTTP client configuration and interceptors
│   │   └── pushNotifications.ts  # Web Push subscription helper routines (VAPID key setup)
│   └── styles/                   # Styling & Theme Definitions
│       ├── fonts.css             # Custom typography definitions
│       ├── index.css             # Tailwind base & global styles
│       ├── tailwind.css          # Tailwind configuration entry
│       └── theme.css             # Theme variables (Light/Dark mode color tokens)
├── .env                          # Frontend environment variables (VITE_API_URL, VAPID public key)
├── .env.example                  # Template environment variables
├── .gitignore                    # Git version control ignore rules
├── eslint.config.js              # ESLint configuration
├── index.html                    # Single Page Application HTML entry point
├── netlify.toml                  # Netlify deployment configuration
├── package.json                  # Root dependencies & build scripts
├── postcss.config.mjs            # PostCSS configuration for Tailwind
├── resize-icons.js               # Script to generate standard PWA icon resolutions
├── tsconfig.json                 # TypeScript compiler setup (root)
└── vite.config.ts                # Vite bundler, PWA plugin & dev server setup
```

---

## Functional Breakdown of Major Directories & Layers

### 1. Frontend Client Layer (`/src`)
- **App.tsx**: Orchestrates top-level application state, view routing (`activeTab`), active modal overlays, user authentication persistence, streak freeze application, and data refetching.
- **components/**: Encapsulates screen-level views and user interface widgets:
  - `HabitsScreen.tsx`: Displays current habit checklist, streak statuses, and progress completion metrics.
  - `SocialScreen.tsx`: Manages friend connections, leaderboard rankings, activity feeds, and social habit comparisons.
  - `GroupsScreen.tsx` & `GroupDetailsScreen.tsx`: Manages shared group challenges, group streaks, member progress logs, and group invite codes.
  - `ProfileScreen.tsx`: Handles user profile settings, achievement badges, streak freeze inventory, and account security.
- **ui/**: Reusable accessible UI component primitives built with Radix UI and styled with Tailwind CSS.
- **lib/**: Axios HTTP client (`api.ts`), Web Push subscription manager (`pushNotifications.ts`), and Admin portal API integrations (`adminApi.ts`).

### 2. Backend Server Layer (`/server`)
- **index.ts**: Configures Express app middleware (CORS, JSON parsers, Passport initialization), connects to MongoDB, mounts API routes, and starts background workers.
- **routes/** & **controllers/**:
  - `auth`: Handles user registration, password hashing (`bcryptjs`), login, JWT issue, and Google OAuth 2.0 authentication.
  - `habit`: Manages creation, editing, deletion, daily completion check-offs, and streak freezes.
  - `friend`: Handles sending/accepting friend requests, friend code lookups, and friend habit inspection.
  - `group`: Handles group lifecycle, code-based group joining, group member management, and group streaks.
  - `push`: Handles VAPID public key delivery and browser Web Push subscriptions.
  - `admin`: Exposes system metrics, user stats, and administrative configuration controls.
- **models/**: Mongoose schemas defining structural data integrity for `User`, `Habit`, `Streak`, `Group`, and `Notification`.
- **services/**:
  - `notificationScheduler.ts`: Background job engine powered by `node-cron` executing periodic tasks (daily streak checks, reset broken streaks, dispatch push notifications).
- **utils/**: Streak math algorithms (`streakUtils.ts`), date/timezone helpers (`dateUtils.ts`), group streak evaluators (`checkGroupStreaks.ts`), and random code generators.