# June 24 Enterprise Security Specification

## 1. Data Invariants
1. **Catalog Integrity**: Every product document in `/catalog/{productId}` has a valid alphanumeric/underscore/hyphen ID (`<= 128` chars), a valid category (`footwear`, `cadet`, `ghana`, `clothing`), a non-negative numeric price, bounded string lengths, bounded `imageUrls` list (`<= 8` items), optional `hidden` boolean, optional `stockStatus` enum (`in_stock`, `out_of_stock`, `pre_order`), `ownerId == request.auth.uid`, and server timestamps (`createdAt == request.time`, `updatedAt == request.time`).
2. **Admin-Only Catalog Mutations**: Public storefront visitors can read `/catalog/{productId}`, but only verified store admins (`isAdmin()`) can create, update (including toggling `hidden` and `stockStatus`), or delete catalog items.
3. **PII Isolation on Orders**: `/orders/{orderId}` contains customer PII (`customerName`, `phone`, `address`) and optional bounded `itemsSummary` (`<= 500` chars). Creation allows either a verified signed-in user (`customerId == request.auth.uid`) or an unauthenticated guest checkout (`request.auth == null && customerId == 'guest'`). Reading an order (both `get` and `list`) is strictly restricted to `isAdmin()` or a signed-in user whose `customerId == request.auth.uid` (guests cannot read or list any order).
4. **Order State Locking**: Once an order reaches `delivered`, updates are blocked unless overridden by `isAdmin()`; customers cannot alter `totalAmount`, `customerId`, `itemsSummary`, or `createdAt`.
5. **No Self-Assigned Admin Roles**: `/admins/{userId}` is read-only for the owning user and non-writable by any client SDK to prevent privilege escalation.
6. **Newsletter Subscriber PII Isolation**: `/subscribers/{subscriberId}` validates email format, strict keys (`email`, `source`, `createdAt`), and server timestamp on creation, while isolating all `get` and `list` reads exclusively to verified admins (`isAdmin()`).
7. **Split-Collection Order Tracking**: `/orderTracking/{orderNumber}` stores only non-PII status metadata (`orderNumber`, `status`, `region`, `itemCount`, `createdAt`, `updatedAt`). Customers can look up a single order by exact `orderNumber` (`allow get`), while `allow list` is restricted strictly to `isAdmin()` to prevent order enumeration.
8. **Product Reviews Integrity**: `/reviews/{reviewId}` enforces integer ratings between `1` and `5`, bounded `author` (`2..80`), `comment` (`5..800`), optional `location` (`<= 80`), valid `productId`, immutable reviews after creation (`allow update: if false`), and admin-only moderation delete (`isAdmin()`).

## 2. Adversarial Test Payloads ("Dirty Dozen")
1. **Shadow Field Injection on Catalog Create**: `{ ..., "isVerified": true }` -> `PERMISSION_DENIED` (blocked by `keys().hasOnly`).
2. **Non-Admin Catalog Write**: Standard user attempts `setDoc(/catalog/prod_1, ...)` -> `PERMISSION_DENIED`.
3. **Unverified Admin Email Spoof**: User with `email_verified: false` claims admin email -> `PERMISSION_DENIED`.
4. **Path ID Poisoning**: Document ID `prod/../admin` or 200-char string -> `PERMISSION_DENIED` (`isValidId`).
5. **Invalid Category Enum**: `{ ..., "category": "weapons" }` -> `PERMISSION_DENIED`.
6. **Negative Price Injection**: `{ ..., "price": -50 }` -> `PERMISSION_DENIED`.
7. **Unbounded Image Array Bomb**: `{ ..., "imageUrls": [ ... 25 items ... ] }` -> `PERMISSION_DENIED`.
8. **Fake Client Timestamp**: `{ ..., "createdAt": "2020-01-01T00:00:00Z" }` -> `PERMISSION_DENIED` (`request.time`).
9. **Cross-User Order Read (PII Leak)**: User B or Guest calls `getDoc(/orders/order_userA)` or `getDocs(/orders)` -> `PERMISSION_DENIED`.
10. **Blanket Order List Scraping**: User B calls `getDocs(/orders)` without `where('customerId', '==', uid)` -> `PERMISSION_DENIED`.
11. **Order Identity Spoofing**: User A creates order with `customerId: "user_b"` or `customerId: "guest"` -> `PERMISSION_DENIED`; Guest tries `customerId: "user_a"` -> `PERMISSION_DENIED`.
12. **Self-Promotion to Admin**: User A calls `setDoc(/admins/userA, { uid: "userA" })` -> `PERMISSION_DENIED`.
13. **Subscriber Email Scraping (PII Leak)**: Non-admin calls `getDocs(/subscribers)` or `getDoc(/subscribers/sub_1)` -> `PERMISSION_DENIED`.
14. **Invalid Subscriber Email or Shadow Field**: `{ "email": "not-an-email", "role": "admin" }` -> `PERMISSION_DENIED`.
15. **Order Tracking Enumeration or Status Tampering**: Non-admin calls `getDocs(/orderTracking)` or creates tracking doc with `status: "delivered"` -> `PERMISSION_DENIED`.
16. **Out-of-Range Review Rating or Tampering**: Submitting `{ "rating": 99 }` or calling `updateDoc(/reviews/rev_1, ...)` -> `PERMISSION_DENIED`.
