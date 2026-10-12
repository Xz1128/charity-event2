# Harbour Hope — 演示视频讲解稿（≤15 分钟 · 精简版）

**PROG2002 Web Development II · Assessment 3**
> 使用说明：`口播：` 后引号内英文 = 念出来的话；`操作：` = 中文动作指令。总时长控制在 11–13 分钟，留缓冲。

---

## 开场（约 40 秒）

**操作：** 镜头对准浏览器首页顶部。

**口播：**
> "Hi, my name is **[名字]** and my student number is **[学号]**. This is my Assessment 3 submission for PROG2002 — a full-stack charity events platform called Harbour Hope.
>
> It has three tiers: a MySQL database, a Node.js and Express REST API, and two Angular websites — a public site and a staff admin site. I'll cover the three questions from the brief: the database and API architecture, the data flow, and a live demo of the site."

---

## 第一部分：数据库与 API 架构（约 4 分钟）

### 1.1 数据库 schema

**操作：** 打开 `database/charityevents_db.sql`，滚到 `CREATE TABLE registrations`。

**口播：**
> "My schema has five tables. The new one for Assessment 3 is `registrations`, which records who registered for which event. It has a primary key, an `event_id` foreign key, the user's name, email and phone, the ticket count, and a timestamp.
>
> The important line is this `UNIQUE (event_id, email)` — so one user can only register for the same event once, and the database itself enforces it, not just my code.
>
> I also added `latitude` and `longitude` to the `locations` table, which I'll come back to when I show the weather feature."

**操作：** 快速指一下 `event_db.js`。

> "The connection layer is a `mysql2` pool. Every query uses prepared statements with `?` placeholders, so SQL injection is impossible, and credentials come from `.env` which is not in Git."

### 1.2 RESTful API 逻辑

**操作：** 打开 `server.js`，停在 `EVENT_SELECT`（第 94 行）和 `toPublicEvent`（第 145 行）。

**口播：**
> "On the API side, I have one shared SQL projection — `EVENT_SELECT` — that joins events to categories, locations and organisations, and derives the status. Every read endpoint reuses it, so they all return the same shape. Then `toPublicEvent` converts snake_case columns to camelCase JSON and computes `isFree` and `progressPercent` on the server, so those rules live in exactly one place.
>
> For Assessment 3 I added the write path: `POST` to register, and full create, update and delete for events. Deletion runs inside a transaction that locks the row and refuses to delete an event that already has registrations, returning `409`."

### 1.3 测试一个关键 API

**操作：** 切到浏览器，地址栏输入并演示。

| 输入 | 口播要点 |
|---|---|
| `http://localhost:3000/api/events/search?location=Southport&categoryId=1` | "This is the search endpoint. It filters by any combination of date, location and category. Notice the JSON — every event has its category and location joined in, so the frontend needs only one request." |
| `http://localhost:3000/api/events/11` | "The suspended event returns 404 — the same as 'does not exist', so nobody can probe what's been taken down." |

---

## 第二部分：数据流（约 3 分钟）

**操作：** 打开 `charity-client/src/app/services/api.service.ts`，然后打开 `home.component.ts`。

**口播：**
> "Now the data flow. The frontend is built with Angular, so each app has one service — the DataService pattern. `ApiService` has one method per endpoint, each returning an Observable. A shared error handler turns a failed request into an Error carrying the server's own message.
>
> The Home component subscribes to `getEvents()`. While the request is in flight it shows a spinner, and when the array arrives, Angular's change detection renders the cards. The template uses `@for` and `@if` instead of hand-built HTML, and Angular escapes text by default — so XSS protection is structural."

**操作：** 切到浏览器，打开 DevTools Network 面板，按 F5 刷新首页。

**口播：**
> "In the Network tab you can see the flow end to end: the browser requests `/api/events`, the server queries MySQL and returns JSON, and that JSON becomes the cards on screen. The browser never talks to MySQL directly, and the API never returns HTML — one direction, one format."

---

## 第三部分：网站功能演示（约 4 分钟）

### 3.1 首页

**操作：** 首页滚动。

> "The home page loads the organisation profile and the upcoming events. Each card shows the category, an Upcoming pill, a countdown, a Free pill where the ticket price is zero, and a progress bar."

### 3.2 搜索页（重点：过滤 + 校验）

**操作：** 点导航 Search，依次演示。

| 步骤 | 填什么 | 预期 | 口播要点 |
|---|---|---|---|
| 1 | 全空，点 Search | 错误横幅 | "Validation first — at least one filter, enforced both in the component and on the server." |
| 2 | Category = Fun Run | 含 Past 的结果 | "A single filter. Search retrieves history; only the home page hides past events." |
| 3 | Location = `Southport` + Fun Run + 一个日期 | 1 条 | "All three filters combine with AND — narrowing by when, where and what kind." |
| 4 | Location = `Tasmania` | 0 条，空横幅 | "A valid search matching nothing returns 200 with an empty array, not an error." |

### 3.3 活动详情页

**操作：** 点一张活动卡片进详情页，向下滚动。

> "The detail page shows the full description, the goal-versus-progress, and the list of registrations sorted newest first — the new feature for this assessment. It also shows the weather panel, which comes from the free Open-Meteo API using the venue's coordinates from the database.
>
> Finally, the Register button now links to the new registration page, where a form collects name, email, phone and tickets, validates them, and posts to the API to store the booking."

---

## 收尾（约 40 秒）

**操作：** 回首页顶部。

**口播：**
> "To summarise: a MySQL database with a normalised `registrations` table enforcing one-booking-per-event; a fifteen-route Express API with full CRUD, prepared statements and transactional delete protection; two Angular websites sharing one API; and an optional weather panel via Open-Meteo.
>
> Thank you for marking my work."

---

## 录制速查清单

- [ ] 数据库 SQL 的 `registrations` 表 + `UNIQUE` 约束
- [ ] `server.js` 的 `EVENT_SELECT` / `toPublicEvent` / 删除事务
- [ ] 浏览器实测 `search` 和 `events/11` 两个接口
- [ ] 前端 `api.service.ts` + `home.component.ts` 数据流
- [ ] Network 面板看 `/api/events` 请求
- [ ] 搜索页 4 步（校验 + 过滤 + AND 组合 + 空结果）
- [ ] 详情页（报名列表 + 天气面板 + Register 链接）

> 全程不要让 `.env` 入镜；视频务必短于 15 分钟。
