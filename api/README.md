# 共享记账服务

旅行页面继续由 GitHub Pages 托管。本目录是独立的 Cloudflare Worker + D1 后端。页面只有设置了 Worker 地址后才切换到共享账本；配置前仍是当前浏览器的本机记账。

## 准备

1. 在自己的 Cloudflare 账户创建 D1 数据库 `inner-mongolia-ledger`。
2. 把 `wrangler.toml.example` 复制成 `wrangler.toml`，填入实际的 `database_id`。不要把个人账户或访问码写入仓库。
3. 在 `api/` 目录执行 `npx wrangler d1 execute inner-mongolia-ledger --remote --file=schema.sql`。
4. 执行 `npx wrangler secret put TRIP_ACCESS_CODE`，输入一个仅与同行人分享的强访问码。不要把访问码写进前端代码或公开聊天。
5. 执行 `npx wrangler deploy`。用实际 Worker 地址测试 `/health` 和带 `Authorization: Bearer <访问码>` 的 `/api/entries`。
6. 把根目录 `index.html` 中 `LEDGER_API_URL` 的空字符串替换为实际 Worker 根地址，例如 `https://inner-mongolia-ledger.<你的子域>.workers.dev`，再推送到 `main`。

访问码对读取、添加和删除都生效；知道访问码的同行人都可以编辑账目。网页上的口令只保存到当前标签页会话存储，关闭标签后需要重新输入。旧的本机记账不会自动上传，以免意外将私人记录分享给同行人。

部署后分别用两台设备验证：A 添加一笔，B 输入同一访问码后能看到；B 删除后，A 刷新能看到更新。出发前也应测试网络中断时的错误提示。
