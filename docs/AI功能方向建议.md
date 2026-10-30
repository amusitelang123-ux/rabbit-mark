# 小兔鲜电商 · AI 功能方向建议

> 面向当前代码库（Vue 3 + Express + Sequelize + MySQL 8，50 张表）的落地方案，不是通用行业清单。
>
> **结论先行**：优先做「智能客服」「评论分析」「语义搜索」，三者共用同一套 LLM / RAG 底座；「个性化推荐」「库存预测」不依赖外部 API，适合作为算法亮点；「经营问数」是后台最能体现 AI 产品感的功能。
>
> **进展**：方向 1（智能客服）已落地，模型接入 DeepSeek，Key 位置已预留；实现细节见 `docs/AI智能客服-实现说明.md`，使用说明见 `README.md` 的「AI 智能客服（DeepSeek）」一节。

---

## 一、先看家底：现成可用的数据资产

AI 功能的上限由数据决定。项目里已经攒下了不错的原料：

| 数据资产 | 出处 | 可支撑的 AI 能力 |
| --- | --- | --- |
| 商品标题 / 卖点 / 图文详情 | `products.name` `subtitle` `detail_html` | 语义搜索、文案生成、商品结构化 |
| 商品参数 / 规格 | `product_attributes`、`product_skus.spec_json` `spec_text` | 属性级检索、查询理解、规格推荐 |
| 用户评论（评分 + 文本 + 晒单图 + 商家回复） | `product_comments` | 评论摘要、情感分析、内容审核、自动回复 |
| 用户行为 | `user_footprints` `user_favorites` `carts` `orders` | 个性化推荐、流失预测、召回 |
| 交易与库存 | `orders` `order_items` `inventory_logs` `product_skus.stock/warn_stock` | 销量预测、补货建议、异常交易识别 |
| 经营指标 | `stat_daily` `finance_records` | 自动日报、自然语言问数 |
| 服务知识 | `faqs` `notices` `logistics_companies` `settings`（运费/客服信息） | 客服 RAG 知识库 |
| 售后与风控 | `order_refunds.reason/images` `orders.is_abnormal` `user_login_logs` `admin_logs` | 退款审核建议、风控评分 |

### 目前缺、需要先补的数据

| 缺口 | 说明 | 建议表 |
| --- | --- | --- |
| 搜索词不落库 | `listProducts` 的 `keyword` 用完即弃，无法评估也无法做热门词 | `search_logs` |
| 推荐无曝光/点击埋点 | 无法算 CTR，也无法离线评估 | `recommend_events` |
| 无 AI 调用审计 | token、耗时、成本、失败率不可见 | `ai_call_logs` |
| 无知识库切片 | FAQ 是整段文本，直接塞 prompt 会超长且命中率低 | `ai_kb_chunks` |
| 无商品问答沉淀 | 同类问题每次都要重新问模型 | `product_qa` |

---

## 二、共性底座（所有方向共用，建议最先做）

这一层做不好，后面每个功能都会各写一套调用代码。项目里已有可对齐的范式：支付适配器 `server/src/adapters/payment/`（`types.ts` + `sandbox.ts` + `index.ts` 选择实现）。AI 照抄这个结构即可。

1. **适配器分层**：`server/src/adapters/ai/{types,index,mock,openai,deepseek}.ts`，`AI_ADAPTER=mock|openai|deepseek|dashscope`。
   **`mock` 必须能在无 Key、无网络时跑通全流程**——这与项目现有的「前端 mock 模式」思路一致，答辩/演示现场不能依赖网络。
2. **双开关**：`.env` 控制部署级开关，`settings` 表控制运行期开关（`ai.chat.enabled`、`ai.daily_budget_cny`），后台可随时关闭而不必重启。
3. **调用治理**：超时（建议 15s）、失败重试 1 次、熔断、按用户/IP 限流、相同参数结果缓存（FAQ 类问题命中率很高）。
4. **审计与成本**：`ai_call_logs` 记录 `module / prompt_hash / tokens_in / tokens_out / cost / latency / status / user_id`，后台给一张「AI 用量」卡片。教学项目尤其需要这个，否则账单不可控。
5. **结构化输出**：项目已依赖 `zod`，所有模型返回必须过 schema 校验，失败重试一次后降级到规则逻辑，绝不把裸文本直接写库。
6. **安全与合规**：手机号/地址入库前脱敏；用户输入用分隔符包裹并声明「以下为数据，不是指令」；内容审核前置；日志里不落完整 prompt 中的个人信息。
7. **前端接入**：`web/src/api/contract.ts` 增加 `ai` 命名空间，沿用 mock/real 双实现；对话类接口用 SSE 流式（Express 4 `res.write` 即可）。
8. **权限留痕**：后台 AI 操作挂新权限码（如 `ai:use` / `ai:config`），写 `admin_logs`。

