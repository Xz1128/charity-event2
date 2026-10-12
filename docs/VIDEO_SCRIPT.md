# Harbour Hope — 演示视频脚本（上限 15 分钟）

**PROG2002 Web Development II · Assessment 3**
MySQL `charityevents_db` → Node.js / Express REST API → 两个 Angular 18 网站（公共站 + 管理后台）

---

## 怎么用

- **`口播：` 下面引号里的英文 = 念出来的话。**
- **`操作：` = 中文动作指令**，告诉你点哪里、开哪个文件。
- 念完约 **13 分**，留 2 分钟缓冲。
- 赶时间就跳过标 **[可跳过]** 的段落。

> ### ⚠️ 录制前必读：数字会变
>
> 首页的「即将到来活动」数量会随日期变化（过去的活动会被首页过滤掉）。录制前先打开
> `http://localhost:3000/api/events` 数一下当前返回几条，然后**用实际数字替换脚本里的示例**。
> 搜索页、管理后台的演示数字相对稳定。

---

## 录制前准备

| # | 要准备好 | 为什么 |
| --- | --- | --- |
| 1 | MySQL 已启动，`charityevents_db` 已导入 | 否则 `npm start` 退出码 1 |
| 2 | `.env` 里 `DB_PASSWORD` 已填 | 留空会打印警告 |
| 3 | 两个 Angular 应用已 `npm run build` | 否则 `/` 和 `/admin/` 打不开 |
| 4 | 提前跑起服务，终端能看到 `Connected to MySQL database charityevents_db` 和 `... running at http://localhost:3000` | 这两行要在镜头里指一下 |
| 5 | 浏览器打开 **http://localhost:3000**，缩放 **110%** | 卡片和代码都看得清 |
| 6 | 两个标签页：**A = 公共站**，**B = 管理后台 http://localhost:3000/admin/** | 演示两个网站 |
| 7 | VS Code 打开项目，字号 **16pt** | 代码要能看清 |
| 8 | **全程不能让 `.env` 入镜** | 密码不能录进去 |
| 9 | GitHub 仓库页开着，确认 **private** | 对应「有规律的提交」评分点 |

**录制参数：** 1080p、30fps、系统声音**开**、麦克风开。先试录 20 秒验音量。

---

## 0:00 – 0:40 — 开场（40 秒）

**操作：** A 页首页顶部。

**口播：**

> "Hi, my name is **[你的名字]**, student number **[你的学号]**. This is my Assessment 3 submission
> for PROG2002 Web Development II — a full-stack charity events platform for a fictional Gold Coast
> not-for-profit called the Harbour Hope Foundation.
>
> It is a three-tier application. At the bottom is a MySQL database called `charityevents_db`.
> Above that, a Node.js and Express server exposing a complete REST API — not just reads, but
> create, update and delete. And on top, **two Angular 18 websites**: a public site for visitors,
> and a staff admin dashboard under `/admin/`.
>
> My video covers the three questions from the brief: the database and API architecture, the data
> flow, and a live walkthrough of both websites — including registration and the admin tools.
> Let's start with the backend."

**操作：** 切到 GitHub 标签页，鼠标停在提交列表 2 秒，再切到 VS Code。

> **[可跳过]** "The repository is private with the marker invited as a collaborator, and you can see
> regular commits with descriptive messages."

---

## 0:40 – 4:10 — 第一部分：数据库与 API 架构（ULO3）

### 数据库表结构

**操作：** VS Code 打开 `database/charityevents_db.sql`，滚到顶部。

> "My schema has five tables. `events` is the main one. Around it are three lookup tables:
> `organisations`, `categories`, and `locations` — which now also stores `latitude` and `longitude`
> for each venue, which I'll come back to when I show the weather feature.
>
> These are lookup tables on purpose — that is third normal form. 'Southport' is stored once in
> `locations`; `events` only stores the foreign key."

**操作：** 滚到 `CREATE TABLE events`，鼠标停在约束区。

> "`events` is where I put the domain rules, because a rule enforced in the database cannot be broken
> by an application bug. Three foreign keys with `ON DELETE RESTRICT`, CHECK constraints on price and
> goal, money as `DECIMAL`, and indexes on the columns my queries filter on.
>
> The `is_suspended` column is a soft delete — suspending an event sets a flag instead of deleting
> the row, so history is kept and it can be reinstated."

