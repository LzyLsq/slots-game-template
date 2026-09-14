import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Check { readonly name: string; readonly ok: boolean; readonly detail: string; }
const root = resolve(import.meta.dirname, '..');
const read = (path: string): string => readFileSync(resolve(root, path), 'utf8');
const checks: Check[] = [];
const add = (name: string, ok: boolean, detail: string): void => { checks.push({ name, ok, detail }); };

const releaseConfig = read('assets/scripts/core/ReleaseConfig.ts');
const store = read('assets/scripts/services/StoreService.ts');
const app = read('assets/scripts/ui/AureliaApp.ts');
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
const gameIds = ['golden-hour','jade-treasury','pearl-palace','ruby-revel'];
const generatedArt = ['salon','symbols','symbols-blur','interfaces','optics','portraits','apple-mark','canopy-brand','canopy-hall-soft','canopy-services','canopy-destinations',
 ...Array.from({length:16},(_,i)=>'canopy-button-'+i),
 ...Array.from({length:4},(_,i)=>'canopy-title-'+i),
 ...Array.from({length:4},(_,i)=>'canopy-frame-'+i),
 ...Array.from({length:4},(_,i)=>'canopy-soft-plate-'+i),
 ...gameIds.flatMap(id=>[id+'-tall','symbols-'+id,'symbols-'+id+'-blur','prize-'+id])].map(name=>`assets/resources/art/${name}.png`);
const generatedArtComplete = generatedArt.every((path) => existsSync(resolve(root, path)) && existsSync(resolve(root, `${path}.meta`)));
const geometry=read('assets/scripts/ui/CabinetGeometry.ts');
const winStage=read('assets/scripts/vfx/SalonWinStage.ts');
const resultGenerator=read('assets/scripts/math/ResultGenerator.ts');

