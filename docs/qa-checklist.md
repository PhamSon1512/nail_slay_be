# Nailslay — Manual QA Checklist

Use after deploying audit remediation changes to staging/production.

## Storefront

- [ ] Guest add-to-cart from product grid and PDP; quantity capped by stock
- [ ] Login merges guest cart; toast when items dropped (out of stock / inactive)
- [ ] Cart totals match checkout (no VAT line; subtotal only)
- [ ] Checkout: pick saved address or add new; idempotent double-submit creates one order
- [ ] Checkout success page loads bank/QR from API after refresh (`?orderId=`)
- [ ] Variant product: select color/size, add to cart, checkout deducts variant stock
- [ ] Orders list shows error + retry on API failure
- [ ] Order detail shows not-found UI for invalid id
- [ ] Logout clears session (Navbar + admin Topbar)

## Admin

- [ ] Product create/edit: slug/SKU conflict → 409 message in UI
- [ ] Product with variants: parent stock = sum of variant stock
- [ ] Hidden/draft products not buyable
- [ ] Order flow: PENDING_PAYMENT → PAID → DELIVERED; user RECEIVED / COMPLAINED
- [ ] Complaint resolve respects status machine
- [ ] Category image remove via clear + save
- [ ] QR payment required fields validated
- [ ] Demo order not shown in production admin orders list

## Security smoke

- [ ] Non-admin JWT on `/admin/*` → 403
- [ ] Demoted admin (role=user in DB) → 403 with existing token
- [ ] CORS from unknown origin blocked (no credentialed reflection)
- [ ] Refresh token: invalid cookie cannot obtain new access token

## Performance

- [ ] Public settings/categories served from KV cache (second request faster)
- [ ] No SQL query logs in production worker logs
