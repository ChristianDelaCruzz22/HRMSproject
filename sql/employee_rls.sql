-- =====================================
-- EMPLOYEE TABLE RLS
-- =====================================

ALTER TABLE public.employee ENABLE ROW LEVEL SECURITY;

-- SELECT
DROP POLICY IF EXISTS employee_select_policy ON public.employee;

CREATE POLICY employee_select_policy
ON public.employee
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1
        FROM public.employee e
        WHERE e.user_id = auth.uid()
        AND e.role IN ('Admin', 'SuperAdmin')
    )
);

-- INSERT
DROP POLICY IF EXISTS employee_insert_policy ON public.employee;

CREATE POLICY employee_insert_policy
ON public.employee
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id
);

-- UPDATE
DROP POLICY IF EXISTS employee_update_policy ON public.employee;

CREATE POLICY employee_update_policy
ON public.employee
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1
        FROM public.employee e
        WHERE e.user_id = auth.uid()
        AND e.role IN ('Admin', 'SuperAdmin')
    )
)
WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1
        FROM public.employee e
        WHERE e.user_id = auth.uid()
        AND e.role IN ('Admin', 'SuperAdmin')
    )
);