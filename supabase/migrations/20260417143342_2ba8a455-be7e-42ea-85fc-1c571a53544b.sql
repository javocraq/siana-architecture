INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'daniela@sianamarketing.com'
ON CONFLICT DO NOTHING;
DELETE FROM public.user_roles WHERE role = 'viewer' AND user_id IN (SELECT id FROM auth.users WHERE email = 'daniela@sianamarketing.com');