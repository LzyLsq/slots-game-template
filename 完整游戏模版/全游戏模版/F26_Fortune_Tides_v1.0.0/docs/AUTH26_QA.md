# Login completion — 2026-09-20

- Added usage terms and local-data privacy notices in all five languages. These describe the current build, not a completed production legal policy. Operator/contact details remain unconfigured.
- Registration, device login and guest entry require an unchecked-by-default reading confirmation. Returning from a notice preserves the form; language changes preserve typed inputs in memory only.
- Password and confirmation fields each have accessible show/hide controls.
- Added an explicitly unavailable Apple sign-in information entry; it does not request credentials or create a pretend session.
- Renamed the nonfunctional password-recovery promise to Account help. Existing device-account recovery limitations are stated clearly.
- Added no-cash-value information and moved language/consent content within the illustrated parchment; small screens scroll.

Validation: 48 unit tests passed. Browser checks covered 20 layouts (login/register × 5 languages × 320/390), four notice dialogs, unchecked consent rejection, registration/login/guest success, password visibility and language-change field retention. No browser errors. Actual screenshots inspected, including Japanese registration at 320px. Build and bundled iOS web synchronization completed.

Not validated: iPhone hardware, Apple game-account session integration, production password recovery, legal publication approval or App Store acceptance.
