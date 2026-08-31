# TxChat Cloud 安全政策 / Security Policy

[中文](#中文) | [English](#english)

## 中文

### 支持范围

本政策只覆盖 `txchat-cloud` 公开仓库最新 `main` 分支中的源码。它不代表对 TxChat 生产服务、托管环境、非公开系统或第三方服务提供安全支持。

与本公开源码相关的重点领域包括：

- HTTP 和 WebSocket 请求验证；
- 临时会话和令牌处理；
- IPv4 回环地址绑定；
- 内存数据生命周期；
- 日志最小化与脱敏；
- 公开本地协议和状态转换。

### 私下报告漏洞

请使用本仓库的 [GitHub Private Vulnerability Reporting](https://github.com/TxAi-Agent/txchat-cloud/security/advisories/new)。不要在公开 Issue、Discussion 或 Pull Request 中披露漏洞。

报告应包含：

- 受影响的仓库、提交和代码区域；
- 问题描述、攻击前提和潜在影响；
- 最小、可重复且已经脱敏的复现步骤；
- 已执行的验证；
- 可行的修复建议（如有）。

报告不得包含真实 Key、Token、账号、密码、用户数据、录音、听写内容、服务地址、内部网络信息、本机绝对路径、私钥、证书、签名、公证或生产配置。

### 研究边界

请仅在研究人员拥有或明确控制的本地环境中进行安全测试。本政策不授权访问、扫描、攻击、干扰或测试任何真实 TxChat 服务、用户账号、用户设备或第三方系统。

本仓库是限定于回环地址的合成本地开发服务，不具备公网部署或处理真实用户数据所需的生产安全能力。将其暴露到互联网或接入真实数据不属于受支持用法。

如果问题只能在非公开生产系统中复现，请不要把生产地址、账号、日志或其他敏感证据上传到 GitHub。本仓库的安全政策不提供生产事件报告渠道。

请在维护者完成评估和必要修复前避免公开披露。当前没有漏洞赏金计划，也不承诺固定的确认、回复或修复时间。

---

## English

### Supported scope

This policy covers only source in the latest `main` branch of the public `txchat-cloud` repository. It does not provide security support for TxChat production services, hosted environments, non-public systems, or third-party services.

Relevant public-source areas include:

- HTTP and WebSocket request validation;
- ephemeral session and token handling;
- IPv4 loopback binding;
- in-memory data lifetime;
- logging minimization and redaction; and
- the public-local protocol and state transitions.

### Report a vulnerability privately

Use this repository's [GitHub Private Vulnerability Reporting](https://github.com/TxAi-Agent/txchat-cloud/security/advisories/new). Do not disclose a vulnerability in a public issue, discussion, or pull request.

A report should include:

- the affected repository, commit, and code area;
- a description, attack prerequisites, and potential impact;
- a minimal, reproducible, and sanitized reproduction;
- verification already performed; and
- a possible repair, if available.

Do not include real keys, tokens, accounts, passwords, user data, recordings, transcripts, service addresses, internal network information, machine-specific absolute paths, private keys, certificates, signing, notarization, or production configuration.

### Research boundaries

Security testing must be conducted only in a local environment owned or explicitly controlled by the researcher. This policy does not authorize accessing, scanning, attacking, disrupting, or testing any real TxChat service, user account, user device, or third-party system.

This repository is a synthetic local development service restricted to loopback. It does not have the production security controls required for Internet deployment or real-user-data processing. Exposing it to the Internet or connecting real data is unsupported.

If an issue can be reproduced only against a non-public production system, do not upload production addresses, accounts, logs, or other sensitive evidence to GitHub. This repository policy does not provide a production incident-reporting channel.

Avoid public disclosure until the maintainers have assessed the report and completed any necessary repair. There is currently no bug bounty program and no guaranteed acknowledgement, response, or repair time.
