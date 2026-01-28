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

## Current Implementation Status

**Alpine Linux x86_64 kernel (6.12.65-0-virt)**: Boots with JIT disabled for 64-bit

| Component | Status | Notes |
|-----------|--------|-------|
| Memory64 infrastructure | ✅ Done | `wasm_builder.rs`: `use_memory64` flag, `load_fixed_*_mem64()` functions |
| 64-bit register access | ✅ Done | `codegen.rs`: `gen_get_reg64()`, `gen_set_reg64()`, `gen_*_reg64_low32/16()` |
| 64-bit ModR/M addressing | ✅ Done | `modrm.rs`: `gen_64()` for i64 address arithmetic |
| JIT skip workaround | ✅ Removed | `jit.rs` and `cpu.rs`: JIT now attempts compilation for 64-bit |
| 64-bit JIT instructions | 🔄 Pending | `jit_instructions.rs`: Need push64/pop64/call64/ret64 wiring |
| IDT 64-bit gates | ✅ Working | 64-bit exception handling verified with NASM64 tests |
| NASM64 test suite | ✅ 44/44 pass | Long mode, REX, arithmetic, exceptions all verified |

**Current workaround**: JIT falls back to interpreter when 64-bit codegen is incomplete.

## Primary sources (required)

Reference documentation:
- `/Users/drietsch/userland/docs/intel-64bit-architecture.md` - Intel 64 and IA-32 SDM (Vols 1-4, Oct 2025)
- `/Users/drietsch/userland/docs/wasm-3.0-specs.md` - WebAssembly Core Specification 3.0 (Jan 2026)
- `/Users/drietsch/userland/docs/wasm/memory64.md` - WASM Memory64 proposal spec (detailed)
- `/Users/drietsch/userland/docs/wasm/threads.md` - WASM Threads proposal (SharedArrayBuffer)
- `/Users/drietsch/userland/docs/wasm/` - Directory containing all WASM 3.0 proposal specs

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
| `/v86-x86_64-wasm64 memory64` | WASM memory64 implementation details |
| `/v86-x86_64-wasm64 jit codegen` | JIT code generation for 64-bit |
| `/v86-x86_64-wasm64 idt 64-bit` | 64-bit IDT gate descriptors |
| `/v86-x86_64-wasm64 file v86/src/rust/cpu/cpu.rs` | Analyze specific file |
| `/v86-x86_64-wasm64 debugging` | Testing and debugging infrastructure |
| `/v86-x86_64-wasm64 test plan` | How to test 64-bit changes |

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
- `TEST-HARNESS` - 64-bit test infrastructure usage
- `DEBUGGING` - debugging workflow and differential testing
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

| Milestone | Title | Status | Key deliverables |
|-----------|-------|--------|------------------|
| **M0** | Tooling + doc indexing + test harness | ✅ Done | Doc index script, spec anchor conventions, microtest runner, CI wiring |
| **M1** | x86_64 CPU state + decode skeleton | ✅ Done | 64-bit GPRs (RAX-R15), RIP64, REX prefixes, operand/address size rules |
| **M2** | Long mode control + mode transitions | ✅ Done | CR0/CR4, EFER, PAE prerequisite, enabling LMA, compatibility mode boundaries |
| **M3** | 4-level paging + canonical addresses | ✅ Done | PML4/PDPT/PD/PT walk, large pages, NX bit, #PF error codes |
| **M4** | Exceptions/interrupts + IDT (64-bit) | ✅ Done | Delivery semantics, privilege transitions, IST, 64-bit gate descriptors |
| **M5** | SYSCALL/SYSRET + key MSRs | ⏳ Pending | STAR/LSTAR/SFMASK, syscall path correctness for Linux |
| **M6** | Boot a real 64-bit guest | 🎯 Goal | Minimal Linux kernel+initramfs, then expand |

