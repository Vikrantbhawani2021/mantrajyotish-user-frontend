Deposit Component

Overview

This folder contains a reusable React component for Razorpay wallet top-ups called `DepositComponent`.

Files

- `src/components/DepositComponent.jsx` — reusable component that:
  - Calls `POST /api/razorpay/order` with `{ amount, appointmentId? }` (amount in rupees)
  - Loads the Razorpay Checkout script dynamically
  - Opens Checkout using `keyId` and `order.id` returned by the server
  - On success, calls `POST /api/razorpay/verify` with `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` (Authorization header is added by `apiFetch` from localStorage token)
  - Shows unobtrusive toasts for success/failure and handles idempotency by saving processed payment ids to `localStorage.processed_payments`

Usage

1. Render the component where needed:

```jsx
import DepositComponent from "../components/DepositComponent";

// Add money (simple)
<DepositComponent amount={500} />

// Appointment payment
<DepositComponent amount={300} appointmentId={"604..."} />

// With success callback
<DepositComponent amount={100} onSuccess={(data)=> console.log('verify', data)} />
```

Notes & Requirements

- The backend must implement the required endpoints:
  - `POST /api/razorpay/order` — request JSON: `{ amount, appointmentId? }` (amount in rupees). Return `{ success: true, data: { order, keyId } }` where `order` is the Razorpay order object (contains `id`, `amount` in paise, etc.) and `keyId` is `rzp_test_...` or `rzp_live_...`.
  - `POST /api/razorpay/verify` — request JSON: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`. Verify signature server-side, persist payment, credit wallet, and return `{ success: true, data: { addedAmount, ... } }`.
  - `GET /api/wallet/balance` — used by client to refresh balance after verify.

- The frontend reads the auth token from `localStorage.authToken` and `apiFetch` will include `Authorization: Bearer <token>` automatically. Ensure users are authenticated or backend can accept `userId` in body when unauthenticated.

Security

- Do not send `key_secret` to client — server should send only `keyId`.
- Client must not compute final credited amount locally — rely on `verify` response and `/api/wallet/balance`.

Testing (Manual)

1. Use Razorpay test keys on the server (keyId starting with `rzp_test_`).
2. Use test card `4111 1111 1111 1111`, expiry any future date, CVV `123`.
3. Use `DepositComponent` to create order and complete Checkout. Verify server `verify` returns `success` and `addedAmount`.

Contact

If you need the backend example code for order/verify (Node + razorpay package), ask and I can provide a minimal Express handler.
