create table public.department (
  id uuid not null default gen_random_uuid (),
  department_name text null,
  description text null,
  created_at timestamp with time zone null default now(),
  department_code text null,
  manager_id uuid null,
  status text null default 'Active'::text,
  manager_name text null,
  constraint department_pkey primary key (id),
  constraint department_department_name_key unique (department_name)
) TABLESPACE pg_default;