# x86_64 CPU State Reference

This document defines the CPU state layout for 64-bit support in v86.

## Overview

x86_64 extends the CPU state with:
- 64-bit general-purpose registers (GPRs)
- 8 additional GPRs (R8-R15)
- 64-bit instruction pointer (RIP)
- 64-bit flags register (RFLAGS)
- Extended control registers
- Model-Specific Registers (MSRs)

---

## General Purpose Registers

### 64-bit GPRs

| 64-bit | 32-bit | 16-bit | 8-bit high | 8-bit low |
|--------|--------|--------|------------|-----------|
| RAX | EAX | AX | AH | AL |
| RBX | EBX | BX | BH | BL |
| RCX | ECX | CX | CH | CL |
| RDX | EDX | DX | DH | DL |
| RSI | ESI | SI | - | SIL |
| RDI | EDI | DI | - | DIL |
| RBP | EBP | BP | - | BPL |
| RSP | ESP | SP | - | SPL |
| R8 | R8D | R8W | - | R8B |
| R9 | R9D | R9W | - | R9B |
| R10 | R10D | R10W | - | R10B |
| R11 | R11D | R11W | - | R11B |
| R12 | R12D | R12W | - | R12B |
| R13 | R13D | R13W | - | R13B |
| R14 | R14D | R14W | - | R14B |
| R15 | R15D | R15W | - | R15B |

### Implementation

```rust
pub const RAX: usize = 0;
pub const RCX: usize = 1;
pub const RDX: usize = 2;
pub const RBX: usize = 3;
pub const RSP: usize = 4;
pub const RBP: usize = 5;
pub const RSI: usize = 6;
pub const RDI: usize = 7;
pub const R8:  usize = 8;
pub const R9:  usize = 9;
pub const R10: usize = 10;
pub const R11: usize = 11;
pub const R12: usize = 12;
pub const R13: usize = 13;
pub const R14: usize = 14;
pub const R15: usize = 15;

pub struct GprState {
    pub regs: [u64; 16],  // RAX through R15
}

impl GprState {
    // Read 8-bit low (AL, CL, DL, BL, SPL, BPL, SIL, DIL, R8B-R15B)
    pub fn read8l(&self, reg: usize) -> u8 {
        self.regs[reg] as u8
    }

    // Read 8-bit high (AH, CH, DH, BH) - only for reg 0-3 without REX
    pub fn read8h(&self, reg: usize) -> u8 {
        (self.regs[reg] >> 8) as u8
    }

    // Read 16-bit
    pub fn read16(&self, reg: usize) -> u16 {
        self.regs[reg] as u16
    }

    // Read 32-bit (zero-extends to 64-bit on write)
    pub fn read32(&self, reg: usize) -> u32 {
        self.regs[reg] as u32
    }

    // Read 64-bit
    pub fn read64(&self, reg: usize) -> u64 {
        self.regs[reg]
    }

    // Write 8-bit low (preserves upper bits)
    pub fn write8l(&mut self, reg: usize, val: u8) {
        self.regs[reg] = (self.regs[reg] & !0xFF) | val as u64;
    }

    // Write 8-bit high (preserves other bits)
    pub fn write8h(&mut self, reg: usize, val: u8) {
        self.regs[reg] = (self.regs[reg] & !0xFF00) | ((val as u64) << 8);
    }

    // Write 16-bit (preserves upper 48 bits)
    pub fn write16(&mut self, reg: usize, val: u16) {
        self.regs[reg] = (self.regs[reg] & !0xFFFF) | val as u64;
    }

    // Write 32-bit (ZERO-EXTENDS to 64 bits!)
    pub fn write32(&mut self, reg: usize, val: u32) {
        self.regs[reg] = val as u64;  // Upper 32 bits cleared
    }

    // Write 64-bit
    pub fn write64(&mut self, reg: usize, val: u64) {
        self.regs[reg] = val;
    }
}
```

**Critical**: Writing to a 32-bit register (EAX, R8D, etc.) zero-extends to 64 bits. This is different from 16-bit and 8-bit writes which preserve upper bits.

---

## Instruction Pointer

```rust
pub struct CpuState {
    pub rip: u64,  // Always stored as 64-bit
    // In 32-bit mode, only lower 32 bits are meaningful
}
```

---

## RFLAGS

```
63                              21 20 19 18 17 16    14 13:12 11 10  9  8  7  6     4     2  1  0
+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
|            Reserved            |ID|VIP|VIF|AC|VM|RF|  |NT| IOPL|OF|DF|IF|TF|SF|ZF|  |AF|  |PF|  |CF|
+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
```

Upper 32 bits are reserved (must be 0).

---

## Control Registers

### CR0

