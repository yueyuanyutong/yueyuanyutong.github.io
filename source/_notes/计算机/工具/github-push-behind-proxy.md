---
title: VPN 明明开着，git push 却不动
date: 2026-10-16 15:47:00
kind: pitfall
tags: [Git, 代理, 排查]
excerpt: 症状是"浏览器打得开 GitHub，命令行却超时"。根因是 git 不读系统代理。记一次完整排查过程。
---

## 症状

- VPN 开着，浏览器能正常打开 GitHub 网页
- 终端里 `git push` 报 `Empty reply from server`，或者干脆连接超时
- 隔一段时间重试，偶尔又能推成功一次

## 第一判断（只说对了一半）

一开始怀疑是"GitHub 被间歇性封锁"。网络确实不稳——但这**不是主因**。真正让 git 完全推不动的原因在本地。

## 关键验证

```
$ git config --global --get http.proxy
（输出为空）
```

空的。也就是说 **git 从来没有走代理**，一直在直连 github.com。

原因：VPN 是**系统代理模式**——往 Windows 的 Internet 设置里写一个代理地址。浏览器会遵循这个设置，但**终端程序不会自动遵循**。

## 定位代理端口

```
$ netstat -ano | grep LISTENING | grep 127.0.0.1
$ curl -x http://127.0.0.1:7892 https://github.com
200
```

把所有监听的本地端口逐个当代理试一遍，只有一个返回 200，那就是代理端口。

## 结论与修法

```
git config --global http.https://github.com/.proxy http://127.0.0.1:7892
```

配好之后 `git push` 与 `hexo deploy` 都能直接用，不用每次导环境变量。

## 还没踩完的坑

1. 代理端口跟着 VPN 客户端走，换版本或改设置都可能变——变了就重新探测一遍。
2. VPN 关掉时，这个配置会让 github.com **完全连不上**，需要临时 unset。
3. 如果命令是在某个沙箱或容器里跑的，里面可能注入了**另一套代理环境变量**，它会干扰排查。先 `env | grep -i proxy` 看一眼再下结论。
