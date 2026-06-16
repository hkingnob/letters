-- Digital Letters — Supabase schema & security
-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run (drops/recreates policies).

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────

create table if not exists profiles (
  id           uuid primary key references auth.users on delete cascade,
  first_name   text not null,
  lat          double precision,
  lng          double precision,
  city         text,
  loc_updated  timestamptz
);

create table if not exists letters (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references profiles(id),
  recipient_id  uuid not null references profiles(id),
  file_path     text not null,          -- path in the private 'letters' storage bucket
  file_name     text,                   -- original filename, for display/download
  file_type     text,                   -- MIME type, to decide how to show it
  origin_city   text,
  posted_at     timestamptz not null default now(),
  deliver_at    timestamptz not null,   -- computed at posting; never changes
  opened_at     timestamptz             -- set by recipient when they break the seal
);

-- ─────────────────────────────────────────────────────────────
-- Row-level security
-- ─────────────────────────────────────────────────────────────

alter table profiles enable row level security;
alter table letters  enable row level security;

-- PROFILES ----------------------------------------------------
-- Authenticated users can read all profiles (needed to pick a recipient
-- and to read their last-known location for the distance calculation).
drop policy if exists "read profiles" on profiles;
create policy "read profiles"
on profiles for select
to authenticated
using (true);

drop policy if exists "insert own profile" on profiles;
create policy "insert own profile"
on profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "update own profile" on profiles;
create policy "update own profile"
on profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- LETTERS -----------------------------------------------------
-- THE SEAL: a recipient cannot even see that a letter exists until its
-- delivery date has passed. The sender always sees their own sent letters.
drop policy if exists "see sent and arrived-incoming" on letters;
create policy "see sent and arrived-incoming"
on letters for select
to authenticated
using (
  auth.uid() = sender_id
  or (auth.uid() = recipient_id and deliver_at <= now())
);

-- Anyone authenticated can post a letter as themselves.
drop policy if exists "post a letter" on letters;
create policy "post a letter"
on letters for insert
to authenticated
with check (auth.uid() = sender_id);

-- Recipient can update (only to record opening), and only after arrival.
drop policy if exists "open an arrived letter" on letters;
create policy "open an arrived letter"
on letters for update
to authenticated
using (auth.uid() = recipient_id and deliver_at <= now())
with check (auth.uid() = recipient_id);

-- ─────────────────────────────────────────────────────────────
-- Storage: private 'letters' bucket
-- Create the bucket first in Storage → New bucket → name "letters",
-- and leave "Public bucket" UNCHECKED. Then run the policies below.
-- ─────────────────────────────────────────────────────────────

-- Sender can upload files (objects live under their own user-id folder).
drop policy if exists "upload own letter files" on storage.objects;
create policy "upload own letter files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'letters'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Reading a file mirrors the seal: sender any time; recipient only after arrival.
drop policy if exists "read sealed file after arrival" on storage.objects;
create policy "read sealed file after arrival"
on storage.objects for select
to authenticated
using (
  bucket_id = 'letters'
  and exists (
    select 1 from letters l
    where l.file_path = storage.objects.name
      and (
        l.sender_id = auth.uid()
        or (l.recipient_id = auth.uid() and l.deliver_at <= now())
      )
  )
);
