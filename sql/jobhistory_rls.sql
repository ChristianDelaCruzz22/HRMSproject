-- =====================================
-- JOB HISTORY TABLE RLS
-- =====================================

ALTER TABLE public.jobhistory ENABLE ROW LEVEL SECURITY;

-- READ
DROP POLICY IF EXISTS jobhistory_read_policy ON public.jobhistory;

CREATE POLICY jobhistory_read_policy
ON public.jobhistory
FOR SELECT
TO authenticated
USING (
    employee_id = auth.uid()
    OR
    EXISTS (
        SELECT 1
        FROM public.employee e
        WHERE e.user_id = auth.uid()
        AND e.role IN ('Admin', 'SuperAdmin')
    )
);

-- WRITE
DROP POLICY IF EXISTS jobhistory_write_policy ON public.jobhistory;

CREATE POLICY jobhistory_write_policy
ON public.jobhistory
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.employee e
        WHERE e.user_id = auth.uid()
        AND e.role IN ('Admin', 'SuperAdmin')
    )
);