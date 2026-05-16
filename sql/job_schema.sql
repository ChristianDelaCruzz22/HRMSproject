create table public.job (
  id uuid not null default gen_random_uuid (),
  employee_id uuid null,
  department_id uuid null,
  position text null,
  work_location text null default 'On-site'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint job_pkey primary key (id),
  constraint job_employee_id_key unique (employee_id),
  constraint job_department_id_fkey foreign KEY (department_id) references department (id),
  constraint job_employee_id_fkey foreign KEY (employee_id) references employee (id) on delete CASCADE
) TABLESPACE pg_default;