# 4-Level Paging Checklist

This checklist covers implementing 4-level paging for x86_64 long mode.

## References

```
SPEC: intel-64bit-architecture.md :: Vol 3A Ch 4.5 "4-Level Paging" -> Full structure
SPEC: intel-64bit-architecture.md :: Vol 3A Ch 4.5.1 "Canonical Addressing" -> 48-bit virtual address space
SPEC: intel-64bit-architecture.md :: Vol 3A Ch 4.5.4 "Linear-Address Translation" -> Walk algorithm
SPEC: intel-64bit-architecture.md :: Vol 3A Ch 4.7 "Page-Fault Exceptions" -> #PF error codes
```

---

## Address Space

### Canonical addresses (48-bit)

Virtual addresses in 64-bit mode are 48 bits (with current CPUs), sign-extended to 64 bits.

| Range | Description |
|-------|-------------|
| 0x0000_0000_0000_0000 - 0x0000_7FFF_FFFF_FFFF | Lower canonical half |
| 0xFFFF_8000_0000_0000 - 0xFFFF_FFFF_FFFF_FFFF | Upper canonical half |
| Everything else | Non-canonical → #GP or #SS |

- [ ] Implement canonical address check function
- [ ] Non-canonical memory access → #GP(0)
- [ ] Non-canonical stack access → #SS(0)

---

## Page Table Structure

### 4-level hierarchy

| Level | Name | Entry count | Covers | Index bits |
|-------|------|-------------|--------|------------|
| 4 | PML4 | 512 | 256 TiB | [47:39] |
| 3 | PDPT | 512 | 512 GiB | [38:30] |
| 2 | PD | 512 | 1 GiB | [29:21] |
| 1 | PT | 512 | 2 MiB | [20:12] |
| 0 | Page | - | 4 KiB | [11:0] |

### Entry format (common bits)

| Bit | Name | Description |
|-----|------|-------------|
| 0 | P | Present |
| 1 | R/W | Read/Write |
| 2 | U/S | User/Supervisor |
| 3 | PWT | Page-level write-through |
| 4 | PCD | Page-level cache disable |
| 5 | A | Accessed |
| 6 | D | Dirty (PT entry only) |
| 7 | PS | Page size (1 = large page at this level) |
| 8 | G | Global (PT entry only, if CR4.PGE=1) |
| 63 | XD/NX | Execute disable (if EFER.NXE=1) |

### Physical address extraction

- PML4E/PDPTE/PDE: bits [51:12] contain next-level table address
- PTE: bits [51:12] contain page frame address
- Large pages (2 MiB): PDE bits [51:21]
- Large pages (1 GiB): PDPTE bits [51:30] (if supported)

---

## Walk Algorithm

```
function translate(linear_addr):
    if not is_canonical(linear_addr):
        raise #GP(0) or #SS(0)

    pml4_index = (linear_addr >> 39) & 0x1FF
    pdpt_index = (linear_addr >> 30) & 0x1FF
    pd_index   = (linear_addr >> 21) & 0x1FF
    pt_index   = (linear_addr >> 12) & 0x1FF
    offset     = linear_addr & 0xFFF

    pml4e = read_phys(cr3 + pml4_index * 8)
    if not (pml4e & P): raise #PF

    pdpte = read_phys((pml4e & ADDR_MASK) + pdpt_index * 8)
    if not (pdpte & P): raise #PF
    if (pdpte & PS): return (pdpte & HUGE_ADDR_MASK) + (linear_addr & 0x3FFFFFFF)  # 1 GiB

    pde = read_phys((pdpte & ADDR_MASK) + pd_index * 8)
    if not (pde & P): raise #PF
    if (pde & PS): return (pde & LARGE_ADDR_MASK) + (linear_addr & 0x1FFFFF)  # 2 MiB

    pte = read_phys((pde & ADDR_MASK) + pt_index * 8)
    if not (pte & P): raise #PF

    return (pte & ADDR_MASK) + offset
```

---

## Implementation checklist

### Data structures

- [ ] 64-bit page table entry type
- [ ] Physical address mask (bits [51:12])
- [ ] Large page address masks
- [ ] NX bit handling

### Core functions

- [ ] `is_canonical(addr: u64) -> bool`
- [ ] `translate_address_4level(linear: u64, write: bool, user: bool) -> Result<u64, PageFault>`
- [ ] `walk_pml4(cr3: u64, linear: u64) -> WalkResult`

### Access checks

- [ ] Present bit check at each level
- [ ] R/W check for write access
- [ ] U/S check for user mode access
- [ ] NX check for instruction fetch
- [ ] Reserved bit checks

### Accessed/Dirty bits

- [ ] Set A bit on all entries in walk
- [ ] Set D bit on final entry for write access
- [ ] Atomic updates (or lock)

---

## #PF Error Code (64-bit)

| Bit | Name | Meaning when set |
|-----|------|------------------|
| 0 | P | Fault caused by non-present page (0) or protection (1) |
| 1 | W/R | Fault caused by write (1) or read (0) |
| 2 | U/S | Fault in user mode (1) or supervisor (0) |
| 3 | RSVD | Reserved bit set in page structure |
| 4 | I/D | Fault caused by instruction fetch |
| 5 | PK | Protection key violation |
| 6 | SS | Shadow stack access |
| 15 | SGX | SGX-related |

- [ ] Build error code from walk state
- [ ] Push error code on stack during #PF delivery
- [ ] CR2 = faulting linear address

---

## TLB Considerations

- [ ] TLB entries must include full 64-bit virtual address (or tag)
- [ ] INVLPG invalidates single entry
- [ ] CR3 write flushes non-global entries
- [ ] Global pages (G=1) survive CR3 flush

---

## Tests

- [ ] Walk 4-level structure, all levels valid
- [ ] #PF on not-present PML4E
- [ ] #PF on not-present PDPTE, PDE, PTE
- [ ] 2 MiB large page translation
- [ ] 1 GiB huge page translation (if supporting)
- [ ] Non-canonical address → #GP
- [ ] NX violation → #PF with I/D=1
- [ ] User access to supervisor page → #PF with U/S=1
- [ ] Write to read-only page → #PF with W/R=1

---

## Files to modify

| File | Changes |
|------|---------|
| `v86/src/rust/paging.rs` | Add 4-level walk logic |
| `v86/src/rust/page.rs` | 64-bit page entry types |
| `v86/src/rust/cpu/cpu.rs` | Canonical check, CR2 handling |
| `v86/src/rust/cpu/memory.rs` | Integrate 4-level translate |
| `v86/src/rust/cpu/cpu.rs` | #PF error code construction |