add('Publisher identity and public legal URLs', !releaseConfig.includes('REPLACE_WITH_'), 'Set publisherLegalName, supportEmail and HTTPS legal URLs.');
add('App Store product identifiers', !store.includes('com.publisher.'), 'Replace all com.publisher.* product IDs with App Store Connect consumable IDs.');
add('Hosted legal documents finalized', !legal.includes('REPLACE_WITH_') && !legal.includes('Insert the publisher') && !legal.includes('Finalize '), 'Complete counsel-reviewed publisher, retention, territory and governing-law clauses.');
add('F20 artwork set is complete', generatedArtComplete, 'Integrated cabinets and shared bitmap atlases require their Cocos meta files.');
add('Four feature models are present', ['golden-hour','jade-respin','pearl-expansion','ruby-cascade'].every(id=>resultGenerator.includes(id)), 'Feature behavior is additionally exercised by npm test; this static check is not visual acceptance.');
add('Shared cabinet design plane is preserved', app.includes('Cabinet-coordinate-plane') && app.includes('cabinetLayout(') && geometry.includes('1024') && geometry.includes('2304'), 'Art, reels and controls use measured coordinates on one uniformly scaled plane; test:layout checks bounds.');
add('Win presentation has reveal and teardown', winStage.includes('private reveal()') && winStage.includes('protected onDestroy()') && app.includes('SalonWinStage'), 'Browser QA must also verify celebration dismissal and input recovery.');
add('Registration uses an independent draft', app.includes('this.draft.username') && app.includes('EditBox.EventType.TEXT_CHANGED') && app.includes('this.draft.acceptedTerms=!this.draft.acceptedTerms'), 'Browser QA must verify that legal review and acceptance retain typed fields.');
add('Release cannot grant local coins', store.includes('if (!this.debugGrants') && app.includes("['localhost','127.0.0.1']") && app.includes("query.get('debug')==='1'"), 'Local grants are restricted to localhost/debug and release defaults off.');
const verifyIndex = store.indexOf('await this.server.verifyApplePurchase(native.signedTransactionInfo)'); const finishIndex = store.indexOf('await bridge.finish(native.transactionId)', verifyIndex);
add('Server-verified StoreKit boundary', verifyIndex >= 0 && finishIndex > verifyIndex && store.includes('verified.creditedCredits !== amount') && store.includes('creditedPurchaseIds'), 'Server product, transaction, amount and idempotency checks must precede StoreKit finish.');
add('Apple signed transaction verification', server.includes('AppleSignedTransactionVerifier') && server.includes('CSW_APPLE_ROOT_CA_PATHS'), 'Production requires Apple roots, Bundle ID, environment and product map.');
add('Sign in with Apple is server verified', app.includes('Sign in with Apple') && appleAuth.includes('__AURELIA_APPLE_AUTH__') && server.includes("'/api/auth/apple'") && appleIdentity.includes("raw.nonce !== expectedNonce") && schema.includes('apple_subject'), 'Native authorization must be verified for signature, issuer, audience, expiry and nonce before a session is created.');
add('Persistent wallet and idempotency schema', schema.includes('CREATE TABLE purchase_receipts') && schema.includes('UNIQUE (platform, external_transaction_id)') && schema.includes('UNIQUE (account_id, request_id)') && schema.includes('CREATE TABLE sessions'), 'PostgreSQL stores sessions, wallets, rounds, receipts and notification IDs.');
add('Refunded transactions cannot be replayed', server.includes("existing.rows[0].status !== 'credited'") && server.includes("['REFUND', 'REVOKE']") && schema.includes('revoked_at'), 'Refund and revoke notifications close the receipt before any replay can deliver coins.');
add('Production service is explicit', packageJson.includes('server:production') && packageJson.includes('PostgresProductionServer.ts'), 'Deployment uses the PostgreSQL service, not the in-memory development server.');
add('Remote account and authoritative rounds wired', bootstrap.includes('RemoteAuthService') && app.includes('await api.spin(') && app.includes('api.claimReward(kind)'), 'Release login, rounds and rewards use the authenticated production API.');
add('Remote rank and profile wired', api.includes('leaderboard(') && api.includes('updateProfile(') && rank.includes('this.api.leaderboard') && profile.includes('this.server.updateProfile'), 'Leaderboard and player customization no longer depend on release-local simulation.');
add('Baseline API throttling', server.includes('consumeRateLimit') && server.includes('json(response, 429') && server.includes("'Retry-After'"), 'Process-level rate limits protect authentication, spins and purchases; edge WAF remains required.');
add('Release UI has no simulation claims', !/local demo|local simulations|refreshed locally|add demo/i.test(`${app}\n${mail}`), 'Player-facing release copy must not present fake local purchases, mail or rankings.');
add('Account deletion available', app.includes('Delete account & data') && server.includes('deleteAccount('), 'In-app re-authenticated deletion and server pseudonymization path exist.');
add('Privacy, terms and support in app', app.includes("['terms','privacy','support']") && app.includes('private legal('), 'Legal/support links must remain reachable on the authentication screen.');
add('Eligibility gate versioned', app.includes('guestConsent()') && app.includes('complianceCurrent(') && releaseConfig.includes('TERMS_VERSION') && releaseConfig.includes('PRIVACY_VERSION'), 'Policy changes require eligibility confirmation again.');
add('Release build includes the launch scene', buildConfig.includes('"md5Cache": false') && buildConfig.includes('db://assets/scenes/GildedExpress.scene') && buildConfig.includes('e6f4e0a7-9acf-497a-b5f5-a7c4490d1802'), 'The checked-in build configuration must retain the launch scene and stable public filenames.');
add('Built web artifact is complete', existsSync(builtMainConfig) && existsSync(builtSettings) && readFileSync(builtSettings, 'utf8').includes('"launchScene":"db://assets/scenes/GildedExpress.scene"') && fixedLegalBuildFiles, 'Build web-mobile with the release config and verify the scene plus fixed privacy, terms and support URLs.');

const failures = checks.filter((check) => !check.ok);
for (const check of checks) process.stdout.write(`${check.ok ? 'PASS' : 'BLOCK'}  ${check.name}\n       ${check.detail}\n`);
process.stdout.write(`\n${checks.length - failures.length}/${checks.length} automated release checks passed.\n`);
if (failures.length) { process.stdout.write('Release remains blocked until every BLOCK item is resolved.\n'); process.exitCode = 1; }
