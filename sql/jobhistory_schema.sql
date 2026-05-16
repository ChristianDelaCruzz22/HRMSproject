create table public.jobhistory (
  id uuid not null default gen_random_uuid (),
  employee_id uuid null,
  department_id uuid null,
  position text null,
  work_location text null,
  status text null,
  role text null,
  start_date timestamp with time zone null default now(),
  end_date timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  modified_by uuid null,
  constraint jobhistory_pkey primary key (id),
  constraint jobhistory_department_id_fkey foreign KEY (department_id) references department (id),
  constraint jobhistory_employee_id_fkey foreign KEY (employee_id) references employee (id) on delete CASCADE,
  constraint jobhistory_modified_by_fkey foreign KEY (modified_by) references auth.users (id)
) TABLESPACE pg_default;