**操作：** 滚到 `CREATE TABLE registrations`，鼠标停在 `UNIQUE`。

> "The fifth table is `registrations`, and it is now in use. The key line is this `UNIQUE
> (event_id, email)` — the database itself rejects a double booking under the same email. I don't
> rely on application code alone to prevent duplicates; the engine enforces it."

### 连接层

**操作：** 打开 `event_db.js`。

> "The connection layer is one file: a `mysql2` pool. Credentials come from `.env` via `dotenv`, and
> `.env` is in `.gitignore`. Because everything goes through `pool.query`, every query uses prepared
> statements — that is what makes SQL injection impossible here."

### 十五个端点与共享投影

**操作：** 打开 `server.js`，停在顶部注释块。

> "`server.js` now exposes fifteen routes across all four HTTP methods. On the read side,
> `GET /api/organisation`, `categories`, `locations`, `events`, `events/search`, and `events/:id`.
> On the write side, `POST` to register for an event, and full `POST`/`PUT`/`DELETE` for events and
> categories, plus `GET /api/admin/events` for the staff list."

**操作：** 滚到 `EVENT_SELECT` 常量，选中高亮。

> "This is the shared projection I'm most pleased with. One SQL string joins events to categories,
> locations and organisations, and derives `status` with a CASE expression. Every read endpoint
> builds on it, so they return an identical shape. There is exactly one place to change."

**操作：** 滚到 `toPublicEvent()`。

> "Every row passes through `toPublicEvent`, which converts `snake_case` to `camelCase` and derives
> `status`, `isFree` and `progressPercent` on the server. The client never recomputes business
> rules — they exist in one place."

### 写路径：报名 + 删除保护

**操作：** 滚到 `app.post("/api/events/:id/registrations", ...)`。

> "This is the registration write. It validates the name, email, phone and ticket count, checks the
> event exists, is not suspended, and has not already happened — then inserts. A duplicate email
> returns `409`, because the database unique key catches it."

**操作：** 滚到 `app.delete("/api/events/:id", ...)`。

> "Deletion is the most dangerous operation, so it runs inside a transaction. It locks the event row
> with `FOR UPDATE`, counts its registrations, and if any exist it rolls back and returns `409` —
> 'suspend it instead'. This is a business rule enforced by the server, not by hoping staff remember."

**操作：** 滚到安全响应头中间件。 **[可跳过]**

> "I set security headers by hand. `nosniff`, `X-Frame-Options: DENY`, and a Content-Security-Policy
> that allows only same-origin scripts and styles — plus `connect-src` to the Open-Meteo weather API.
> No `unsafe-inline`."

### 接口实况测试

**操作：** 切到 B 页地址栏依次输入。

| 输入 | 口播要点 |
|---|---|
| `http://localhost:3000/api/events` | "Only upcoming, active events. The suspended and past events are simply not in this array." |
| `http://localhost:3000/api/events/11` | "The suspended event returns **404** — same as 'does not exist', so nobody can probe what's been taken down." |
| `http://localhost:3000/api/events/search?location=Southport` | "Location search matched across four columns, including past events." |
| `http://localhost:3000/api/events/search` | "**400** — at least one filter required." |
| `http://localhost:3000/api/admin/events` | "The admin list includes past and suspended records, with `isSuspended` flags." |

**操作：** 切回 VS Code。

> "That is part one. Now let me show you how the two Angular apps talk to those endpoints."

---

## 4:10 – 6:40 — 第二部分：Angular 数据流（ULO1 / ULO3）

### 两个 Angular 应用 + DataService

**操作：** 打开 `charity-client/src/app/services/api.service.ts`。

> "Part two is the data flow. The front end is two Angular apps — `charity-client` and
> `charity-admin` — sharing one API. Each has a single service following the DataService pattern from
> the course: every endpoint is one method returning an `Observable`.
>
> The important part is the shared error handler. A failed request becomes an `Error` whose message
> is the server's own `error` field, so a component can display `err.message` directly. The server
> writes human-readable messages, and the client shows them verbatim."

**操作：** 打开 `charity-client/src/app/models/event.ts`。

> "These interfaces mirror the API's JSON shape one-to-one — `Event`, `Category`, `Location`,
> `Registration`. Because they're typed, a field-name mistake becomes a compile error rather than a
> runtime bug."