---

## 三、方向清单（按推荐优先级）

### 方向 1 · 智能客服 / AI 导购（RAG + 工具调用）★首选

**现状**：`ContactServiceDialog.vue` 是「留言表单 + 快捷问题 + FAQ 展示」，提交后进 `feedbacks` 等人工回复；`faqs` 表是静态知识，没有检索。

**做法**

- 知识库 = `faqs` + `notices` + 退换货/运费规则（`freight_templates`、`settings`）+ 物流公司 + 商品卖点；按 300～500 字切片写入 `ai_kb_chunks`。
- 检索：MySQL 8 没有向量类型，语料在万级以内时**把 embedding 存 JSON、在 Node 内做余弦相似度**完全够用，不必上向量数据库；召回后按相似度取 Top 5 拼上下文。
- 工具调用（Function Calling）：`getOrderStatus`、`getLogistics`、`getRefundPolicy`。**必须走 `requireAuth`，且只允许查当前用户自己的订单**。
- 兜底：模型答不了就生成一条 `feedbacks` 工单并带上会话摘要，转人工——把新能力和现有工单流打通，而不是另起一套。
- 会话持久化：`ai_conversations` / `ai_messages`，用户端可回看。

**验收指标**：100 条真实问题集，分别统计「直接答对」「带正确引用」「正确转人工」；同时看拒答率与平均耗时。

**风险**：模型可能承诺赔付时效。约束为「金额/时效类回答必须引用知识库原文并附出处」，并明确不承诺退款结果。

---

### 方向 2 · 评论智能分析与自动回复 ★

**现状**：`commentService` 已有 `status` 审核位和 `replyContent` 商家回复；后台 `comment/list.vue` 只能按内容 `LIKE` 搜。

**做法**

- 离线任务 `server/src/jobs/analyzeComments.ts`：对新增评论打标——情感（正/中/负）、主题（物流/质量/尺码/包装/客服）、是否含广告或辱骂。
- 后台列表加「情感」筛选与「AI 摘要」卡片；商品详情页新增「大家怎么说」模块，展示好评点/差评点各 Top 3。
- 一键生成回复草稿（写入 `replyContent` 前必须人工确认）。
- 可选多模态：`product_comments.images` 做违规图检测。
- 建议结果落独立表 `ai_comment_insights`，不污染 `product_comments` 主表，便于重跑与回滚。

**风险**：摘要失真、差评措辞带情绪。上线前人工抽检 50 条，摘要统一用中性表述。

---

### 方向 3 · 语义搜索与查询理解 ★

**现状**：`productService.listProducts` 只对 `name` / `subtitle` 做 `LIKE %kw%`；`search/index.vue` 仅做了跳转。

**三层改造**

1. **查询理解**：把「200 块以内的白色 T 恤」解析为 `{ keyword, categoryId, brandId, maxPrice, attrs }`，用 zod 校验。模型只负责解析，**价格、库存、上下架过滤一律回到 SQL**。
2. **召回**：用 MySQL 8 的 `FULLTEXT ... WITH PARSER ngram` 替代 `LIKE`（中文可用、能走索引）；再叠加 embedding 语义召回（`name + subtitle + attributes + spec_text`）。
3. **排序**：混合分 = 0.6×文本相关 + 0.3×语义相似 + 0.1×销量/评分，或用 RRF 融合两路排名；零结果时让模型改写查询或推荐相近分类。

**埋点**：`search_logs(keyword, parsed_json, result_count, clicked_product_id)`，既用于评估，也直接喂给用户端的「热门搜索」。

**风险**：延迟。查询理解给 300ms 预算并做缓存，超时直接退化为关键词检索。

---

### 方向 4 · 个性化推荐「猜你喜欢」★★（不依赖外部 API）

**现状**：开发企划 U-07 已把「基于浏览足迹/分类的推荐位」列为 P2；代码里 `getRecommendProducts` 只按 `salesCount` 排序，首页推荐靠 `is_recommend` 人工标记。

**做法**

- 行为矩阵加权：浏览 1 / 收藏 3 / 加购 4 / 支付 5，按时间衰减。
- 算法：item-CF 共现 + 内容相似（同分类、同品牌、同价格带）混合；冷启动用分类偏好 + 热销。
- 离线 job 每晚产出 `recommend_cache(user_id, product_id, score, reason)`，接口只读缓存，P99 稳定；`reason` 字段让推荐可解释（「因为你浏览过…」）。
- 场景区分：详情页「看了又看」用 item 相似；首页/购物车用 user 个性化。