**Note**: M0-M3 were completed in interpreter mode. M4 is blocked on 64-bit IDT initialization for early boot.

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
| [v86/tests/nasm64/README.md](../../../v86/tests/nasm64/README.md) | 64-bit test infrastructure |
| [v86/tests/differential/README.md](../../../v86/tests/differential/README.md) | Differential testing harness |
| [v86/tests/kvm-unit-tests/Dockerfile](../../../v86/tests/kvm-unit-tests/Dockerfile) | Docker image for KVM test builds |
| [v86/tests/kvm-unit-tests/build-docker.sh](../../../v86/tests/kvm-unit-tests/build-docker.sh) | Build script for KVM tests via Docker |

---

## Key Implementation Patterns

### Memory64 Binary Encoding

```rust
// In wasm_builder.rs::write_memory_import()
if self.use_memory64 {
    // WASM memory64: flag 0x04 = i64 limits, no max
    // SPEC: memory64.md :: Binary format -> limits 0x04 n:u64
    self.output.push(0x04);
    write_leb_u64(&mut self.output, min_pages);
} else {
    self.output.push(0x00);
    write_leb_u32(&mut self.output, min_pages);
}
```

### 64-bit Register Access Pattern

```rust
// codegen.rs - Use these in 64-bit mode
pub fn gen_get_reg64(ctx: &mut JitContext, r: u32) {
    ctx.builder.load_fixed_i64(global_pointers::get_reg64_offset(r));
}

pub fn gen_set_reg64(ctx: &mut JitContext, r: u32) {
    // Pop i64 from wasm stack, store to register
    let value = ctx.builder.set_new_local_i64();
    ctx.builder.const_i32(global_pointers::get_reg64_offset(r) as i32);
    ctx.builder.get_local_i64(&value);
    ctx.builder.store_aligned_i64(0);
    ctx.builder.free_local_i64(value);
}
```

### Mode Detection in JIT

```rust
// cpu_context.rs - Check 64-bit mode
pub fn is_64(&self) -> bool { self.state_flags.is_64() }

// Address size in 64-bit mode defaults to 64, 67h makes it 32
pub fn asize_32(&self) -> bool {
    if self.state_flags.is_64() {
        // 67h prefix -> 32-bit addressing in long mode
        self.prefixes & PREFIX_MASK_ADDRSIZE != 0
    } else {
        // Legacy: is_32 XOR 67h
        self.state_flags.is_32() != (self.prefixes & PREFIX_MASK_ADDRSIZE != 0)
    }
}
```

### ModR/M 64-bit Dispatch

```rust
// modrm.rs - Route to 64-bit handler when appropriate
pub fn gen(ctx: &mut JitContext, modrm_byte: ModrmByte, esp_offset: i32) {
    if ctx.cpu.is_64() && !ctx.cpu.asize_32() {
        gen_64(ctx, modrm_byte, esp_offset as i64);
        return;
    }
    // ... existing 32-bit logic
}
```

---

## Debugging and Testing Infrastructure

**Critical principle**: Don't debug Linux first — use CPU test suites. The 64-bit test infrastructure allows isolating issues before attempting full kernel boots.

### Test Directories

| Directory | Purpose |
|-----------|---------|
| `v86/tests/nasm64/` | 64-bit NASM unit tests for long mode |
| `v86/tests/differential/` | v86 vs QEMU differential testing harness |
| `v86/tests/nasm/` | Existing 32-bit tests (reference pattern) |
| `v86/tests/kvm-unit-tests/` | KVM unit tests (x86_64, requires Linux GCC to build) |

### Testing Workflow (Recommended Order)

1. **Write focused NASM test** for the specific instruction/feature
2. **Generate QEMU fixture** as ground truth
3. **Run against v86** to find divergence
4. **Use differential harness** to binary-search the first mismatch
5. **Add invariant assertions** in Rust code for edge cases
6. **Only then** test with full Linux kernel

### Commands

