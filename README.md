# Academic Alert Management System

A comprehensive Web Application for managing academic alerts and student status across 4 campuses (Hanoi, Danang, HCM, Can Tho). Built with **React**, **Vite**, **TailwindCSS**, and **Supabase**.

## Tech Stack
- **Frontend**: React 18, Vite, TypeScript
- **Styling**: TailwindCSS, Lucide Icons, Shadcn-like components
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **State**: React Context + Local State

## Getting Started

### 1. Prerequisites
- Node.js 18+
- A Supabase Project

### 2. Setup
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create `.env` file:
    ```bash
    cp .env.example .env
    ```
    Fill in your Supabase credentials.

### 3. Database Initialization
Copy the content of `supabase/schema.sql` and run it in your Supabase SQL Editor. This will:
- Create `profiles` and `reports` tables.
- Set up **Row Level Security (RLS)** policies.
- Create automated triggers.

### 4. Running
```bash
npm run dev
```

## Role Accounts (Demo)
You can create these users in Supabase Auth to test:
- **Lecturer**: `gv_hn@demo.com` (Role: gv, Campus: HN)
- **Manager**: `cnbm_hn@demo.com` (Role: cnbm, Campus: HN)
- **Admin**: `admin@demo.com` (Role: truong_nganh)
