-- =====================================
-- JOB TABLE RLS
-- =====================================

ALTER TABLE public.job ENABLE ROW LEVEL SECURITY;

-- READ
DROP POLICY IF EXISTS job_read_policy ON public.job;

CREATE POLICY job_read_policy
ON public.job
FOR SELECT
TO authenticated
USING (
    true
);

-- ADMIN MANAGEMENT
DROP POLICY IF EXISTS job_manage_policy ON public.job;

CREATE POLICY job_manage_policy
ON public.job
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.employee e
        WHERE e.user_id = auth.uid()
        AND e.role IN ('Admin', 'SuperAdmin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.employee e
        WHERE e.user_id = auth.uid()
        AND e.role IN ('Admin', 'SuperAdmin')
    )
);