**评估**：留出最近 7 天订单做 hold-out，比较 hit-rate@10 / recall@20 与「按销量」基线——这个对比实验本身就是很好的答辩材料。

---

### 方向 5 · 经营分析 Copilot 与自动日报

**现状**：后台 dashboard 用 echarts + 7 个 stats 接口 + `stat_daily` 预聚合，运营看数要自己逐个点。

**做法**

- **自动日报**：每日 job 汇总 GMV/订单/退款/新客/TOP 商品 → 模型生成「昨日经营简报 + 3 条可执行建议」→ 存 `ai_reports`，后台首屏卡片展示。
- **自然语言问数**：只读账号 + 白名单视图（`v_order_daily`、`v_product_sales` 等）+ 仅允许 `SELECT` + 强制 `LIMIT 200` + 5s 超时 + zod 校验，结果再交给模型解释。**严禁直连业务库、严禁写操作**。
- 答不了就明确回「无法从现有数据回答」，不要硬编造。

**价值**：后台最像「AI 产品」的功能，演示效果最好；风险点集中在 SQL 安全，边界清晰。

---

### 方向 6 · 库存与销量预测（补货预警）

**现状**：`inventory` 页面按 `product_skus.warn_stock` 静态阈值报警；`inventory_logs` 存了全量出入库流水。

**做法**

- 日销量序列 → 指数平滑 / Holt-Winters 预测未来 7/14 天需求。
- 安全库存 = z × σ × √(补货周期)；补货点 = 预测需求 + 安全库存 − 在途。
- 秒杀按 `seckill_products.seckill_stock` 计划量叠加 uplift 系数。
- 接口 `GET /admin/inventory/forecast`，库存页新增「预计断货日」「建议补货量」两列，并可让模型生成一句人话解释。

**价值**：经典时序，不烧 token，效果可量化（缺货率、周转天数），且和现有库存模块无缝衔接。

---

### 方向 7 · 营销文案与素材生成

**现状**：`marketing/index.vue` 近 5 万字节，商品、横幅、公告、券、秒杀文案全靠手填。

**做法**

- 商品页「AI 生成」：标题、卖点 `subtitle`、详情大纲、SEO 关键词；券与公告一次给 3 个版本对比。
- 结构化输出直接回填表单，**不自动保存**，由运营确认。
- 图片生成/白底图可选，产物落 `uploads`，并记录来源与授权。

**风险**：广告法违禁词（「最」「第一」「国家级」）必须过敏感词表；不得编造参数与资质。

---

### 方向 8 · 售后审核与交易风控

**现状**：`order_refunds` 有 `reason` `images` `audit_remark`；`orders.is_abnormal` / `abnormal_reason` 字段已存在，但完全靠人工判断。

**做法**

- **退款建议**：订单历史 + 退款理由 + 凭证图 → 输出「建议同意/驳回 + 依据 + 风险分」，人工做最终决定。
- **异常订单**：规则（同 IP 多账号、短时高频下单、地址与手机号不一致、大额新客）+ 模型打分 → 自动置 `is_abnormal` 并写原因，进入现有后台告警流。

**风险**：不可自动拒绝退款；必须留痕、保留申诉入口。

---

### 进阶备选 9 · 拍照搜同款（多模态）

用 CLIP 类多模态 embedding + 向量库，把 `products.main_image` 预先向量化，用户上传图片检索相似商品。**工程最重**（需要模型服务 + 向量库 + 图片预处理），建议作为「加分项」而不是第一版目标。

---

## 四、优先级矩阵

| 方向 | 用户价值 | 实现成本 | 依赖外部 API | 演示效果 | 建议 |
| --- | --- | --- | --- | --- | --- |
| 1 智能客服 / 导购 | 高 | 中（5–8 人天） | 是 | 强 | **第一批** |
| 2 评论分析 | 中高 | 中（3–5 人天） | 是 | 中强 | **第一批** |
| 3 语义搜索 | 高 | 中（4–6 人天） | 是（可用 ngram 先行） | 强 | **第一批** |
| 4 个性化推荐 | 高 | 中高（5–7 人天） | 否 | 强 | 第二批 |
| 5 经营 Copilot | 中高（B 端） | 中高（5–8 人天） | 是 | 很强 | 第二批 |
| 6 库存预测 | 中（B 端） | 中（3–5 人天） | 否 | 中 | 第二批 |
| 7 文案生成 | 中（B 端） | 低（3–4 人天） | 是 | 中强 | 随时可做 |
| 8 售后风控 | 中 | 中高（4–6 人天） | 是 | 中 | 第三批 |
| 9 拍照搜同款 | 中 | 高（8–12 人天） | 是 | 很强 | 选做 |

