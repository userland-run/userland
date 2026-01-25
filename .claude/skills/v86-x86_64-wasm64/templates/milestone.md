# Milestone Template

Use this template when `$ARGUMENTS` starts with `milestone M<N>`.

---

# Milestone M{N}: {Title}

## Objective

{One-sentence goal for this milestone}

## Prerequisites

- [ ] {Previous milestone completed}
- [ ] {Required infrastructure in place}
- [ ] {Relevant docs indexed}

---

## Repo anchors

| Component | File | Symbol/Line | Notes |
|-----------|------|-------------|-------|
| {component} | `{path}` | `{symbol}` | {what needs to change} |

---

## Spec anchors

```
SPEC: {doc} :: {section} -> {implementation note}
SPEC: {doc} :: {section} -> {implementation note}
SPEC: {doc} :: {section} -> {implementation note}
SPEC: {doc} :: {section} -> {implementation note}
SPEC: {doc} :: {section} -> {implementation note}
```

---

## Plan

### Phase 1: {Phase title}

1. {Step 1}
2. {Step 2}
3. {Step 3}

### Phase 2: {Phase title}

4. {Step 4}
5. {Step 5}
6. {Step 6}

### Phase 3: {Phase title}

7. {Step 7}
8. {Step 8}

---

## Implementation details

### {Subsection 1}

{Technical details, code patterns, type changes}

```rust
// Example code pattern
```

### {Subsection 2}

{More details}

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| {risk 1} | {H/M/L} | {H/M/L} | {mitigation} |
| {risk 2} | {H/M/L} | {H/M/L} | {mitigation} |

---

## Tests

### Unit tests

- [ ] {Test 1}: {what it verifies}
- [ ] {Test 2}: {what it verifies}

### Integration tests

- [ ] {Test 3}: {what it verifies}
- [ ] {Test 4}: {what it verifies}

### Manual verification

- [ ] {Manual check 1}
- [ ] {Manual check 2}

---

## Definition of Done

- [ ] {Criterion 1}
- [ ] {Criterion 2}
- [ ] {Criterion 3}
- [ ] All spec anchors traced to implementation
- [ ] Tests passing in CI
- [ ] No regressions in existing functionality

---

## Next steps (post-milestone)

1. {What to do after this milestone}
2. {Preparation for next milestone}
3. {Documentation updates}
