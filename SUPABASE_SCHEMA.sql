-- Run this in your Supabase SQL Editor
-- Table: responses

create table if not exists responses (
  id              bigint generated always as identity primary key,
  submitted_at    timestamptz default now(),
  marital_status  smallint,        -- 1=Married 2=Widowed 3=Divorced 4=Separated 5=Never married

  -- ISS items (0-10 each, raw stored as displayed)
  iss_1           smallint,
  iss_2           smallint,
  iss_3           smallint,
  iss_4           smallint,
  iss_5           smallint,
  iss_6           smallint,
  iss_avg         numeric(4,2),   -- average of iss_1 through iss_6

  -- Grit items (1-5 each, raw)
  -- Items 1-6: Consistency of Interests (reverse scored in app before computing grit_avg)
  -- Items 7-12: Perseverance of Effort
  grit_1          smallint,
  grit_2          smallint,
  grit_3          smallint,
  grit_4          smallint,
  grit_5          smallint,
  grit_6          smallint,
  grit_7          smallint,
  grit_8          smallint,
  grit_9          smallint,
  grit_10         smallint,
  grit_11         smallint,
  grit_12         smallint,
  grit_avg        numeric(4,2)    -- after reverse scoring items 1-6, average of all 12
);

-- Allow anonymous inserts (survey respondents)
alter table responses enable row level security;

create policy "Allow anonymous insert"
  on responses for insert
  to anon
  with check (true);

-- Allow authenticated reads (admin dashboard uses anon key but you can lock this down further)
create policy "Allow anon select"
  on responses for select
  to anon
  using (true);
