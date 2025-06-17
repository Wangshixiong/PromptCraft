项目需求文档：Prompt 管理插件（云同步版）

日期： 2025年6月15日

1. 概述与目标
为了满足用户在多个设备间访问和管理提示词的需求，我们将引入一个可选的云同步功能。通过集成 Supabase 作为后端服务以及 GitHub 和 Google OAuth 作为认证方式，用户将能使用其 GitHub 或 Google 账户登录，并在多个设备之间安全、无缝地同步他们的提示词数据。

核心原则
本地优先 (Local-First)： 未登录状态下，应用将完全保持其现有的本地化特性，所有数据仅存储在本地，所有功能均可正常使用。
登录即同步 (Login is Sync)： 云同步功能默认开启于所有登录用户。登录是用户选择使用云服务的唯一操作。
无缝体验： 登录后的同步过程应自动在后台进行，最大程度减少用户干预。
数据清晰： 必须明确告知用户数据将存储在云端，并提供相应的隐私说明。
2. 用户故事
用户故事1 (登录)： 作为一名用户，我希望能用我的 GitHub 或 Google 账号一键登录，之后我的数据就能自动在不同设备上保持一致。
用户故事2 (同步)： 作为一名用户，我希望我的提示词能够自动同步到云端，这样我就可以在家里的电脑和公司的电脑上访问和编辑同一份数据。
用户故事3 (安全)： 作为一名用户，我希望我的云端数据是安全的，只有我自己才能访问。
用户故事4 (隐私/离线)： 作为一名注重隐私的用户，我希望可以选择不登录，继续像以前一样在完全离线的本地模式下使用所有功能。
用户故事5 (注销)： 作为一名用户，我希望能够随时注销我的账号，确保我的数据隐私得到保护。

3. 核心基础与本地优先原则 (Phase 1: Foundation)
目标： 确保应用在引入任何云功能前，拥有一个稳定、健壮、可扩展的本地核心。

FR-Local-First: 本地功能完整性
描述： 在用户未登录的状态下，插件必须提供完整的提示词管理功能（创建、读取、更新、删除）。所有操作都应在本地完成，不应有任何网络请求或功能限制。
实现： 所有数据持久化必须使用 chrome.storage.local。
FR-4: 数据标识符核心规范 (UUID as Primary Key)
描述： 新建提示词时，为确保每条提示词记录在跨设备和云端同步时都具有唯一的、无冲突的标识符，所有记录的 id 必须是 UUID (Universally Unique Identifier) 格式。
实现：
本地创建： 当用户在本地（无论登录与否）创建一个新的提示词时，系统必须立即为其生成一个标准的 UUID 作为其 id。
默认数据： 插件内置的任何默认提示词，其 id 也必须是预先生成的、固定的 UUID。

4. 用户认证 (Phase 2: Authentication)
目标：构建完整的用户认证系统，让用户可以通过第三方服务登录和登出。

核心技术要求

认证服务商: Supabase
核心库: 必须使用最新稳定版的 @supabase/supabase-js 官方 JavaScript 库（可在本地文件中引用），并配置 chrome.storage 适配器以实现会话持久化。

FR-1: 第三方 OAuth 登录 (GitHub & Google)
使用 OAuth 2.0 协议来做授权和认证。
描述： 界面右上角新增用户图标，在界面右上角的用户图标处提供登录入口。点击后，直接向用户展示 GitHub 和 Google 登录选项。用户选择平台并成功验证后，返回应用并自动登录。
注意： 此阶段仅处理登录状态的切换，暂不触发数据合并。
FR-2: 用户登出

描述： 用户可以随时点击“登出”按钮。登出后，应用恢复到纯本地模式，不再与云端进行任何通信，直到用户下次登录。本地数据应保留。
FR-3: 基本用户状态管理

