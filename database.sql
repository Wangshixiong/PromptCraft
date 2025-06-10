-- PromptCraft 数据库初始化脚本
-- 在Supabase SQL编辑器中执行此脚本

-- 1. 创建提示词表
CREATE TABLE IF NOT EXISTS prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL CHECK (length(title) > 0 AND length(title) <= 100),
  content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 2000),
  category TEXT DEFAULT '默认分类' CHECK (length(category) <= 50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category);
CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON prompts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_title ON prompts USING gin(to_tsvector('simple', title));
CREATE INDEX IF NOT EXISTS idx_prompts_content ON prompts USING gin(to_tsvector('simple', content));

-- 3. 启用行级安全策略
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- 4. 创建行级安全策略
-- 用户只能访问自己的提示词
CREATE POLICY "Users can only access their own prompts" ON prompts
  FOR ALL USING (auth.uid() = user_id);

-- 5. 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. 创建触发器
CREATE TRIGGER update_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. 插入默认提示词模板（可选）
-- 这些提示词将在用户首次登录时自动添加
-- 注意：这里使用的是示例数据，实际使用时会通过应用程序逻辑添加

/*
-- 示例默认提示词（在应用程序中通过JavaScript添加）
INSERT INTO prompts (user_id, title, content, category) VALUES
  (auth.uid(), '代码审查助手', '请帮我审查以下代码，重点关注：\n1. 代码质量和可读性\n2. 潜在的bug和安全问题\n3. 性能优化建议\n4. 最佳实践建议\n\n代码：\n[在这里粘贴代码]', '编程开发'),
  (auth.uid(), '文案优化师', '请帮我优化以下文案，要求：\n1. 语言更加生动有趣\n2. 逻辑清晰，条理分明\n3. 符合目标受众的阅读习惯\n4. 突出核心卖点\n\n原文案：\n[在这里粘贴原文案]', '内容创作'),
  (auth.uid(), '学习计划制定', '请为我制定一个关于[学习主题]的学习计划，包括：\n1. 学习目标和里程碑\n2. 详细的学习路径\n3. 推荐的学习资源\n4. 时间安排建议\n5. 学习效果评估方法', '学习教育');
*/

-- 8. 创建视图（可选）
-- 用于统计用户的提示词数据
CREATE OR REPLACE VIEW user_prompt_stats AS
SELECT 
  user_id,
  COUNT(*) as total_prompts,
  COUNT(DISTINCT category) as total_categories,
  MAX(created_at) as last_created,
  MAX(updated_at) as last_updated
FROM prompts
GROUP BY user_id;

-- 9. 创建函数：获取用户的分类列表
CREATE OR REPLACE FUNCTION get_user_categories()
RETURNS TABLE(category TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.category, COUNT(*) as count
  FROM prompts p
  WHERE p.user_id = auth.uid()
  GROUP BY p.category
  ORDER BY count DESC, p.category ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 创建函数：搜索提示词
CREATE OR REPLACE FUNCTION search_prompts(search_term TEXT)
RETURNS TABLE(
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.content,
    p.category,
    p.created_at,
    p.updated_at,
    ts_rank(
      to_tsvector('simple', p.title || ' ' || p.content),
      plainto_tsquery('simple', search_term)
    ) as rank
  FROM prompts p
  WHERE p.user_id = auth.uid()
    AND (
      to_tsvector('simple', p.title || ' ' || p.content) @@ plainto_tsquery('simple', search_term)
      OR p.title ILIKE '%' || search_term || '%'
      OR p.content ILIKE '%' || search_term || '%'
      OR p.category ILIKE '%' || search_term || '%'
    )
  ORDER BY rank DESC, p.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 完成提示
SELECT 'PromptCraft 数据库初始化完成！' as message;