```bash
# Build 64-bit test binaries
make nasm64tests-create

# Generate fixtures using QEMU (requires qemu-system-x86_64)
make nasm64tests-fixtures

# Run 64-bit tests against v86
make nasm64tests

# Differential test (v86 vs QEMU for specific binary)
./tests/differential/harness.js tests/nasm64/build/test_name.img

# Run with verbose output
DEBUG=1 ./tests/nasm64/run64.js

# Run specific test pattern
TEST_NAME=rex ./tests/nasm64/run64.js
```

### 64-bit Test Structure

Tests use `header64.inc` and `footer64.inc`:

```nasm
%include "header64.inc"   ; Boots into long mode

; Your 64-bit test code here
mov rax, 0x123456789ABCDEF0
mov [0x100000], rax

%include "footer64.inc"   ; HLT for test completion
```

### header64.inc Bootstrap Sequence

1. Sets up GDT with 64-bit code segment (L=1, D=0)
2. Creates identity-mapped 4-level page tables (first 4GB, 2MB pages)
3. Enables PAE (CR4.PAE=1)
4. Enables long mode (EFER.LME=1)
5. Enables paging (CR0.PG=1)
6. Far jumps to 64-bit code segment
7. Initializes R8-R15 to zero

### Test Categories (Priority Order)

| Category | What it tests | Status |
|----------|---------------|--------|
| Long mode entry | CR0/CR4/EFER, mode transition | ✅ Passing |
| REX prefixes | REX.W/R/X/B encoding, R8-R15 | ✅ Passing |
| 64-bit arithmetic | ADD/SUB/MUL/DIV with 64-bit operands | ✅ Passing |
| RIP-relative | Default addressing in 64-bit mode | ✅ Passing |
| SIB extensions | REX.X/REX.B for index/base | ✅ Passing |
| Exception handling | #DE, #UD, #GP, #PF, #BP with 64-bit IDT | ✅ Passing |
| Stack frame tests | 64-bit exception stack frames | ✅ Passing |
| Bit manipulation | BSF/BSR/BT 64-bit | ✅ Passing |
| Conditional moves | CMOVcc 64-bit | ✅ Passing |
| SYSCALL/SYSRET | MSR setup, fast syscall path | ⏳ Future |

### Differential Testing

When a test fails, use differential testing to find the exact divergence:

```bash
# Run harness with verbose output
./tests/differential/harness.js --verbose tests/nasm64/build/test_name.img

# Output shows:
# [-] FAIL - 3 difference(s)
#     REGISTER: rax
#       v86:  0x0000000012345678
#       QEMU: 0x123456789abcdef0
```

### Adding Runtime Invariants

Add assertions in Rust code for 64-bit mode:

```rust
// In cpu.rs - critical 64-bit invariants
fn assert_long_mode_invariants(&self) {
    if self.is_long_mode_active() {
        // CS.L=1 and CS.D=0 in 64-bit mode
        dbg_assert!(self.cs_l_bit() && !self.cs_d_bit());
        // Canonical address check
        dbg_assert!(is_canonical(self.rip));
        // EFER.LMA matches CR0.PG && EFER.LME
        dbg_assert!(self.efer_lma() == (self.cr0_pg() && self.efer_lme()));
    }
}
```

### Debugging a Specific Failure

1. **Reproduce with minimal test**:
   ```bash
   cat > tests/nasm64/build/debug.asm << 'EOF'
   %include "header64.inc"
   mov rax, 0xDEADBEEF
   mov [0x100000], rax
   %include "footer64.inc"
   EOF
   nasm -f elf64 -o tests/nasm64/build/debug.o tests/nasm64/build/debug.asm
   ld -m elf_x86_64 -o tests/nasm64/build/debug.img tests/nasm64/build/debug.o
   ```

2. **Generate QEMU fixture**:
   ```bash
   ./tests/nasm64/gen_fixtures64.js
   ```

3. **Run differential test**:
   ```bash
   ./tests/differential/harness.js tests/nasm64/build/debug.img
   ```

4. **Add breakpoints for binary search**:
   Insert `int 3` instructions to narrow down the failing instruction.

