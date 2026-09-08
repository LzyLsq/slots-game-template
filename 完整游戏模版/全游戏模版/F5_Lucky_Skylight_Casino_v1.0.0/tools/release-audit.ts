import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Check { readonly name: string; readonly ok: boolean; readonly detail: string; }
const root = resolve(import.meta.dirname, '..');
const read = (path: string): string => readFileSync(resolve(root, path), 'utf8');
const checks: Check[] = [];
const add = (name: string, ok: boolean, detail: string): void => { checks.push({ name, ok, detail }); };

const releaseConfig = read('assets/scripts/core/ReleaseConfig.ts');
const store = read('assets/scripts/services/StoreService.ts');
const app = read('assets/scripts/ui/SkylightApp.ts');
const bootstrap = read('assets/scripts/core/GameBootstrap.ts');
const api = read('assets/scripts/services/ProductionApiClient.ts');
const profile = read('assets/scripts/services/PlayerProfileService.ts');
const rank = read('assets/scripts/services/RankService.ts');
const mail = read('assets/scripts/services/MailService.ts');
const server = read('server/PostgresProductionServer.ts');
const schema = read('server/postgresql-schema.sql');
const appleAuth = read('assets/scripts/services/AppleSignInService.ts');
const appleIdentity = read('server/AppleIdentityTokenVerifier.ts');
const packageJson = read('package.json');
const legal = ['privacy.html', 'terms.html', 'support.html'].map((file) => read(`build-templates/web-mobile/${file}`)).join('\n');
const buildConfig = read('tools/web-mobile-release-build.json');
const builtMainConfig = resolve(root, 'build/web-mobile/assets/main/config.json');
const builtSettings = resolve(root, 'build/web-mobile/src/settings.json');
const fixedLegalBuildFiles = ['privacy.html', 'terms.html', 'support.html'].every((file) => existsSync(resolve(root, 'build/web-mobile', file)));

add('Publisher identity and public legal URLs', !releaseConfig.includes('REPLACE_WITH_'), 'Set publisherLegalName, supportEmail and HTTPS legal URLs.');
add('App Store product identifiers', !store.includes('com.publisher.'), 'Replace all com.publisher.* product IDs with App Store Connect consumable IDs.');
add('Hosted legal documents finalized', !legal.includes('REPLACE_WITH_') && !legal.includes('Insert the publisher') && !legal.includes('Finalize '), 'Complete counsel-reviewed publisher, retention, territory and governing-law clauses.');
add('Release cannot grant local coins', store.includes('if (!this.debugGrants') && app.includes("localDebugHost && query.get('debug') === '1'"), 'Local grants are restricted to localhost/debug and release defaults off.');
const verifyIndex = store.indexOf('await this.server.verifyApplePurchase(native.signedTransactionInfo)'); const finishIndex = store.indexOf('await bridge.finish(native.transactionId)', verifyIndex);
add('Server-verified StoreKit boundary', verifyIndex >= 0 && finishIndex > verifyIndex && store.includes('verified.creditedCredits !== amount') && store.includes('creditedPurchaseIds'), 'Server product, transaction, amount and idempotency checks must precede StoreKit finish.');
add('Apple signed transaction verification', server.includes('AppleSignedTransactionVerifier') && server.includes('CSW_APPLE_ROOT_CA_PATHS'), 'Production requires Apple roots, Bundle ID, environment and product map.');
add('Sign in with Apple is server verified', app.includes('CONTINUE WITH APPLE') && appleAuth.includes('__LUCKY_SKYLIGHT_APPLE_AUTH__') && server.includes("'/api/auth/apple'") && appleIdentity.includes("raw.nonce !== expectedNonce") && schema.includes('apple_subject'), 'Native authorization must be verified for signature, issuer, audience, expiry and nonce before a session is created.');
add('Persistent wallet and idempotency schema', schema.includes('CREATE TABLE purchase_receipts') && schema.includes('UNIQUE (platform, external_transaction_id)') && schema.includes('UNIQUE (account_id, request_id)') && schema.includes('CREATE TABLE sessions'), 'PostgreSQL stores sessions, wallets, rounds, receipts and notification IDs.');
add('Refunded transactions cannot be replayed', server.includes("existing.rows[0].status !== 'credited'") && server.includes("['REFUND', 'REVOKE']") && schema.includes('revoked_at'), 'Refund and revoke notifications close the receipt before any replay can deliver coins.');
add('Production service is explicit', packageJson.includes('server:production') && packageJson.includes('PostgresProductionServer.ts'), 'Deployment uses the PostgreSQL service, not the in-memory development server.');
add('Remote account and authoritative rounds wired', bootstrap.includes('RemoteAuthService') && app.includes('this.bootstrap.api.spin') && app.includes("api.claimReward(kind, id)"), 'Release login, rounds and rewards use the authenticated production API.');
add('Remote rank and profile wired', api.includes('leaderboard(') && api.includes('updateProfile(') && rank.includes('this.api.leaderboard') && profile.includes('this.server.updateProfile'), 'Leaderboard and player customization no longer depend on release-local simulation.');
add('Baseline API throttling', server.includes('consumeRateLimit') && server.includes('json(response, 429') && server.includes("'Retry-After'"), 'Process-level rate limits protect authentication, spins and purchases; edge WAF remains required.');
add('Release UI has no simulation claims', !/local demo|local simulations|refreshed locally|add demo/i.test(`${app}\n${mail}`), 'Player-facing release copy must not present fake local purchases, mail or rankings.');
add('Account deletion available', app.includes('DELETE ACCOUNT & DATA') && server.includes('deleteAccount('), 'In-app re-authenticated deletion and server pseudonymization path exist.');
add('Privacy, terms and support in app', app.includes("showLegal('privacy')") && app.includes("showLegal('terms')") && app.includes("showLegal('support')"), 'All legal/support pages are reachable before and after sign-in.');
add('Eligibility gate versioned', app.includes('showAgeGate') && releaseConfig.includes('TERMS_VERSION') && releaseConfig.includes('PRIVACY_VERSION'), 'Policy changes require eligibility confirmation again.');
add('Release build includes the launch scene', buildConfig.includes('"md5Cache": false') && buildConfig.includes('db://assets/scenes/LuckySkylightWorld.scene') && buildConfig.includes('e6f4e0a7-9acf-497a-b5f5-a7c4490d1802'), 'The checked-in build configuration must retain the launch scene and stable public filenames.');
add('Built web artifact is complete', existsSync(builtMainConfig) && existsSync(builtSettings) && readFileSync(builtSettings, 'utf8').includes('"launchScene":"db://assets/scenes/LuckySkylightWorld.scene"') && fixedLegalBuildFiles, 'Build web-mobile with the release config and verify the scene plus fixed privacy, terms and support URLs.');

const failures = checks.filter((check) => !check.ok);
for (const check of checks) process.stdout.write(`${check.ok ? 'PASS' : 'BLOCK'}  ${check.name}\n       ${check.detail}\n`);
process.stdout.write(`\n${checks.length - failures.length}/${checks.length} automated release checks passed.\n`);
if (failures.length) { process.stdout.write('Release remains blocked until every BLOCK item is resolved.\n'); process.exitCode = 1; }