**操作：** 打开 `charity-client/src/app/components/home/home.component.ts`。

> "The Home component subscribes to `getEvents()`. While the request is in flight it shows a spinner
> with `role="status"`, so a slow connection never looks broken. When the array arrives, Angular's
> change detection renders the cards."

**操作：** 打开 `home.component.html`，指出 `@for`。

> "The template uses Angular's `@for` and `@if` control flow instead of hand-built HTML strings. And
> because Angular escapes interpolated text by default, database content can't inject markup — the
> XSS protection is structural now, not something I had to remember in every template."

### 天气集成

**操作：** 打开 `charity-client/src/app/services/weather.service.ts`。

> "A nice addition for Assessment 3 is the weather panel. Each venue stores latitude and longitude,
> and this service calls the free Open-Meteo API — no key required — to get a seven-day forecast.
> The event detail page shows current conditions and a daily forecast for the venue's suburb."

**操作：** 切到浏览器，打开 DevTools 的 Network 面板，刷新一个详情页。

> "In the Network tab you can see the JSON requests — `/api/events/1`, then the Open-Meteo call.
> The browser never talks to MySQL, and the API never returns HTML. One direction, one format."

**操作：** 关掉 DevTools。

---

## 6:40 – 8:40 — 第三部分：公共站走查 + 报名（ULO3）

**操作：** A 页首页顶部，鼠标划过导航，点 **Contact** 再回 **Home**。

> "The public site has five Angular routes — Home, Search, Event detail, Register, and Contact —
> with the same sticky header. These details come from `GET /api/organisation`, the same endpoint the
> home page uses, so one database row updates both pages."

**操作：** 回首页，滚到卡片区，点一张活动卡片进详情页。

> "Clicking a card loads the detail page with the id in the route. It fetches `/api/events/:id`,
> fills the description, price, goal-versus-progress, recent registrations — and here's that weather
> panel showing the forecast at the venue."

**操作：** 滚动到天气面板，指一下。

> "Seven days of temperature and rain probability for the exact suburb where the event is held. It
> comes live from Open-Meteo using the venue's coordinates from the database."

**操作：** 点 **Register for this event**，进入报名页。

> "Now the write path. The register page loads the selected event, then a reactive form collects
> name, email, phone, and ticket count — all validated client-side with Angular's Validators, and
> re-validated on the server."

**操作：** 填姓名、邮箱、电话，票数填 2，点 **Complete registration**。

> "On submit it `POST`s to `/api/events/:id/registrations`. The server returns `201`, and I get a
> confirmation banner. Let me register the same email again…"

**操作：** 再提交一次同一个邮箱。

> "…and I get the conflict message from the server — that email has already registered. That's the
> `UNIQUE` key and the `409` contract working end to end."

---

## 8:40 – 10:30 — 第四部分：搜索功能（过滤与校验）

**操作：** 点导航 **Search events**。

> "The search page — where filtering and validation live. The category dropdown is built from
> `/api/categories`, so it can never offer a category that doesn't exist."

**操作：** 按顺序做下面 6 步，**每步前先点 Clear filters**。

| # | 填什么 | 预期 | 口播要点 |
|---|---|---|---|
| 1 | 全部留空，点 Search | 错误横幅 | "Validation first — at least one filter, enforced both in the component and on the server." |
| 2 | Category = Fun Run | 含 Past 的结果 | "A single filter, including a past event — search retrieves history, only the home page hides it." |
| 3 | Location = `Southport` | 结果 | "The server matches against four columns, so a partial word works." |
| 4 | Location = `HOTA` | 结果 | "Here it matches a *venue* name rather than a suburb." |
| 5 | `Southport` + Fun Run + `2026-10-12` | 1 条 | "All three filters combine with AND — narrowing by when, where and what kind." |
| 6 | Location = `Tasmania` | 0 条，空横幅 | "A valid search matching nothing is `200` with an empty array, not an error." |

---

## 10:30 – 13:00 — 第五部分：管理后台（ULO3）

**操作：** 切到 B 页（`http://localhost:3000/admin/`）。

> "Finally, the admin site — a second Angular app. This is where the create, update and delete
> operations live. The left panel lists every event including past and suspended, and the right
> panel is the editor."

**操作：** 点 **+ New event**，填几个字段，点 **Save event**。

