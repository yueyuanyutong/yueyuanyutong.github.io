---
title: Git 走代理与 GitHub 推送速查
date: 2026-10-16 15:46:00
kind: cheatsheet
category: 工具链
tags: [Git, 代理, GitHub]
excerpt: 命令行 git 不读系统代理。要么配 git 自己的 http.proxy，要么导 http_proxy 环境变量。
---

## 核心事实

**git 命令行不读取操作系统的系统代理设置。**

所以"浏览器能打开 GitHub，`git push` 却超时"是完全正常的现象——这两者走的是不同的通道。git 只认两个来源：

1. git 自己的配置：`http.proxy` / `https.proxy`
2. 环境变量：`http_proxy` / `https_proxy` / `all_proxy`

## 常用命令

| 目的 | 命令 |
|---|---|
| 只给 github.com 配代理 | `git config --global http.https://github.com/.proxy http://127.0.0.1:7892` |
| 取消该配置 | `git config --global --unset http.https://github.com/.proxy` |
| 查看现有代理配置 | `git config --global --get-regexp "http\..*proxy"` |
| 仅本次生效 | `git -c http.proxy=... <子命令>` |
| 列出远端分支 | `git ls-remote --heads origin` |
| 查看当前代理环境变量 | `env \| grep -i proxy` |

## 排查顺序

1. `git config --global --get http.proxy`——输出为空，说明 git 在直连
2. 找本地代理端口：`netstat -ano | grep LISTENING | grep 127.0.0.1`
3. 逐个验证端口：`curl -x http://127.0.0.1:端口 https://github.com`，返回 200 的那个就是

## 三个提醒

- 用 `http.https://github.com/.proxy` 而不是全局 `http.proxy`，可以把影响限制在 GitHub 一个域名上，不干扰其他仓库。
- VPN 关闭时这个配置会让 github.com **完全连不上**（不是变慢），需要临时 unset。
- `hexo deploy` 内部是 spawn 一个 git 进程，**没法用 `-c` 传参**，只能靠全局配置或环境变量。
