-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Enum Types
-- Create Enum Types
create type user_role as enum ('gv', 'cnbm', 'truong_nganh', 'ho', 'dvsv');
create type campus_code as enum ('HN', 'DN', 'HCM', 'CT');
create type report_status as enum ('draft', 'submitted', 'approved', 'finalized');
create type dvsv_status as enum ('pending', 'success', 'failed');

-- Create Profiles Table (Public profile linked to Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  role user_role default 'gv',
  campus campus_code default 'HN',
  created_at timestamptz default now(),
  employee_code text,
  position text,
  status text default 'active',
  permissions text[]
);

-- Create Reports Table
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  lecturer_id uuid references public.profiles(id) not null,
  student_code text not null,
  student_name text not null,
  class_name text not null,
  subject text not null,
  campus campus_code not null, -- Denormalized for easier RLS
  
  -- Warning Flags
  warn_10 boolean default false,
  warn_15_17 boolean default false,
  warn_20 boolean default false,
  banned boolean default false, -- Cấm thi (AF)
  
  -- Details
  status_detail text default '',
  teacher_note text default '',
  dvsv_note text default '', -- Phản hồi DVSV
  dvsv_status dvsv_status default 'pending', -- Trạng thái chăm sóc của DVSV
  
  -- Meta
  status report_status default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.reports enable row level security;

-- PROFILES POLICIES
create policy "Public profiles are viewable by everyone" 
  on profiles for select using (true);

create policy "Users can update own profile" 
  on profiles for update using (auth.uid() = id);

-- REPORTS POLICIES

-- 1. View Policies
-- GV: View own reports
create policy "GV view own reports" 
  on reports for select 
  using (auth.uid() = lecturer_id);

-- CNBM: View reports in their campus
create policy "CNBM view campus reports" 
  on reports for select 
  using (
    exists (
      select 1 from profiles 
      where id = auth.uid() 
      and role = 'cnbm' 
      and profiles.campus = reports.campus
    )
  );

-- Admin & HO: View all reports
create policy "Admin and HO view all reports" 
  on reports for select 
  using (
    exists (
      select 1 from profiles 
      where id = auth.uid() 
      and role in ('truong_nganh', 'ho')
    )
  );

-- 2. Insert/Update Policies

-- GV: Insert/Update own reports only if status is draft
create policy "GV insert own reports" 
  on reports for insert 
  with check (auth.uid() = lecturer_id);

create policy "GV update own reports" 
  on reports for update 
  using (auth.uid() = lecturer_id and status = 'draft');

-- CNBM: Update status to 'approved' or 'draft' (reject) for their campus
create policy "CNBM approve reports" 
  on reports for update 
  using (
    exists (
      select 1 from profiles 
      where id = auth.uid() 
      and role = 'cnbm' 
      and profiles.campus = reports.campus
    )
  );

-- Admin: Update status to 'finalized'
create policy "Admin finalize reports" 
  on reports for update 
  using (
    exists (
      select 1 from profiles 
      where id = auth.uid() 
      and role = 'truong_nganh'
    )
  );

-- Function to handle new user signup (Trigger)
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, campus)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', (new.raw_user_meta_data->>'role')::user_role, (new.raw_user_meta_data->>'campus')::campus_code);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- SEED DATA script (run manually or via seed functionality if needed)
-- Note: You need to create Auth Users first to link them here.
-- This part creates dummy data assuming users exist. 
-- Validating data creation usually requires UUIDs from Auth.
-- We will just insert some dummy reports for testing if we mock the auth or after we manually create users.

-- Mock Reports (for demonstration, needs valid lecturer_id in real usage)
-- insert into public.reports (lecturer_id, student_code, student_name, class_name, subject, campus, warn_10, status)
-- values ('SOME_UUID', 'SV001', 'Nguyen Van A', 'GDB01', 'Photoshop', 'HN', true, 'draft');
