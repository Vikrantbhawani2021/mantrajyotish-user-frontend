Deposit Component - Test Steps (manual)

1) Preparation
- Ensure backend endpoints are running and configured with Razorpay TEST keys.
- Ensure frontend is running and user is logged in (auth token in `localStorage.authToken`).

2) Create order and open checkout
- Open the Deposit UI that uses `DepositComponent`.
- Click the deposit button to create an order. Verify in browser Network tab that `POST /api/razorpay/order` returns `{ success: true, data: { order, keyId } }`.
- Confirm `order.id` and `order.amount` are returned (amount in paise).

3) Complete payment (test)
- In Checkout, use card number `4111 1111 1111 1111`, expiry `12/30`, CVV `123`.
- Submit payment. Checkout should call the `handler` with razorpay ids.

4) Verify
- Verify request: `POST /api/razorpay/verify` should be sent with `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` and Authorization header.
- Server should verify signature and respond `{ success: true, data: { addedAmount, ... } }`.

5) Post-verification
- Frontend should display a success toast with `addedAmount` when provided, refresh balance via `GET /api/wallet/balance` and redirect to `/wallet` shortly.
- Check `/wallet` to confirm the balance and transaction history updated.

6) Failure cases
- If `verify` fails, frontend should show an error toast and allow retry via the Retry Verify debug button (dev mode) or by repeating Checkout.
- If Checkout shows "International cards not supported", either enable international cards in the Razorpay Dashboard or use domestic/test card.

7) Idempotency
- Repeat the same `razorpay_payment_id` verify call: frontend should not credit twice because it stores processed payment ids locally.

8) Logs to capture for troubleshooting
- `POST /api/razorpay/order` response JSON
- `POST /api/razorpay/verify` response JSON
- `GET /api/wallet/balance` response before/after
- Browser console errors and Network traces
