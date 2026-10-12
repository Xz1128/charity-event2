# A3 完成版：运行说明（中文）

## 1. 项目新增内容（相对 A2）

- **改用 Angular 18 开发两个网站**（A3 额外加分项）：
  - `charity-client/`：公共网站（首页 / 搜索 / 活动详情 / 报名 / 联系我们），路由使用 hash 模式。
  - `charity-admin/`：管理员后台（活动增删改查 + 类别管理）。
- `server.js`：新增报名 API、管理员活动 CRUD API、类别管理 API、场地列表 API；活动详情 API 返回报名记录；并同时托管两个 Angular 构建产物（公共站 `/`、后台 `/admin/`）。
- `database/charityevents_db.sql`：`locations` 表新增 `latitude` / `longitude` 字段（用于天气面板），新增手机号字段及 10 条示例报名记录。
- **天气集成**：活动详情页通过免费的 Open-Meteo API 显示活动举办地未来 7 天天气预报（无需 API Key）。
- `docs/API.md`：A3 API 路由说明。

## 2. 运行前准备

1. 先备份你现有的 `charityevents_db` 数据库。
2. 用 MySQL Workbench 导入 `database/charityevents_db.sql`。注意：此 SQL 文件包含 `DROP DATABASE IF EXISTS charityevents_db`，会删除并重建同名数据库，务必先备份。
3. 在项目根目录复制 `.env.example` 并命名为 `.env`，填入本机 MySQL 的用户名和密码。

## 3. 安装与构建

```bash
# 后端
npm install

# 前端（两个 Angular 应用各自安装依赖并构建）
cd charity-client
npm install
npm run build

cd ../charity-admin
npm install
npm run build

cd ..
```

> Windows 提示：如果 `ng build` 报错 `Cannot find module @rollup/rollup-win32-x64-msvc`，
> 运行 `npm i --no-save @rollup/rollup-win32-x64-msvc@4.22.4`（版本号与
> `node_modules/rollup/package.json` 中的一致），然后重新构建。

## 4. 启动

```bash
npm start
```

在浏览器打开：

- 公共网站：`http://localhost:3000/`
- 管理员网站：`http://localhost:3000/admin/`

## 5. 建议的功能测试顺序

1. 打开活动详情页，确认下方显示报名记录且最新记录排在前面，并显示举办地天气面板。
2. 点击 “Register for this event”，提交姓名、邮箱、电话和票数，确认成功提示。
3. 再次打开活动详情页，确认新报名出现在报名列表最上方。
4. 打开管理员后台（`/admin/`），确认可以看到包括过去和已暂停活动在内的完整活动列表。
5. 新建一个活动，保存后确认出现在列表中；再编辑活动并保存。
6. 尝试删除有报名记录的活动，系统应阻止删除并显示原因。
7. 在 Event categories 区域新增一个类别；尝试删除正在被活动使用的类别，系统应阻止删除。

## 6. 部署提醒

本地开发配置不能直接当作 cPanel 配置。部署时要按 SCU cPanel 提供的数据库名称、数据库用户名、密码和 Node.js 启动方式更新环境变量，并分别在自己的 cPanel 账号下部署。不要把 `.env` 或密码上传到 GitHub。
