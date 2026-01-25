# Long Mode Enablement Checklist

This checklist covers enabling x86_64 long mode (IA-32e mode) in v86.

## References

```
SPEC: intel-64bit-architecture.md :: Vol 3A Ch 2.2 "Modes of Operation" -> Mode hierarchy
SPEC: intel-64bit-architecture.md :: Vol 3A Ch 9.8 "Activating Long Mode" -> Enablement sequence
SPEC: intel-64bit-architecture.md :: Vol 3A Ch 2.5 "Control Registers" -> CR0, CR4, EFER bits
```

---

## Prerequisites

- [ ] PAE paging implemented and working (CR4.PAE = 1)
- [ ] EFER MSR accessible via RDMSR/WRMSR
- [ ] 64-bit page table structures defined (PML4)

---

## EFER MSR (0xC0000080)

| Bit | Name | Description | Required |
|-----|------|-------------|----------|
| 0 | SCE | SYSCALL Enable | For SYSCALL/SYSRET |
| 8 | LME | Long Mode Enable | **Yes** |
| 10 | LMA | Long Mode Active (read-only) | Set by CPU |
| 11 | NXE | No-Execute Enable | For NX bit in PTEs |

### Implementation

- [ ] Define EFER_LME (bit 8), EFER_LMA (bit 10), EFER_NXE (bit 11) constants
- [ ] Add EFER to CPU state struct
- [ ] Implement RDMSR/WRMSR for MSR 0xC0000080
- [ ] LMA is set automatically when: LME=1 AND CR0.PG=1 AND CR4.PAE=1

---

## CR0 Requirements

| Bit | Name | Requirement |
|-----|------|-------------|
| 0 | PE | Must be 1 (protected mode) |
| 31 | PG | Must be 1 (paging enabled) |

---

## CR4 Requirements

| Bit | Name | Requirement |
|-----|------|-------------|
| 5 | PAE | Must be 1 (PAE paging) |
| 7 | PGE | Optional (global pages) |

---

## Enablement Sequence

The correct sequence to enter long mode:

1. **Disable paging** (CR0.PG = 0)
2. **Enable PAE** (CR4.PAE = 1) - may already be set
3. **Load PML4 address into CR3**
4. **Enable LME** (EFER.LME = 1)
5. **Enable paging** (CR0.PG = 1)
6. CPU automatically sets EFER.LMA = 1
7. **Far jump to 64-bit code segment** to activate 64-bit mode

### Implementation notes

- [ ] Trap CR0 writes that set PG while LME=1 and PAE=1
- [ ] On such write, set LMA=1 and switch to 64-bit decode
- [ ] Validate: if LME=1 but PAE=0 when enabling PG → #GP
- [ ] Far jump with CS.L=1 required to enter 64-bit submode

---

## Sub-modes of Long Mode

| Mode | CS.L | CS.D | Address size | Operand size |
|------|------|------|--------------|--------------|
| 64-bit mode | 1 | 0 | 64 | 32 (default) |
| Compatibility mode | 0 | X | 32 or 16 | 32 or 16 |

- [ ] Track CS.L bit for current code segment
- [ ] 64-bit mode: default operand size 32, REX.W for 64
- [ ] Compatibility mode: acts like protected mode

---

## Code segment descriptor (64-bit mode)

In 64-bit mode, code segment descriptor has:
- L bit (bit 53): Long mode flag
- D bit (bit 54): Must be 0 when L=1

- [ ] Parse L bit from segment descriptor
- [ ] Validate L=1 implies D=0 (else #GP)

---

## Tests

- [ ] Set EFER.LME via WRMSR
- [ ] Read back EFER via RDMSR
- [ ] Enable long mode via CR0.PG with proper prerequisites
- [ ] Verify LMA is set after enabling
- [ ] #GP on invalid combinations (LME=1, PAE=0, PG=1)
- [ ] Far jump to 64-bit code segment
- [ ] Execute 64-bit instruction (mov rax, 0x123456789ABCDEF0)

---

## Files to modify

| File | Changes |
|------|---------|
| `v86/src/rust/cpu/cpu.rs` | Add EFER state, LME/LMA/NXE constants |
| `v86/src/rust/cpu/misc_instr.rs` | Update RDMSR/WRMSR handlers |
| `v86/src/rust/cpu/cpu.rs` | CR0 write handler - check LME transition |
| `v86/src/rust/cpu/cpu.rs` | Add `is_long_mode()` helper |
| `v86/src/rust/cpu/cpu.rs` | Track CS.L for sub-mode detection |
