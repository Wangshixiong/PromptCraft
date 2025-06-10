-- 创建用于刷新 PostgREST schema cache 的函数
-- 在 Supabase SQL 编辑器中执行此脚本

-- 1. 创建刷新 schema cache 的函数
CREATE OR REPLACE FUNCTION notify_pgrst_reload()
RETURNS void AS $$
BEGIN
  -- 发送 NOTIFY 信号给 PostgREST 以重新加载 schema cache
  NOTIFY pgrst, 'reload schema';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 授予执行权限给认证用户
GRANT EXECUTE ON FUNCTION notify_pgrst_reload() TO authenticated;

-- 3. 创建 RLS 策略（如果需要）
-- 由于这是一个无害的操作，我们允许所有认证用户执行
COMMENT ON FUNCTION notify_pgrst_reload() IS '刷新 PostgREST schema cache 的函数，用于解决 schema cache 相关错误';