### Requirements

- **NASM** - assembler for test binaries
- **ld** - GNU linker for ELF64

Install on macOS: `brew install nasm`
Install on Linux: `apt install nasm`

### Fixture Generation: Golden Master Approach

**IMPORTANT**: QEMU's `-kernel` option uses the Linux boot protocol, NOT Multiboot. Our test binaries are Multiboot format, so QEMU cannot directly execute them for fixture generation.

**Solution**: Use `gen_golden.js` to generate "golden master" fixtures by running tests in v86 itself:

```bash
# Generate fixtures using v86 execution
node tests/nasm64/gen_golden.js --force

# Run tests against fixtures
node tests/nasm64/run64.js
```

**Key Requirements for Consistent Fixtures:**

1. **Both files must use identical settings:**
   - `disable_jit: 1` (interpreter mode for determinism)
   - Same `cpu_exception_hook` behavior

2. **cpu_exception_hook must return `false`:**
   ```javascript
   emulator.cpu_exception_hook = function(n) {
       return false;  // Deliver exception to guest IDT
   };
   ```
   - In DEBUG builds, `return true` SUPPRESSES exception delivery
   - Default hook returns `undefined` (falsy = delivers to guest)

3. **Register access must match:**
   - Both use WASM memory access (offset 1280 for reg64)
   - NOT `cpu.reg32[]` which only gives 32-bit values

### WASM Memory Layout for 64-bit Registers

```javascript
// Reading 64-bit registers from v86 WASM memory
function getReg64(cpu, index) {
    // reg64 array at offset 1280, 8 bytes per register
    const offset = 1280 + index * 8;
    const view = new DataView(cpu.wasm_memory.buffer);
    const low = view.getUint32(offset, true);
    const high = view.getUint32(offset + 4, true);
    return BigInt(low) | (BigInt(high) << 32n);
}

// Register indices: RAX=0, RCX=1, RDX=2, RBX=3, RSP=4, RBP=5, RSI=6, RDI=7
//                   R8=8, R9=9, R10=10, R11=11, R12=12, R13=13, R14=14, R15=15

// RIP at offset 1408
function getRIP(cpu) {
    const offset = 1408;
    const view = new DataView(cpu.wasm_memory.buffer);
    const low = view.getUint32(offset, true);
    const high = view.getUint32(offset + 4, true);
    return BigInt(low) | (BigInt(high) << 32n);
}
```

### KVM Unit Tests

Located at `v86/tests/kvm-unit-tests/`. These ARE x86_64 tests (configured with `ARCH=x86_64`) but **cannot be built on macOS** due to GCC-specific flags like `-mno-red-zone` and `-no-pie` that are incompatible with clang.

**Building on macOS via Docker:**

```bash
cd v86/tests/kvm-unit-tests
./build-docker.sh   # Uses Docker with linux/amd64 platform
```

The Docker setup:
- **Dockerfile**: Debian bookworm-slim with GCC, G++, make, binutils
- **build-docker.sh**: Runs configure and make inside container with `--platform linux/amd64`
- Output: Compiled `.flat` binaries in `x86/` directory

**Important**: Some tests (like `pae.c`) are explicitly 32-bit only (`#error This test is 32-bit only`) and will fail in x86_64 builds. These are expected and skipped. The build produces **37 x86_64 test binaries**.

**To run a specific KVM test:**
```bash
node tests/kvm-unit-tests/run.mjs x86/testname.flat
```

For quick macOS development without Docker, use the NASM64 tests which provide comprehensive 64-bit coverage.

---

## Style and engineering constraints

- Prefer explicit types/structs for 64-bit state (Rust `u64`/`i64`, avoid `i32` truncation)
- Treat guest-physical addressing and page-walk math as 64-bit first-class
- Highlight "must be correct to boot Linux" vs "can be approximated initially"
- Always end with a minimal next-step list (≤7 items)
- When in doubt, cite the Intel manual section

ultrathink
