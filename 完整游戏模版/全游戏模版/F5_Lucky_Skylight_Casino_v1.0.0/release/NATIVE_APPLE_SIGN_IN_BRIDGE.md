# Sign in with Apple bridge contract

The Cocos layer exposes the **Continue with Apple** entry but never fabricates an Apple account. During iOS export, enable the **Sign in with Apple** capability and expose `globalThis.__LUCKY_SKYLIGHT_APPLE_AUTH__` matching `LuckySkylightAppleAuthBridge` in `assets/scripts/services/AppleSignInService.ts`.

## `isAvailable()`

Return `true` only when `ASAuthorizationAppleIDProvider` is supported and the app has the correct entitlement. A web preview or an unsigned build must return `false`.

## `authorize(rawNonce)`

1. Create `ASAuthorizationAppleIDRequest` and request `.fullName` and `.email`.
2. Set `request.nonce` to the lowercase SHA-256 hex digest of the supplied `rawNonce`.
3. Present `ASAuthorizationController` from the active scene.
4. Return `status: "authorized"`, UTF-8 `identityToken`, UTF-8 `authorizationCode`, `credential.user`, and name/email when Apple supplies them.
5. Map `ASAuthorizationError.canceled` to `status: "cancelled"`. Do not log tokens, authorization codes, relay email, nonce, or user identifiers.

The TypeScript client sends the identity token and raw nonce to `/api/auth/apple`. `AppleIdentityTokenVerifier` verifies Apple's rotating JWKS signature, issuer, Bundle ID audience, issue/expiry time and nonce before a session is created. The native name is treated only as an initial display-name suggestion; account identity comes exclusively from the verified `sub` claim.

## `credentialState(userIdentifier)`

Call `ASAuthorizationAppleIDProvider.getCredentialState(forUserID:)` and map the result to `authorized`, `revoked`, `not-found`, or `transferred`. Check it on native foreground/resume and clear the local game session when Apple reports revoked or not-found. Handle Apple's user-transfer workflow before shipping an app transfer.

## Native button and review checks

- The canvas entry invokes the native authorization controller. For the final Xcode target, place Apple's `ASAuthorizationAppleIDButton` over the matching canvas hit area if the review target requires the official Apple logo treatment.
- Test first authorization, repeat authorization (name/email absent), cancellation, revoked credential, Hide My Email, network loss, server rejection, account deletion, reinstall and device change.
- Provide an App Review account for password login as a fallback; Apple reviewers must not be blocked by an unavailable test identity.
