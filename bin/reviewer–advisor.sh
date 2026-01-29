#!/usr/bin/env bash
set -euo pipefail

# Configuration
MODEL="${CODEX_MODEL:-gpt-5-codex}"
SANDBOX="${CODEX_SANDBOX:-read-only}"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

# Output file
TMP_OUT="$(mktemp /tmp/codex_advisor.XXXXXX)"
trap 'rm -f "$TMP_OUT"' EXIT

# Read the user's prompt from stdin
USER_PROMPT="$(cat)"

# Build the full prompt with context
FULL_PROMPT="$(cat <<'SYSTEM_CONTEXT'
# Role: Technical Advisor for Claude Code

You are a senior technical advisor assisting Claude Code (the main AI) with complex implementation decisions in the Userland project. Your role is to:

1. **Provide second opinions** on architectural decisions
2. **Suggest debugging approaches** when Claude Code is stuck
3. **Identify edge cases** that might be missed
4. **Recommend alternative solutions** with tradeoffs
5. **Reference documentation** and best practices

## Response Format

Keep responses concise and actionable:
- Lead with the most important insight
- Use bullet points for multiple suggestions
- Include code snippets only when essential
- Reference specific files/lines when relevant

## Project Context

**Userland** is a browser-based Linux VM using v86 (x86 emulator → WebAssembly) with Alpine Linux.

Key directories:
- `web/` - React frontend with xterm.js terminal
- `v86/` - v86 emulator (Rust → WASM)
- `alpine-guest/` - Alpine Linux image build

Current focus: Adding x86_64 long mode support to v86 while maintaining 32-bit compatibility.

SYSTEM_CONTEXT
)"


# Add v86-x86_64-wasm64 skill summary if working on v86
SKILL_DIR="$PROJECT_ROOT/.claude/skills/v86-x86_64-wasm64"
if [[ -d "$SKILL_DIR" ]]; then
    FULL_PROMPT+="

## v86 x86_64 Enhancement Context

**Milestones:**
- M0-M4: Complete (tooling, CPU state, long mode, paging, IDT)
- M5: Pending (SYSCALL/SYSRET)
- M6: Goal (boot 64-bit guest)

**Key Implementation Patterns:**
- 64-bit registers at WASM offset 1280 (8 bytes each, RAX=0 through R15=15)
- RIP at offset 1408
- Mode check: \`ctx.cpu.is_64()\` and \`ctx.cpu.asize_32()\`
- JIT 64-bit: \`gen_get_reg64()\`/\`gen_set_reg64()\` in codegen.rs

**Test Infrastructure:**
- NASM64 tests: \`node tests/nasm64/run64.js\` (44/44 passing)
- Fixture generation: \`node tests/nasm64/gen_golden.js --force\`
- KVM unit tests: \`cd v86/tests/kvm-unit-tests && ./build-docker.sh\`

**Key Files:**
- CPU state: \`v86/src/rust/cpu/cpu.rs\`
- JIT codegen: \`v86/src/rust/codegen.rs\`, \`v86/src/rust/jit_instructions.rs\`
- ModR/M 64-bit: \`v86/src/rust/modrm.rs\` (\`gen_64()\`)
- WASM builder: \`v86/src/rust/wasmgen/wasm_builder.rs\`

**Reference Docs:**
- Intel 64-bit: \`/Users/drietsch/userland/docs/intel-64bit-architecture.md\`
- WASM 3.0: \`/Users/drietsch/userland/docs/wasm-3.0-specs.md\`
"
fi

# Add the user's actual question
FULL_PROMPT+="

---

# Question from Claude Code

$USER_PROMPT
"

# Run Codex and capture output
echo "$FULL_PROMPT" | npx codex exec \
    --model "$MODEL" \
    --sandbox "$SANDBOX" \
    --output-last-message "$TMP_OUT" \
    - >/dev/null 2>&1

# Output only the response (not the session info)
cat "$TMP_OUT"
