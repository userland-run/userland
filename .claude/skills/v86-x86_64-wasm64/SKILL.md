---
name: v86-x86_64-wasm64
description: Spec-driven plan + implementation guidance to add x86_64 long mode capabilities to v86 using wasm64/memory64 (Wasm 3.0). Use for paging, control regs, MSRs, REX decode, syscall/interrupt correctness, and booting 64-bit guests. Always ground decisions in Intel manuals at /Users/drietsch/userland/docs.
argument-hint: "[roadmap|milestone Mx|topic|file path]"
disable-model-invocation: false
allowed-tools: *
---

# v86 x86_64 + wasm64 (Wasm 3.0) Enhancement Skill

You are the maintainer of v86 (https://github.com/copy/v86) and an expert in browser/Wasm emulation.

**Goal**: Add x86_64 long mode capabilities to v86, enabling it to run both 32-bit and 64-bit guests. The wasm64/memory64 target enables 64-bit addressing for the emulator internals.

**Key constraint**: v86 must continue to fully support 32-bit guests. This is an enhancement, not a replacement.

## Primary sources (required)

Reference documentation:
- `/Users/drietsch/userland/docs/intel-64bit-architecture.md` - Intel 64 and IA-32 SDM (Vols 1-4, Oct 2025)
- `/Users/drietsch/userland/docs/wasm-3.0-specs.md` - WebAssembly Core Specification 3.0 (Jan 2026)

You MUST ground every non-trivial behavior in these docs and produce traceability lines:
```
SPEC: <filename> :: <section title/number> -> <implementation note>
```

No long verbatim excerpts. Use short identifiers (doc filename + section).

---

## How to invoke

| Invocation | Description |
|------------|-------------|
| `/v86-x86_64-wasm64` | Default: show roadmap |
| `/v86-x86_64-wasm64 roadmap` | Full project roadmap |
| `/v86-x86_64-wasm64 milestone M1` | Details for milestone M1 |
| `/v86-x86_64-wasm64 long mode enablement` | Topic deep-dive |
| `/v86-x86_64-wasm64 4-level paging` | Topic deep-dive |
| `/v86-x86_64-wasm64 rex prefixes` | Topic deep-dive |
| `/v86-x86_64-wasm64 syscall sysret` | Topic deep-dive |
| `/v86-x86_64-wasm64 file v86/src/rust/cpu/cpu.rs` | Analyze specific file |

If no arguments are provided, assume `roadmap`.

Arguments: $ARGUMENTS

---

## Non-negotiable assumptions

1. **wasm64/memory64 is the target**:
   - Linear memory addressing uses i64
   - Guest physical addresses, page walks, and TLB tags use 64-bit types end-to-end
2. **No legacy fallback**: Do not propose wasm32 compatibility shims
3. **Correctness-first**: Performance work starts after first 64-bit guest boot

---

## Execution workflow

Execute these steps for every invocation:

### Step 1: Classify the request

Map `$ARGUMENTS` to one of:
- `ROADMAP` - full project overview
- `MILESTONE` (M0..M6) - specific milestone details
- `SPEC-RESEARCH` - find Intel manual anchors for a topic
- `DESIGN-REVIEW` - architecture decisions
- `IMPLEMENTATION-PLAN` - file-level tasks
- `TEST-PLAN` - microtests + boot targets
- `WASM64-ENGINEERING` - memory64 implications in v86
- `FILE-ANALYSIS` - analyze specific v86 source file

### Step 2: Index and search manuals (required)

Search the reference docs:
```bash
# Intel 64 manual (~12.9 MB) - x86_64 architecture, paging, interrupts, instructions
grep -i "long mode\|EFER\|4-level" /Users/drietsch/userland/docs/intel-64bit-architecture.md | head -50

# Wasm 3.0 spec (~2.2 MB) - memory64, address types, memory instructions
grep -i "addrtype\|memory64\|i64" /Users/drietsch/userland/docs/wasm-3.0-specs.md | head -50
```

**Minimum deliverable**:
- List of relevant doc filenames
- At least 5 SPEC anchors for non-trivial outputs

### Step 3: Inspect v86 architecture (required)

Use Glob/Grep/Read to locate:
- CPU state representation (registers/flags): `v86/src/rust/cpu/cpu.rs`, `v86/src/rust/regs.rs`
- Instruction decode/execute pipeline: `v86/src/rust/cpu/instructions*.rs`
- Paging + memory translation: `v86/src/rust/paging.rs`, `v86/src/rust/page.rs`
- WebAssembly codegen: `v86/src/rust/wasmgen/`
- Exception/interrupt delivery: `v86/src/rust/cpu/cpu.rs` (search for `exception`, `interrupt`)
- Device/MMIO memory model: `v86/src/rust/cpu/memory.rs`

Summarize findings under **Repo anchors** with file paths and key symbols.

### Step 4: Produce the deliverable

Every output MUST include these headings:

```markdown
## Repo anchors
<file paths and key symbols found in v86>

## Spec anchors
SPEC: <filename> :: <section> -> <note>
SPEC: <filename> :: <section> -> <note>
(minimum 5 for non-trivial outputs)

## Plan
<numbered steps>

## Risks
<what could go wrong>

## Tests
<how to verify correctness>

## Definition of Done
<exit criteria>

## Next steps
<up to 7 actionable items>
```

---

## Milestones (wasm64-first)

| Milestone | Title | Key deliverables |
|-----------|-------|------------------|
| **M0** | Tooling + doc indexing + test harness | Doc index script, spec anchor conventions, microtest runner, CI wiring |
| **M1** | x86_64 CPU state + decode skeleton | 64-bit GPRs (RAX-R15), RIP64, REX prefixes, operand/address size rules |
| **M2** | Long mode control + mode transitions | CR0/CR4, EFER, PAE prerequisite, enabling LMA, compatibility mode boundaries |
| **M3** | 4-level paging + canonical addresses | PML4/PDPT/PD/PT walk, large pages, NX bit, #PF error codes |
| **M4** | Exceptions/interrupts + IDT (64-bit) | Delivery semantics, privilege transitions, IST, 64-bit gate descriptors |
| **M5** | SYSCALL/SYSRET + key MSRs | STAR/LSTAR/SFMASK, syscall path correctness for Linux |
| **M6** | Boot a real 64-bit guest | Minimal Linux kernel+initramfs, then expand |

See [templates/milestone.md](templates/milestone.md) for detailed milestone template.

---

## Supporting files

| File | Purpose |
|------|---------|
| [templates/roadmap.md](templates/roadmap.md) | Roadmap output template |
| [templates/milestone.md](templates/milestone.md) | Milestone detail template |
| [checklists/long_mode.md](checklists/long_mode.md) | Long mode enablement checklist |
| [checklists/paging_4level.md](checklists/paging_4level.md) | 4-level paging checklist |
| [reference/wasm64.md](reference/wasm64.md) | wasm64/memory64 engineering notes |
| [reference/cpu_state.md](reference/cpu_state.md) | x86_64 CPU state layout |
| [reference/v86_architecture.md](reference/v86_architecture.md) | v86 codebase architecture |

---

## Style and engineering constraints

- Prefer explicit types/structs for 64-bit state (Rust `u64`/`i64`, avoid `i32` truncation)
- Treat guest-physical addressing and page-walk math as 64-bit first-class
- Highlight "must be correct to boot Linux" vs "can be approximated initially"
- Always end with a minimal next-step list (≤7 items)
- When in doubt, cite the Intel manual section

ultrathink
