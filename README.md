# TxChat Cloud

[中文](#中文) | [English](#english)

## 中文

### 项目简介

TxChat Cloud 是一个供贡献者使用的 TypeScript 本地开发服务，与 [TxChat Desktop](https://github.com/TxAi-Agent/txchat-desktop) 的公开源码配合使用。

本仓库提供限定于 IPv4 回环地址的合成实现，用于开发和验证 `txchat.public-local.v1` 公开本地协议。它包含：

- 临时本地会话；
- 会话相关 HTTP 接口；
- WebSocket 听写协议；
- 确定性的合成语音识别和文字整理；
- 最小化的安全事件日志；
- 仅存在于内存中的运行时数据。

### 适用人群

本仓库适合：

- Node.js、TypeScript、Fastify 或 WebSocket 开发者；
- 开发和测试桌面端—云端公开协议的贡献者；
- 编写自动化测试或协议兼容性工具的开发者；
- 审查输入验证、会话、日志和数据生命周期的安全研究人员。

### 不适用范围

本仓库不是 TxChat 生产云端服务的完整副本，不能替代生产环境。它不得暴露到互联网，也不得处理真实用户数据。

仓库不连接真实模型提供商、账号系统、短信或消息服务、持久数据库、托管基础设施或生产配置，也不包含迁移、部署、发布、回滚或运维资料。

### 环境要求

- Node.js 24；
- 通过 Corepack 使用 pnpm 11.19.0。

### 安装与启动

```bash
corepack enable
pnpm install --frozen-lockfile
```

选择一个本机非特权端口，例如 `41873`，然后启动服务：

```bash
TXCHAT_PUBLIC_LOCAL_PORT=41873 pnpm dev
```

服务始终绑定到 `127.0.0.1`，并且只使用上述公开本地端口进行配置。名称匹配 Host、Base URL 或 Endpoint 类别的非空 `TXCHAT_*` 字段会触发拒绝；名称匹配凭据类别的 `TXCHAT_*` 字段即使为空也会触发拒绝。其他未识别字段不会用于配置本服务。

### 验证

```bash
pnpm typecheck
pnpm build
pnpm test
```

### 与 TxChat Desktop 配合使用

1. 克隆本仓库和 [TxChat Desktop](https://github.com/TxAi-Agent/txchat-desktop)。
2. 在本仓库安装依赖并启动本地服务：

   ```bash
   corepack enable
   pnpm install --frozen-lockfile
   TXCHAT_PUBLIC_LOCAL_PORT=41873 pnpm dev
   ```

3. 在桌面端仓库生成 Xcode 项目：

   ```bash
   xcodegen generate --spec apps/macos/project.yml
   ```

4. 在 Xcode 的桌面端 Debug Run 配置中设置：

   ```text
   TXCHAT_PUBLIC_LOCAL_DEVELOPMENT=1
   TXCHAT_PUBLIC_LOCAL_PORT=41873
   ```

5. 构建并运行桌面端。两个仓库必须使用同一个端口。
6. 只使用非敏感测试内容验证链路。

桌面端会自行构造 `127.0.0.1` 地址。对于本云端服务，只有上述公开本地端口会用于配置；名称匹配 Host、Base URL、Endpoint 或凭据类别的 `TXCHAT_*` 字段按前述规则触发拒绝，其他未识别字段不会用于配置。桌面端的配置规则以桌面端仓库实现为准；桌面端 Release 构建不会启用该连接。

本服务只返回确定性的合成听写和文字整理结果，不调用真实模型。它用于验证公开协议、状态流和错误处理，而不是评估真实识别质量或模拟生产容量。

### 参与贡献与安全报告

- 参与开发前请阅读 [贡献指南](CONTRIBUTING.md)。
- 安全问题请按照 [安全政策](SECURITY.md) 私下报告，不要公开漏洞细节。

### 许可证

TxChat 自有源码采用 [Apache License 2.0 官方英文许可证](LICENSE)。[中文说明](LICENSE.zh-CN.md) 仅用于辅助理解，如有歧义，以英文许可证为准。

第三方依赖适用各自的许可证，详见 [第三方声明](THIRD_PARTY_NOTICES.md)。

---

## English

### Overview

TxChat Cloud is a TypeScript local development service for contributors working with the public source in [TxChat Desktop](https://github.com/TxAi-Agent/txchat-desktop).

The repository provides a synthetic implementation restricted to the IPv4 loopback interface for developing and validating the `txchat.public-local.v1` public-local contract. It includes:

- ephemeral local sessions;
- session-related HTTP routes;
- a WebSocket dictation protocol;
- deterministic synthetic recognition and text organization;
- minimized security event logging; and
- runtime data held only in memory.

### Intended audience

This repository is intended for:

- Node.js, TypeScript, Fastify, and WebSocket developers;
- contributors developing and testing the public desktop-to-cloud contract;
- developers writing automated tests or protocol compatibility tools; and
- security researchers reviewing input validation, sessions, logging, and data lifetime.

### What this repository is not

This repository is not a complete copy of the TxChat production cloud service and cannot replace the production environment. It must not be exposed to the Internet or used to process real user data.

It does not connect to real model providers, account systems, SMS or messaging services, persistent databases, hosted infrastructure, or production configuration. It contains no migration, deployment, release, rollback, or operations material.

### Requirements

- Node.js 24; and
- pnpm 11.19.0 through Corepack.

### Install and run

```bash
corepack enable
pnpm install --frozen-lockfile
```

Choose an unprivileged local port, for example `41873`, and start the service:

```bash
TXCHAT_PUBLIC_LOCAL_PORT=41873 pnpm dev
```

The service always binds to `127.0.0.1` and uses only the documented public-local port for configuration. A nonempty `TXCHAT_*` field whose name matches the Host, Base URL, or Endpoint category causes rejection; a `TXCHAT_*` field whose name matches a credential category causes rejection even when empty. Other unrecognized fields are not used to configure the service.

### Verification

```bash
pnpm typecheck
pnpm build
pnpm test
```

### Using TxChat Cloud with TxChat Desktop

1. Clone this repository and [TxChat Desktop](https://github.com/TxAi-Agent/txchat-desktop).
2. Install dependencies and start the local service in this repository:

   ```bash
   corepack enable
   pnpm install --frozen-lockfile
   TXCHAT_PUBLIC_LOCAL_PORT=41873 pnpm dev
   ```

3. Generate the Xcode project in the desktop repository:

   ```bash
   xcodegen generate --spec apps/macos/project.yml
   ```

4. Set these variables in the desktop Xcode Debug Run configuration:

   ```text
   TXCHAT_PUBLIC_LOCAL_DEVELOPMENT=1
   TXCHAT_PUBLIC_LOCAL_PORT=41873
   ```

5. Build and run the desktop client. Both repositories must use the same port.
6. Use only non-sensitive test content.

The desktop constructs its `127.0.0.1` origins internally. For this cloud service, only the documented public-local port is used for configuration; `TXCHAT_*` fields whose names match the Host, Base URL, Endpoint, or credential categories cause rejection under the rules above, while other unrecognized fields are not used for configuration. Desktop configuration rules are defined by the desktop repository. Desktop Release builds do not enable this connector.

This service returns deterministic synthetic dictation and organization results and calls no real model. It validates the public contract, state flow, and error handling; it does not measure real recognition quality or simulate production capacity.

### Contributing and security reports

- Read the [contribution guide](CONTRIBUTING.md) before proposing a change.
- Report security issues privately under the [security policy](SECURITY.md). Do not disclose vulnerability details publicly.

### License

TxChat-owned source is licensed under the [official English Apache License 2.0](LICENSE). The [Chinese guide](LICENSE.zh-CN.md) is provided only as a reading aid. If the documents differ, the English license controls.

Third-party dependencies remain under their respective licenses. See the [third-party notices](THIRD_PARTY_NOTICES.md).