描述： 应用需要通过右上角的用户图标清晰地管理和展示用户的登录状态和账号来源。
实现：
未登录： 显示通用的人物图标 👤。
GitHub 登录: 显示github账号头像。
Google 登录: 显示google的头像。
鼠标悬浮 (Hover) 在已登录的图标上时，显示用户的注册邮箱地址。

5. 数据同步 (Phase 3: Synchronization)
目标： 在用户登录后，实现本地数据与云端数据的自动、双向、无缝同步。

Supabase 连接信息与数据模型

Project URL： https://uwgxhtrbixsdabjvuuaj.supabase.co
anon public： eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Z3hodHJiaXhzZGFianZ1dWFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NzQ0NzUsImV4cCI6MjA2NTA1MDQ3NX0.6R4t3Bxy6g-ajI1Fym-RWmZgIvlAGLxy6uV1wbTULN0
FR-5: 数据模型 (Data Model)
后端的 prompts 表结构如下，需在 Supabase 中提前创建并开启行级安全（RLS）。
SQL

CREATE TABLE public.prompts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NULL DEFAULT '未分类',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(), -- 用于冲突解决
  is_deleted boolean NOT NULL DEFAULT false, -- 用于同步删除操作

  CONSTRAINT prompts_pkey PRIMARY KEY (id),
  CONSTRAINT prompts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
-- 推荐实践: 创建一个触发器，在记录更新时自动刷新 updated_at 字段。
同步核心逻辑

FR-10: 数据合并逻辑 (首次同步)

描述： 当用户在存在本地数据的状态下首次登录时，系统必须在后台自动执行一次数据合并。
流程： 1) 拉取云端所有数据。 2) 遍历本地数据，与云端比较。 3) 遍历云端数据，检查本地是否存在。 4) 根据 updated_at 时间戳执行冲突解决策略。
用户体验： 此过程无需用户手动确认。可在合并完成后，通过一个非阻塞式通知（如右上角短暂提示）告知用户：“您的本地数据已成功同步至云端”。
FR-6: 自动同步机制

描述： 当用户登录后，对提示词的增、删（软删除）、改操作应自动触发与 Supabase 的双向同步。每次启动扩展或用户登录成功时，也应执行一次双向同步检查。
FR-7: 冲突解决 (Conflict Resolution)

策略： 采用“最后更新者获胜 (Last Write Wins)”策略。
实现： 同步时，比较本地记录和云端记录的 updated_at 时间戳，以时间戳较新的版本为准。
FR-8: 离线操作处理

描述： 如果用户在网络断开的情况下进行了操作，这些更改应被保存在本地队列中。当网络恢复时，应用应自动尝试进行同步。
6. 交互设计与用户反馈 (Phase 4: UI/UX Polish)
目标： 为所有状态（包括同步和错误）提供清晰、直观的用户反馈。

FR-11: 图标布局与交互

描述： 界面右上角固定布局为 [用户图标] + [管理图标]。点击用户图标后的交互行为需根据登录状态变化（如 Phase 2 中所述）。
FR-12: 同步状态反馈

描述： 登录成功后，用户图标的右上角应出现一个微小的状态点，用以反馈同步状态。
状态：
🔵 同步中： 表示数据正在与云端交换。
🟢 同步完成： 亮起表示最近同步成功，随后可熄灭或保持绿色。
⚪ 同步关闭： 用户登出后或未登录时。
FR-9 & FR-13: 异常处理与反馈

描述： 当发生错误时，应用不能丢失用户的本地修改，并需提供友好提示。
实现：
登录失败： 如果第三方平台登录失败，应用应保持在本地模式，可提供简短的失败提示，不影响用户继续使用本地功能。
网络中断： 当网络连接中断时，用户图标应变为表示断开的状态（例如：🌐加断链符号），并暂停所有同步尝试，直到网络恢复。
同步失败： 若后台同步失败，状态点可变为红色 (🔴)，并可提供一个可点击的区域以查看简要错误信息或重试。