DO $$
DECLARE _src text; _new text;
BEGIN
  SELECT prosrc INTO _src FROM pg_proc WHERE proname = 'reset_demo_data';
  _new := replace(_src, 'PHQ-9', 'PHQ9');
  EXECUTE format(
    'CREATE OR REPLACE FUNCTION public.reset_demo_data() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''public'' AS %L',
    _new);
END $$;

REVOKE EXECUTE ON FUNCTION public.reset_demo_data() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.reset_demo_data() TO authenticated;