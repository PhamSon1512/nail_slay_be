# Code Quality First Rule

> **Golden Rule:** Write code as if it's already been refactored. No "temporary" code, no "I'll clean this up later".

---

## 1. Module Depth Principle

### Forbidden: The God Module
```typescript
// ❌ BAD: service.ts with 1000+ lines
export async function createBooking() { /* 200 lines */ }
export async function checkInBooking() { /* 400 lines */ }
export async function cancelBooking() { /* 150 lines */ }
// ... 10 more functions
```

### Required: Deep Modules from Day 1
```typescript
// ✅ GOOD: Separate by seams from the start
// service/booking.ts - orchestration only (200 lines)
// service/slot-manager.ts - slot logic (150 lines)
// service/pricing-adapter.ts - pricing logic (200 lines)
// service/snapshot-builder.ts - snapshot logic (100 lines)
```

**Heuristic:** If you need to scroll more than 2 screens to see a function's implementation, it's a shallow module. Split it.

---

## 2. Import/Export Discipline

### Required: Explicit Type Exports
```typescript
// ✅ GOOD: Export types explicitly
export type { SlotBoundary, OperatingHours } from './slot-manager';
export { SlotManager, SLOT_MS } from './slot-manager';

// ❌ BAD: Missing type exports
export * from './slot-manager'; // Don't use wildcard exports
```

### Required: No Orphaned Imports
Every imported symbol must be used. Run check:
```bash
npx tsc --noEmit && echo "No orphaned imports"
```

---

## 3. Seams Before Implementation

### Required: Define Interfaces First
Before writing implementation, define the seam:

```typescript
// 1. Define the interface (what callers need to know)
export interface PricingAdapter {
  computePrice(params: PricingParams): Promise<PricingResult>;
  calculateDiscount(ctx: PriceContext, result: PriceResult): number;
}

// 2. Then implement
export class PricingEngineAdapter implements PricingAdapter {
  // implementation here
}
```

**Rule:** If you can't write the interface in 5 lines, you don't understand the seam yet.

---

## 4. Pure Functions by Default

### Required: Extract Pure Logic
Any calculation that doesn't need DB/external service must be a pure function:

```typescript
// ✅ GOOD: Pure function, easily testable
export function floorTo30Min(date: Date): Date {
  const SLOT_MS = 30 * 60 * 1000;
  return new Date(Math.floor(date.getTime() / SLOT_MS) * SLOT_MS);
}

// ❌ BAD: Logic embedded in DB-dependent code
const slotStart = new Date(Math.floor(input.scheduledDate.getTime() / (30 * 60 * 1000)) * (30 * 60 * 1000));
```

---

## 5. Type Safety Gates

### Required: No Implicit Any
Enable strict type checking from the start:
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Required: Explicit Return Types on Public Functions
```typescript
// ✅ GOOD: Explicit return type
export async function getBookingSlots(
  c: HonoCtx, 
  input: GetBookingSlotsInput
): Promise<SlotAvailability> { }

// ❌ BAD: Implicit return type
export async function getBookingSlots(c, input) { }
```

---

## 6. Dependency Direction

### Required: DAG Only (No Circular Dependencies)
Dependencies must flow one way:
```
booking.ts → slot-manager.ts → (no local deps)
booking.ts → checkin-orchestrator.ts → snapshot-builder.ts
```

**Check before committing:**
```bash
npx madge --circular src/api/booking/service/
# Should output: No circular dependency found!
```

---

## 7. Test Surface Definition

### Required: Export Testable Units
Every module must export units that can be tested in isolation:

```typescript
// ✅ GOOD: Export pure functions for testing
export { floorTo30Min, getDayKey, generateSlots };

// ✅ GOOD: Export class with injectable dependencies
export class SnapshotBuilder {
  constructor(private db: DrizzleDb) {}
}
```

---

## 8. File Size Limits

### Required: Hard Limits
| File Type | Max Lines | Action if Exceeded |
|-----------|-----------|-------------------|
| Service files | 300 | Split by seam |
| Router files | 150 | Group routes, extract handlers |
| Type definition files | 200 | Split by domain |
| Test files | 400 | Split by test category |

---

## 9. Documentation as Code

### Required: JSDoc for Public APIs
```typescript
/**
 * Check-in a confirmed booking — creates an order draft and pending gun sessions.
 * 
 * Pricing:
 *   basePrice      = Σ(variant.unitPrice) + Σ(ammo.priceVnd × qty)
 *   priceAfterTier = basePrice × (1 - tierDiscountPercent/100)
 *   finalPrice     = priceAfterTier - totalDiscounts
 * 
 * CAS: UPDATE bookings WHERE status='confirmed' — if changes=0 → 409.
 */
export async function checkInBooking(
  c: HonoCtx, 
  bookingId: string, 
  input: CheckInInput
): Promise<CheckInResult> { }
```

---

## 10. Pre-Commit Checklist

Before marking any code as "done":

- [ ] **Type Check:** `npx tsc --noEmit` passes
- [ ] **No God Functions:** No function > 50 lines (except orchestration)
- [ ] **No Orphaned Code:** All imports are used
- [ ] **Explicit Exports:** No `export *`
- [ ] **Pure Functions:** Calculations without DB are pure
- [ ] **Return Types:** All public functions have explicit return types
- [ ] **No Circular Deps:** `madge --circular` passes
- [ ] **Testable:** Can write a unit test for the core logic without DB

---

## Violation Escalation

| Violation | Action |
|-----------|--------|
| God module > 500 lines | Block PR, require split |
| Missing type exports | Block PR, add exports |
| Circular dependency | Block PR, refactor immediately |
| Orphaned imports | Auto-fix with lint --fix |
| Implicit any | Block PR, add explicit types |

---

## Remember

> **"Working code that can't be tested is broken."**
> 
> **"Refactoring later is a lie. Write it right the first time."**

This rule is non-negotiable. Quality is not an afterthought.
