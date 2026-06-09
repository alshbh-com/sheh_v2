CREATE OR REPLACE FUNCTION public.get_storage_usage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_db_bytes bigint;
  v_limit_bytes bigint := 524288000; -- 500 MB
BEGIN
  SELECT pg_database_size(current_database()) INTO v_db_bytes;
  RETURN jsonb_build_object(
    'db_bytes', v_db_bytes,
    'limit_bytes', v_limit_bytes,
    'free_bytes', GREATEST(v_limit_bytes - v_db_bytes, 0),
    'used_percent', ROUND((v_db_bytes::numeric / v_limit_bytes::numeric) * 100, 2)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_storage_usage() TO anon, authenticated, service_role;