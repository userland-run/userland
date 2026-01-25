# Roadmap Template

Use this template when `$ARGUMENTS` = `roadmap` or empty.

---

# v86 x86_64 + wasm64 Enhancement Roadmap

## Executive Summary

**Objective**: Add x86_64 long mode capabilities to v86, enabling both 32-bit and 64-bit guests using wasm64/memory64 (Wasm 3.0).

**Current state**: v86 supports real mode, protected mode, and virtual 8086 mode with PAE paging. All registers and addresses are 32-bit.

**End state**: Full x86_64 long mode support alongside existing 32-bit modes. 64-bit GPRs (RAX-R15), 4-level paging, 64-bit IDT, SYSCALL/SYSRET, and ability to boot 64-bit Linux while maintaining full 32-bit guest compatibility.

---

## Repo anchors

| Component | Files | Key symbols |
|-----------|-------|-------------|
| CPU state | `v86/src/rust/cpu/cpu.rs`, `v86/src/rust/regs.rs` | `reg128`, GPR constants, CR/EFER constants |
| Instruction decode | `v86/src/rust/cpu/instructions.rs`, `instructions_0f.rs` | Opcode handlers |
| ModR/M + SIB | `v86/src/rust/cpu/modrm.rs`, `v86/src/rust/modrm.rs` | `resolve_modrm32` |
| Paging | `v86/src/rust/paging.rs`, `v86/src/rust/page.rs` | `OrPageFault`, page table masks |
| Memory | `v86/src/rust/cpu/memory.rs` | Read/write functions |
| Wasm codegen | `v86/src/rust/wasmgen/` | `wasm_builder.rs`, `wasm_opcodes.rs` |
| JIT | `v86/src/rust/jit.rs`, `jit_instructions.rs` | JIT compilation |

---

## Spec anchors

```
SPEC: intel-64bit-architecture.md :: Vol 3A Ch 2 "System Architecture Overview" -> EFER.LME/LMA, CR0.PG, CR4.PAE requirements
SPEC: intel-64bit-architecture.md :: Vol 3A Ch 4 "Paging" -> 4-level paging structure, canonical addresses
SPEC: intel-64bit-architecture.md :: Vol 2A Ch 2 "Instruction Format" -> REX prefix encoding
SPEC: intel-64bit-architecture.md :: Vol 3A Ch 5 "Interrupt and Exception Handling" -> 64-bit IDT gate format
SPEC: intel-64bit-architecture.md :: Vol 2B "SYSCALL/SYSRET" -> Fast system call mechanism
SPEC: wasm-3.0-specs.md :: memory64 proposal -> i64 addressing, memory.grow semantics
```

---

## Milestone overview

| M# | Title | Gating criteria |
|----|-------|-----------------|
| M0 | Tooling + harness | CI passes, doc index works, microtest runner boots |
| M1 | CPU state + decode | 64-bit GPRs accessible, REX decode works, no runtime errors |
| M2 | Long mode control | Can set EFER.LME, transition to long mode without crash |
| M3 | 4-level paging | PML4 walks work, canonical check, #PF on invalid |
| M4 | Exceptions/interrupts | 64-bit IDT works, #GP/#PF delivered correctly |
| M5 | SYSCALL/SYSRET | Linux syscall ABI works for basic calls |
| M6 | Boot 64-bit guest | Minimal 64-bit Linux reaches userspace |

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| wasm64 browser support incomplete | Blocks entire project | Feature-detect at runtime, document requirements |
| Rust codegen assumes i32 pervasively | High refactor cost | Audit type usage early, use newtype wrappers |
| REX.W interactions with existing opcode handlers | Subtle bugs | Comprehensive microtest coverage |
| Performance regression from 64-bit operations | Slower execution | Defer optimization to post-boot phase |

---

## Tests

1. **Microtests**: Single-instruction tests for REX decoding, 64-bit arithmetic, addressing modes
2. **Mode transition tests**: Protected → Long mode → Compatibility mode → Long mode
3. **Paging tests**: 4-level walks, large pages, NX enforcement, canonical faults
4. **Interrupt tests**: IDT parsing, privilege transitions, IST usage
5. **Boot tests**: Minimal kernel reaching init, then full Linux

---

## Definition of Done

- [ ] 64-bit Linux kernel boots to userspace
- [ ] Basic shell (busybox) runs and responds
- [ ] No known correctness regressions in 32-bit mode
- [ ] CI green on all microtest suites
- [ ] Documentation updated with long mode specifics

---

## Next steps

1. Set up doc indexing for `/Users/drietsch/userland/docs`
2. Audit `v86/src/rust/cpu/cpu.rs` for i32-bound state
3. Create REX prefix decode skeleton
4. Define microtest format and runner
5. Map EFER/CR4 bit manipulation in existing code
