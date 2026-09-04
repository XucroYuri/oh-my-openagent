# 开发目标：fallback 链自动启用（Auto-enable fallback hooks）

> 状态：⏳ 待实测验证（fork 内开发，暂不向上游提 PR）
> 代码分支：`feat/auto-enable-fallback`（commit `ef6cc0a06`，已推 fork）
> 创建：2026-07-23

## 背景 / 问题

oh-my-openagent 的两个降级 hook（`model_fallback`、`runtime_fallback`）**默认关闭**。
用户即使在配置里写了 `fallback_models` 链，运行时也不会自动降级——
主力模型一旦遇到 **额度不足 / 欠费 / 余额耗尽 / 429 限频 / 503 过载**，
错误会直接抛给用户，不会切到链里的下一个模型。

降级能力本身已在上游代码中实现且正确
（`runtime-fallback-error-classifier.ts` 已识别 `quota_exceeded` / 欠费 / 余额不足 / payment required 等），
问题仅在于**默认开关是关的**——这是个易踩的坑。

## 方案（智能 auto-enable）

当任意 agent 或 category 配了非空 `fallback_models` 时，自动开启两个 hook；
显式 `false` 仍然生效（opt-out 而非 opt-in）。

优先级：
1. 用户显式 `model_fallback` / `runtime_fallback = true|false` → 听用户的
2. 未设置但存在 `fallback_models` → 自动开启
3. 都没有 → 保持关闭（向后兼容）

## 改动文件（在 `feat/auto-enable-fallback` 分支）

- `packages/omo-opencode/src/shared/fallback-models-presence.ts`（新增 helper）
- `packages/omo-opencode/src/shared/fallback-models-presence.test.ts`（19 个单测）
- `packages/omo-opencode/src/plugin/hooks/create-session-hooks.ts`（接线 ×2）
- `packages/omo-opencode/src/plugin/chat-message.ts`（接线）
- `packages/omo-opencode/src/plugin/event.ts`（接线）

## 验证标准（实测前不算完成）

> 仓库根 `AGENTS.md` 要求：触及 opencode/codex 的改动必须真机 QA 并留证据。
> 本提交尚缺真机证据，等实测补齐后再考虑上游 PR。

- [x] 单元测试通过（`bun test`，19/19）
- [x] 类型检查通过（`tsgo --noEmit -p packages/omo-opencode`）
- [ ] 真机：主力 provider 余额耗尽时，TUI 弹出 `model fallback` 提示
- [ ] 真机：会话不中断，自动续用降级链下一个模型
- [ ] 真机：冷却后回试主力（`restore_primary_after_cooldown`）
- [ ] 真机：显式 `model_fallback: false` 时降级不触发（opt-out 验证）

**实测方式**：在用户 live 配置中临时把 OpenRouter（低余额）设为主力，
持续使用直到触发"余额不足"，观察降级行为。任务跟踪见本地 `AGENTS.local.md`。

## 实测通过后的行动

1. 恢复 live 配置（用备份）。
2. 在本文件勾选验证项，状态改为 ✅。
3. 决定是否向 `code-yeongyu/oh-my-openagent` 提 PR（PR 描述用英文，附真机证据）。

## Fork 沟通规范

本 fork 的协作沟通默认使用**维护者母语（中文）**输出，技术术语可保留英文。
后续如向上游提 PR，PR 描述改用英文以匹配上游社区语言。
