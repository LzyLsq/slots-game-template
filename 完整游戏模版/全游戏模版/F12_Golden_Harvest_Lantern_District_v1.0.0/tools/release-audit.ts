import { existsSync, readFileSync, readdirSync } from 'node:fs';
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
const builtJson = (directory: string, stem: string): string => {
  const folder = resolve(root, directory);
  const matches = existsSync(folder) ? readdirSync(folder).filter((name) => new RegExp(`^${stem}(?:\\.[a-f0-9]+)?\\.json$`).test(name)) : [];
  return resolve(folder, matches.length === 1 ? matches[0] : '__missing_or_ambiguous__');
};
const builtMainConfig = builtJson('build/web-mobile/assets/main', 'config');
const builtSettings = builtJson('build/web-mobile/src', 'settings');
const fixedLegalBuildFiles = ['privacy.html', 'terms.html', 'support.html'].every((file) => existsSync(resolve(root, 'build/web-mobile', file)));
const generatedArt = [
  ...['lantern-district-lobby', 'lantern-district-login', 'granary-bank-cabinet', 'lantern-river-cabinet', 'jade-koi-cabinet', 'fortune-drum-cabinet'].map((name) => `assets/resources/art/${name}.png`),
  ...['granary', 'lantern', 'jade', 'drum'].flatMap((theme) => [
    `assets/resources/art/f12-${theme}-title-v3.png`,
    ...['primary', 'key'].map((kind) => `assets/resources/art/f12-${theme}-carved-${kind}-v2.png`),
  ]),
];
const generatedArtComplete = generatedArt.every((path) => existsSync(resolve(root, path)) && existsSync(resolve(root, `${path}.meta`)));
const featureRoutes = [
  "'bellhop-stacked-luggage') this.presentBellhopLuggageStage(result)",
  "'tea-vault-cascade') this.presentTeaVaultCascadeStage(result)",
  "'ballroom-key-path') this.presentBallroomKeyPathStage(result)",
  "'penthouse-lift') this.presentPenthouseLiftStage(result)",
];
const cabinetConsoles = ['addLuggageSuiteConsole', 'addTeaTrayConsole', 'addBallroomKeyConsole', 'addFortuneLiftConsole'];

add('Publisher identity and public legal URLs', !releaseConfig.includes('REPLACE_WITH_'), 'Set publisherLegalName, supportEmail and HTTPS legal URLs.');
add('App Store product identifiers', !store.includes('com.publisher.'), 'Replace all com.publisher.* product IDs with App Store Connect consumable IDs.');
add('Hosted legal documents finalized', !legal.includes('REPLACE_WITH_') && !legal.includes('Insert the publisher') && !legal.includes('Finalize '), 'Complete counsel-reviewed publisher, retention, territory and governing-law clauses.');
add('F12 scene, title and carved button art is complete', generatedArtComplete, 'Dedicated scene, cabinet, title and button images must ship with their Cocos meta files.');
add('Four distinct feature presentations are routed', featureRoutes.every((route) => app.includes(route)) && cabinetConsoles.every((consoleName) => app.includes(`private ${consoleName}(`)), 'Bellhop, tea cascade, ballroom key path and penthouse lift must each own a distinct presentation and cabinet console.');
add('Fixed cabinet design plane is preserved', app.includes('const W = 1080;') && app.includes('const H = 1920;') && app.includes('reelEngine.configure(this.selectedGame, layout.reelWidth, layout.reelHeight)') && app.includes('reelFrame.setPosition(layout.reelX, layout.reelY)'), 'Cabinet art, reel aperture and controls must share one 1080×1920 coordinate plane.');
add('F12 scene art is used by the live UI', ['lantern-district-lobby', 'lantern-district-login', 'granary-bank-cabinet', 'lantern-river-cabinet', 'jade-koi-cabinet', 'fortune-drum-cabinet'].every((name) => app.includes(`art/${name}`)), 'The runtime must reference the dedicated F12 lobby, login and four cabinet images.');
add('Win presentation has safe skip teardown', app.includes('presentAureliaWinStage(result)') && app.includes('Tween.stopAllByTarget(counter)') && app.includes('this.stopNodeTweens(root)') && app.includes('root.destroy()'), 'Skipping a win must show the final amount and remove every tween, dim layer and input blocker.');
add('Registration draft survives legal review', app.includes('registerDraft') && app.includes('EditBox.EventType.TEXT_CHANGED') && app.includes('captureDraft();'), 'Opening or accepting terms must not clear entered registration fields.');
add('Release cannot grant local coins', store.includes('if (!this.debugGrants') && app.includes("localDebugHost && query.get('debug') === '1'"), 'Local grants are restricted to localhost/debug and release defaults off.');
const verifyIndex = store.indexOf('await this.server.verifyApplePurchase(native.signedTransactionInfo)'); const finishIndex = store.indexOf('await bridge.finish(native.transactionId)', verifyIndex);
add('Server-verified StoreKit boundary', verifyIndex >= 0 && finishIndex > verifyIndex && store.includes('verified.creditedCredits !== amount') && store.includes('creditedPurchaseIds'), 'Server product, transaction, amount and idempotency checks must precede StoreKit finish.');
add('Apple signed transaction verification', server.includes('AppleSignedTransactionVerifier') && server.includes('CSW_APPLE_ROOT_CA_PATHS'), 'Production requires Apple roots, Bundle ID, environment and product map.');
add('Sign in with Apple is server verified', app.includes('SIGN IN WITH APPLE') && appleAuth.includes('__AURELIA_APPLE_AUTH__') && server.includes("'/api/auth/apple'") && appleIdentity.includes("raw.nonce !== expectedNonce") && schema.includes('apple_subject'), 'Native authorization must be verified for signature, issuer, audience, expiry and nonce before a session is created.');
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
const parsedBuild = JSON.parse(buildConfig);
add('Release build includes the launch scene', parsedBuild.startScene === 'e6f4e0a7-9acf-497a-b5f5-a7c4490d1802' && parsedBuild.scenes.some((scene: { uuid: string; url: string }) => scene.uuid === parsedBuild.startScene && scene.url === 'db://assets/scenes/LuckySkylightWorld.scene'), 'The configured entry UUID must resolve to the included launch scene; hashed engine assets are supported.');
add('Built web artifact is complete', existsSync(builtMainConfig) && existsSync(builtSettings) && readFileSync(builtSettings, 'utf8').includes('"launchScene":"db://assets/scenes/LuckySkylightWorld.scene"') && fixedLegalBuildFiles, 'Build web-mobile with the release config and verify the scene plus fixed privacy, terms and support URLs.');

const failures = checks.filter((check) => !check.ok);
for (const check of checks) process.stdout.write(`${check.ok ? 'PASS' : 'BLOCK'}  ${check.name}\n       ${check.detail}\n`);
process.stdout.write(`\n${checks.length - failures.length}/${checks.length} automated release checks passed.\n`);
if (failures.length) { process.stdout.write('Release remains blocked until every BLOCK item is resolved.\n'); process.exitCode = 1; }
