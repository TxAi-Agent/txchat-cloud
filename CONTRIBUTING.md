# 为 TxChat Cloud 贡献代码 / Contributing to TxChat Cloud

[中文](#中文) | [English](#english)

## 中文

感谢你关注 TxChat Cloud。我们接受 Issue 和 Pull Request，但所有修改都必须经过维护者审核，提交并不保证会被合并。

### 开始之前

- 搜索现有 Issue，避免重复报告或重复实现。
- 对较大功能、协议变更、新依赖或安全边界变化，请先创建 Issue 说明目的、范围和替代方案。
- 安全漏洞不要创建公开 Issue，请按照 [安全政策](SECURITY.md) 使用 GitHub Private Vulnerability Reporting。

### 可接受的贡献范围

- 本地开发服务缺陷修复；
- HTTP、WebSocket 和协议验证改进；
- 确定性单元测试和回归测试；
- 会话、日志、数据生命周期和隐私保护改进；
- 面向公开开发者的文档修正。

不接受公网部署、真实模型提供商、真实账号系统、持久数据库、生产基础设施、迁移、发布、回滚或内部运维内容。

### 隐私与公开内容要求

不得在源码、测试、提交信息、Issue、Pull Request、截图或日志中加入：

- Key、Token、账号、密码或登录凭据；
- 手机号、真实身份、录音、听写内容或其他个人数据；
- 真实服务地址、内部域名、内部 IP、路由或服务器信息；
- 私钥、证书、签名、公证或生产配置；
- 本机绝对路径、内部计划、发布、部署或运维资料。

示例必须使用合成数据、`127.0.0.1` 或保留测试域名。请考虑使用 GitHub 隐私邮箱，避免在 Git 提交历史中公开个人邮箱。

### 开发与验证

修改必须保持 Node.js 24、Corepack、pnpm 11.19.0 和 TypeScript 构建兼容，并继续满足回环地址、临时会话、内存数据和确定性提供者边界。

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test
```

行为变化应包含能够稳定复现问题并验证修复的确定性测试。测试不得要求外部服务、真实身份、凭据、部署系统或持久运行时数据。

### 同时修改云端与桌面端

如果修改影响 [TxChat Desktop](https://github.com/TxAi-Agent/txchat-desktop) 的公开本地协议，请在两个仓库分别提交范围清晰的 Pull Request，并互相链接。两个修改必须使用同一协议版本并通过各自测试，且不得引入生产接口或私有配置。

### Pull Request 清单

Pull Request 应说明：

- 修改目的和影响范围；
- 已执行的类型检查、构建与测试及结果；
- 是否增加或变更第三方依赖；
- 是否影响协议、安全或隐私边界；
- 是否仍然只绑定回环地址并使用临时数据。

新增第三方代码或依赖前，必须确认许可证兼容，并更新 [第三方声明](THIRD_PARTY_NOTICES.md)。

### 许可与审核

提交贡献即表示你同意该贡献可以按照 Apache License 2.0 授权。当前不要求 CLA 或 DCO。维护者可以因安全、隐私、项目范围、测试不足或长期维护成本而拒绝修改。

---

## English

Thank you for your interest in TxChat Cloud. Issues and pull requests are welcome for review, but every change requires maintainer approval and submission does not guarantee acceptance.

### Before you start

- Search existing issues to avoid duplicate reports or implementations.
- Open an issue before a large feature, protocol change, new dependency, or security-boundary change. Describe the goal, scope, and alternatives.
- Do not open a public issue for a vulnerability. Follow the [security policy](SECURITY.md) and use GitHub Private Vulnerability Reporting.

### Contribution scope

Appropriate contributions include:

- local development service bug fixes;
- HTTP, WebSocket, and protocol-validation improvements;
- deterministic unit and regression tests;
- session, logging, data-lifetime, and privacy improvements; and
- corrections to public developer documentation.

Internet deployment, real model providers, real account systems, persistent databases, production infrastructure, migrations, releases, rollbacks, and internal operations material are out of scope.

### Privacy and public-content requirements

Do not place any of the following in source, tests, commit messages, issues, pull requests, screenshots, or logs:

- keys, tokens, accounts, passwords, or login credentials;
- phone numbers, real identities, recordings, transcripts, or other personal data;
- real service addresses, internal domains, internal IP addresses, routes, or server information;
- private keys, certificates, signing, notarization, or production configuration; or
- machine-specific absolute paths or internal planning, release, deployment, or operations material.

Examples must use synthetic data, `127.0.0.1`, or reserved test domains. Consider using a GitHub privacy address so that a personal email is not published in Git history.

### Development and verification

Changes must remain compatible with Node.js 24, Corepack, pnpm 11.19.0, and the TypeScript build. They must also preserve the loopback-only, ephemeral-session, in-memory, and deterministic-provider boundaries.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
pnpm test
```

Behavior changes should include deterministic tests that reproduce the problem and verify the correction. Tests must require no external service, real identity, credential, deployment system, or persistent runtime data.

### Changes spanning cloud and desktop

If a change affects the public-local contract in [TxChat Desktop](https://github.com/TxAi-Agent/txchat-desktop), submit focused pull requests to both repositories and link them to each other. Both changes must use the same protocol version and pass their repository tests without introducing production interfaces or private configuration.

### Pull request checklist

A pull request should describe:

- its purpose and affected areas;
- the typecheck, build, and test commands run and their results;
- added or changed third-party dependencies;
- protocol, security, or privacy-boundary effects; and
- confirmation that the service remains loopback-only and uses ephemeral data.

Before adding third-party code or a dependency, verify license compatibility and update the [third-party notices](THIRD_PARTY_NOTICES.md).

### License and review

By submitting a contribution, you agree that it may be licensed under Apache License 2.0. This project currently requires neither a CLA nor a DCO. Maintainers may decline a change because of security, privacy, project scope, insufficient verification, or long-term maintenance cost.