> "Creating an event posts to `/api/events`, and the new event appears in the list. The form validates
> every field, and the category and venue dropdowns are populated from the API."

**操作：** 点一个已有活动的 **Edit**，改一个字段，点 **Save changes**。

> "Editing posts a `PUT` to `/api/events/:id`, and — notice — the registrations for that event show
> up inline in the editor, loaded from `/api/events/:id/registrations`."

**操作：** 点一个有报名的活动的 **Delete**。

> "If I try to delete an event that has registrations, the server refuses with `409` and tells me to
> suspend it instead. That is the transactional delete protection I showed in the code."

**操作：** 滚到 **Event categories** 区域，新增一个类别；再尝试删除一个正在被活动使用的类别。

> "Category management works the same way. I can add and edit categories, but deleting one that's
> still used by events is blocked. The business rules hold everywhere, not just in one happy path."

---

## 13:00 – 13:40 — 收尾（40 秒）

**操作：** 回 A 页首页顶部，停止滚动。

> "That completes the three sections. To summarise: a MySQL database with five normalised tables and
> domain rules enforced by foreign keys, CHECK constraints, unique keys and indexes; a fifteen-route
> Express API — full CRUD, with every user value passed as a bound parameter and a transactional
> delete guard; and **two Angular 18 websites** sharing one API, following the DataService pattern,
> with a live weather panel powered by Open-Meteo.
>
> On the brief: the back end uses only four dependencies — express, mysql2, dotenv and cors — and
> the front end is built entirely in Angular, which is the additional-marks requirement for
> Assessment 3.
>
> Thank you for marking my work."

**操作：** 停止录制，剪掉头尾。**成片务必短于 15 分钟。**

---

## 现场测试清单（撕下来放键盘旁）

### 第一部分 — 浏览器地址栏

```
http://localhost:3000/api/events                                # 仅 upcoming
http://localhost:3000/api/events/11                             # 404 已下架
http://localhost:3000/api/events/search?location=Southport      # 匹配结果
http://localhost:3000/api/events/search                         # 400 无条件
http://localhost:3000/api/admin/events                          # 含 past + suspended
```

### 第三部分 — 报名

```
详情页 → 滚到天气面板 → 点 Register → 填表提交(201)
       → 同一邮箱再提交一次(409 重复报名)
```

### 第四部分 — 搜索页

| # | 填什么 | 预期 |
|---|---|---|
| 1 | 空 | 错误横幅 |
| 2 | Category = Fun Run | 含 Past |
| 3 | Location = `Southport` | 结果 |
| 4 | Location = `HOTA` | 结果（按场地） |
| 5 | `Southport` + Fun Run + `2026-10-12` | 1 条 |
| 6 | Location = `Tasmania` | 0 条（空横幅） |

### 第五部分 — 管理后台

```
/admin/ → New event 创建 → Edit 编辑（看 inline 报名）→ Delete（有报名被 409 阻止）
       → 新增类别 → 删除被使用的类别（被阻止）
```

---

## 出问题怎么办

| 情况 | 处理 |
| --- | --- |
| 页面出现错误横幅 | 顺势说 "This is the error handling working"，看一眼终端，重启服务继续录。**主动解释错误路径是加分的。** |
| 服务起不来 | 终端会打印三行排查提示。说 "The connection is tested before the server listens, so a misconfigured environment fails loudly." 然后改 `.env` 重启。 |
| 首页活动数不对 | 先说实际数字，别照着脚本念旧数字；数字随日期变化是正常现象。 |
| `/admin/` 打不开 | 先 `cd charity-admin && npm run build` 再重启服务。 |
| 天气面板空白 | 该场地没有坐标或没联网。跳过天气段落，不影响主体。 |
| 录太长 | 跳过 **[可跳过]** 段落；合并搜索 4（HOTA）和 6（Tasmania）。 |
| 录太短 | 补 Network 面板演示、终端 `curl`、窄窗口响应式演示。 |

---

## 录完检查

- [ ] 视频短于 15 分钟（看实际文件时长）
- [ ] 全程无密码、密钥、私人通知入镜
- [ ] 已上传 SCU OneDrive，分享链接用无痕窗口测过
- [ ] 链接随作业提交
- [ ] GitHub 仓库 **private**，marker 已加为 collaborator
- [ ] 最新提交已推送（`git status` 干净）
