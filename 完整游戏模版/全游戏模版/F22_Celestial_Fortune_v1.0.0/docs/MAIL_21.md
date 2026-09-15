# F22 mailbox and account polish 21

- Reading letters, claiming attachments, and clearing read mail preserve the underlying page. Update the unread badge in place instead of rerendering the entire page.
- Mail list entries have staggered reveals and a small unread seal.
- Successful individual and bulk claims use the existing coin-arrival animation and balance counter. Service settlement stays authoritative and repeat-safe; remote rewards remain unavailable without their event server.
- Choosing the already-selected avatar closes the selector without redundant persistence or rebuilding the account page.

Typecheck and web-mobile build passed. Real-pointer tests at 320px, 430px, and reduced-motion 390px verify unchanged root identity during mail operations, unread count 3→2, individual plus bulk attachment rewards totaling exactly 8000 despite repeat claims, clearing claimed letters, and selecting the current avatar. All passed without page errors. Mail list and letter screenshots inspected at 320px. Evidence: screenshots/mail-21.json and *-21.png. No physical-device performance claim.
