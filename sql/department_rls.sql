-- =====================================
-- DEPARTMENT TABLE RLS
-- =====================================

ALTER TABLE public.department ENABLE ROW LEVEL SECURITY;

-- READ
DROP POLICY IF EXISTS department_read_policy ON public.department;

CREATE POLICY department_read_policy
ON public.department
FOR SELECT
TO authenticated
USING (
    true
);

-- INSERT / UPDATE
DROP POLICY IF EXISTS department_manage_policy ON public.department;

CREATE POLICY department_manage_policy
ON public.department
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