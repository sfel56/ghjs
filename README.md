# GitHub 加速下载

GitHub 文件多线路加速下载工具。纯静态站点，零构建、零依赖、零后端。

## 功能

- 输入 GitHub 链接，一键生成加速下载地址并自动跳转
- 内置 12 条公共加速线路，进入页面自动检测延迟，按延迟排序
- 支持添加自定义线路，保存在浏览器 localStorage，下次访问直接可用
- 支持 github.com、raw.githubusercontent.com、gist、codeload、gitlab.com 等域名
- 深色主题，自适应手机端与桌面端浏览器

## 本地预览

```bash
python3 -m http.server 8000
```

浏览器访问 `http://localhost:8000` 即可。

## 部署到 Cloudflare Pages

纯静态站点，无需构建步骤，三种方式任选其一。

### 方式一：连接 Git 仓库（推荐）

1. 将本仓库推送到 GitHub 或 GitLab
2. 登录 Cloudflare Dashboard，进入 `Workers & Pages` > `Create` > `Pages` > `Connect to Git`
3. 选择本仓库，构建配置如下：
   - Framework preset: `None`
   - Build command: 留空
   - Build output directory: `/`
4. 点击 `Save and Deploy`，之后每次 push 自动重新部署

### 方式二：直接上传

1. 登录 Cloudflare Dashboard，进入 `Workers & Pages` > `Create` > `Pages` > `Upload assets`
2. 将本项目整个文件夹（含 index.html、css/、js/）拖入上传
3. 点击 `Deploy site`

### 方式三：Wrangler CLI

```bash
npx wrangler pages deploy .
```

首次运行会引导登录并创建项目。

## 目录结构

```
index.html      页面结构
css/style.css   样式（深色主题 + 响应式）
js/app.js       逻辑（测速、链接拼接、自定义线路）
```

## 声明

本站仅做链接拼接，不存储任何文件。所有资源均来自 GitHub 官方源站，请遵守相应开源协议。