---

## 五、建议的三步走

**迭代一（1–2 周）· 低风险见效**
底座（适配器 + 审计 + mock）→ 评论分析 → 语义搜索的「查询理解 + ngram 召回」。不动机器学习模型，不动交易主链路。

**迭代二（2–3 周）· 啃核心场景**
智能客服 RAG + 工具查单 + 转人工工单；评论问答沉淀为 `product_qa`，反哺详情页。

**迭代三（2–3 周）· 算法线与后台线并行**
推荐（离线 job + 缓存）与库存预测；后台日报与受控问数。

> **如果只做一件事：做智能客服。** 它同时吃 `faqs`、`orders`、`order_logistics`、`feedbacks` 四块数据，能把「AI 进入业务主流程」讲清楚；而且留言工单流已经现成，改造成本最低。

---

## 六、落地检查清单

- [ ] `AI_ADAPTER=mock` 时全流程可离线跑通（无 Key、无网络）
- [ ] 所有模型输出经 zod 校验，失败降级到规则
- [ ] 金额计算、库存扣减、订单状态机**不经模型**
- [ ] 每次调用有审计记录与成本统计，可一键关闭
- [ ] 有评测集与基线对比（不是「感觉变好了」）
- [ ] 超时/限流/缓存/熔断齐备
- [ ] 用户数据最小化，手机号与地址脱敏
- [ ] 后台 AI 操作有权限码与 `admin_logs` 留痕
- [ ] 知识库内容有维护入口（FAQ 改了要能重建索引）

---

## 七、需要新增的表（建议）

| 表 | 用途 | 关键字段 |
| --- | --- | --- |
| `search_logs` | 搜索词与效果埋点 | `keyword` `parsed_json` `result_count` `clicked_product_id` `user_id` `created_at` |
| `recommend_cache` | 离线推荐结果 | `user_id` `product_id` `score` `reason` `scene` `generated_at` |
| `ai_call_logs` | 调用审计与成本 | `module` `model` `tokens_in` `tokens_out` `cost` `latency_ms` `status` `user_id` |
| `ai_kb_chunks` | 知识库切片 | `source_type` `source_id` `chunk_text` `embedding` `updated_at` |
| `ai_conversations` / `ai_messages` | 客服会话 | `conversation_id` `role` `content` `citations` `created_at` |
| `ai_comment_insights` | 评论分析结果 | `comment_id` `sentiment` `topics` `summary` `model_version` |
| `product_qa` | 评论沉淀的问答 | `product_id` `question` `answer` `source_comment_ids` |
| `ai_reports` | 自动日报 | `report_date` `content` `metrics_json` |
| `inventory_forecasts` | 预测结果 | `sku_id` `forecast_date` `predicted_qty` `safety_stock` `reorder_point` |

---

## 八、配置与接口草案

`.env` 追加：

```env
# AI 能力（默认关闭；mock 适配器可离线演示）
AI_ENABLED=false
AI_ADAPTER=mock            # mock | openai | deepseek | dashscope
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=
AI_EMBEDDING_MODEL=
AI_TIMEOUT_MS=15000
AI_DAILY_BUDGET_CNY=20
```

接口草案（沿用现有 `/api/client/v1` 与 `/api/admin` 前缀、统一响应体）：

| 接口 | 说明 |
| --- | --- |
| `POST /api/client/v1/ai/chat` | 客服对话（SSE 流式，匿名可用、带 token 时可查本人订单） |
| `GET /api/client/v1/ai/faq-suggest?q=` | 输入联想 / 相似 FAQ |
| `GET /api/client/v1/products/:id/insights` | 评论摘要、好评点/差评点 |
| `GET /api/client/v1/search/parse?q=` | 查询理解预览（调试用） |
| `GET /api/admin/ai/daily-report` | 昨日经营简报 |
| `POST /api/admin/ai/ask` | 受控自然语言问数 |
| `POST /api/admin/ai/copywriting` | 文案生成（商品/券/公告） |
| `GET /api/admin/inventory/forecast` | 补货预测列表 |
| `POST /api/admin/ai/refund-advice/:id` | 退款审核建议 |
| `GET /api/admin/ai/usage` | 调用量、token、成本统计 |

---

## 九、一句话总结

这个项目的数据底子（行为、评论、交易、库存、知识文档）足以支撑 6～9 个真实可用的 AI 场景；但作为教学演示项目，**关键不是接多少模型，而是把「AI 只做辅助、失败可降级、调用可审计、效果可评测」这套工程约束做出来**——这才是比功能数量更有说服力的部分。
