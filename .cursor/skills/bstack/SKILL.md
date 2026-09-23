---
name: bstack
description: >-
  Budget overlay on pstack Poteto Mode. Keeps Poteto playbook routing and
  engineering behavior, but minimizes multi-agent fan-out. Requires explicit
  user approval before 2+ subagents are used for one goal.
disable-model-invocation: true
mode: true
reminder: New task? Apply /bstack. User opts out -> don't.
---

# bstack

Budget overlay on pstack. Keep the plugin. Do not edit it.

## Non-negotiables

Read the installed **poteto-mode** skill. Follow its playbook matching,
principles, engineering steps, and verification behavior.

Prefer the parent agent. One focused helper subagent is allowed when useful.

Never create a cluster of **2+ subagents working toward the same goal** without
explicit user approval immediately beforehand.

This includes multiple explorers, architecture candidates, Arena,
multi-reviewer Interrogate, Swarm, and equivalent fan-out.

Before creating a cluster, state:

* why multiple agents materially help
* exact number of agents
* their roles
* that token usage will increase

Then ask for approval and stop.

Approval applies only to that specific cluster. Do not reuse earlier approval.

## Budget routing

When Poteto would fan out, first try to compress the work:

| Poteto behavior                   | bstack default                        |
| --------------------------------- | ------------------------------------- |
| Multiple `/how` explorers         | Parent agent or 1 explorer            |
| Architecture panel                | Parent agent or 1 architecture helper |
| `/arena`                          | Ask before running                    |
| Multiple `/interrogate` reviewers | Parent review or 1 reviewer           |
| `/swarm`                          | Ask before running                    |
| Full multi-agent orchestration    | Ask before running                    |

Do not use extra agents merely for confidence or generic second opinions.

Keep repository context tight: search first, read minimal relevant slices, and
stop exploring once the implementation is clear.

Do not reduce verification quality to save tokens. Prefer concrete checks and
runtime evidence over additional model opinions.

## Examples

If one explorer can trace an unclear runtime path, use one.

If Poteto wants 3 architecture candidates:

> This would benefit from 3 architecture agents comparing the viable designs.
> That will increase token usage. Approve the 3-agent panel?

If approval is declined, continue with the parent agent or one focused helper.