| Bit | Name | Description |
|-----|------|-------------|
| 0 | PE | Protection Enable |
| 1 | MP | Monitor Coprocessor |
| 2 | EM | Emulation |
| 3 | TS | Task Switched |
| 4 | ET | Extension Type |
| 16 | WP | Write Protect |
| 18 | AM | Alignment Mask |
| 29 | NW | Not Write-through |
| 30 | CD | Cache Disable |
| 31 | PG | Paging |

### CR3 (64-bit mode)

| Bits | Description |
|------|-------------|
| 2:0 | Ignored |
| 3 | PWT (Page-level Write-Through) |
| 4 | PCD (Page-level Cache Disable) |
| 11:5 | Ignored |
| M-1:12 | PML4 physical base address |
| 63:M | Reserved (must be 0) |

M = MAXPHYADDR (typically 52)

### CR4

| Bit | Name | Description |
|-----|------|-------------|
| 0 | VME | Virtual-8086 Mode Extensions |
| 1 | PVI | Protected-Mode Virtual Interrupts |
| 2 | TSD | Time Stamp Disable |
| 3 | DE | Debugging Extensions |
| 4 | PSE | Page Size Extensions |
| 5 | PAE | Physical Address Extension |
| 7 | PGE | Page Global Enable |
| 9 | OSFXSR | FXSAVE/FXRSTOR Support |
| 10 | OSXMMEXCPT | Unmasked SIMD FP Exceptions |
| 20 | SMEP | Supervisor Mode Execution Prevention |
| 21 | SMAP | Supervisor Mode Access Prevention |

---

## EFER MSR (0xC0000080)

| Bit | Name | Description |
|-----|------|-------------|
| 0 | SCE | System Call Extensions (SYSCALL/SYSRET) |
| 8 | LME | Long Mode Enable |
| 10 | LMA | Long Mode Active (read-only) |
| 11 | NXE | No-Execute Enable |

```rust
pub struct EferMsr {
    pub sce: bool,   // bit 0
    pub lme: bool,   // bit 8
    pub lma: bool,   // bit 10 (read-only, set by hardware)
    pub nxe: bool,   // bit 11
}
```

---

## Segment Registers (64-bit mode)

In 64-bit mode, most segment bases are ignored:
- CS, DS, ES, SS: base treated as 0
- FS, GS: base loaded from MSRs (FS_BASE, GS_BASE, KERNEL_GS_BASE)

```rust
pub const IA32_FS_BASE: u32 = 0xC0000100;
pub const IA32_GS_BASE: u32 = 0xC0000101;
pub const IA32_KERNEL_GS_BASE: u32 = 0xC0000102;
```

---

## Descriptor Table Registers

### GDTR / IDTR (64-bit)

```rust
pub struct DescriptorTableReg {
    pub limit: u16,
    pub base: u64,  // 64-bit base in long mode
}
```

---

## System MSRs for SYSCALL/SYSRET

| MSR | Address | Description |
|-----|---------|-------------|
| STAR | 0xC0000081 | SYSCALL target CS/SS, SYSRET CS/SS |
| LSTAR | 0xC0000082 | SYSCALL target RIP (64-bit) |
| CSTAR | 0xC0000083 | SYSCALL target RIP (compat mode) |
| SFMASK | 0xC0000084 | SYSCALL RFLAGS mask |

```rust
pub struct SyscallMsrs {
    pub star: u64,    // [31:0] = SYSCALL EIP, [47:32] = SYSCALL CS, [63:48] = SYSRET CS
    pub lstar: u64,   // 64-bit SYSCALL entry point
    pub cstar: u64,   // Compatibility mode SYSCALL entry point
    pub sfmask: u64,  // RFLAGS mask for SYSCALL
}
```

---

## Complete CPU State Structure

```rust
pub struct CpuState {
    // General purpose registers
    pub gpr: [u64; 16],        // RAX-R15

    // Instruction pointer and flags
    pub rip: u64,
    pub rflags: u64,

    // Segment registers (selectors + cached descriptors)
    pub seg: [SegmentReg; 8],  // ES, CS, SS, DS, FS, GS, TR, LDTR

    // Control registers
    pub cr0: u64,
    pub cr2: u64,              // Page fault linear address
    pub cr3: u64,              // Page directory base
    pub cr4: u64,

    // Descriptor table registers
    pub gdtr: DescriptorTableReg,
    pub idtr: DescriptorTableReg,

    // EFER and system MSRs
    pub efer: u64,
    pub star: u64,
    pub lstar: u64,
    pub cstar: u64,
    pub sfmask: u64,
    pub fs_base: u64,
    pub gs_base: u64,
    pub kernel_gs_base: u64,

    // FPU/SSE state
    pub fpu: FpuState,
    pub xmm: [u128; 16],       // XMM0-XMM15

    // CPU mode tracking
    pub mode: CpuMode,
}

pub enum CpuMode {
    Real,
    Protected,
    Long,        // 64-bit mode (CS.L=1)
    Compatibility, // Long mode but CS.L=0
}
```
