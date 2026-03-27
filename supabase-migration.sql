-- Add ow_team_id to teams table
alter table teams add column if not exists ow_team_id text;

-- Add athlete info columns to team_athletes
alter table team_athletes add column if not exists athlete_name text;
alter table team_athletes add column if not exists athlete_email text;
alter table team_athletes add column if not exists pairing_link text;

-- Add avatar URL column to team_athletes (stores Supabase Storage public URL)
alter table team_athletes add column if not exists avatar_url text;
