import { cpSync, existsSync, mkdtempSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Simulator-only generation. Does not request signing, provisioning or accounts.
const root = resolve(import.meta.dirname, '..');
const editor = process.env.COCOS_CREATOR || '/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator';
const cmake = resolve(editor, '../../Resources/tools/cmake/bin/cmake');
const args = new Set(process.argv.slice(2));
if ([...args].some(arg => !['--compile', '--skip-generate'].includes(arg))) {
  throw new Error('Usage: node tools/build-ios.mjs [--compile] [--skip-generate]');
}
function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
// Creator skips a platform folder once present. Populate its stock files without
// overwriting checked-in project hooks, bridges or existing native custom work.
const templates = resolve(editor, '../../Resources/resources/3d/engine/templates');
for (const platform of ['common', 'ios']) {
  cpSync(join(templates, platform), join(root, 'native/engine', platform), { recursive: true, force: false, errorOnExist: false });
}
if (!args.has('--skip-generate')) {
  const backup = mkdtempSync(join(tmpdir(), 'f28-ios-cache-'));
  for (const name of ['library', 'temp']) {
    const path = join(root, name);
    if (existsSync(path)) renameSync(path, join(backup, name));
  }
  console.log(`Previous generated caches preserved at ${backup}`);
  const result = spawnSync(editor, ['--project', root, '--build', `configPath=${root}/tools/ios-simulator-build.json`], { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0 && result.status !== 36) process.exit(result.status || 1);
}
if (!existsSync(join(root, 'build/ios-simulator/proj/cfg.cmake'))) {
  throw new Error('Generate native assets before using --skip-generate.');
}
run(cmake, ['-S', 'native/engine/ios', '-B', 'build/ios-simulator/proj', '-GXcode',
  '-DCMAKE_SYSTEM_NAME=iOS', '-DCMAKE_OSX_SYSROOT=iphonesimulator',
  '-DCMAKE_OSX_ARCHITECTURES=arm64', '-DCMAKE_XCODE_ATTRIBUTE_CODE_SIGNING_ALLOWED=NO',
  '-DCMAKE_XCODE_ATTRIBUTE_CODE_SIGNING_REQUIRED=NO']);
if (args.has('--compile')) {
  run('xcodebuild', ['-project', 'build/ios-simulator/proj/f28-treasure-regatta.xcodeproj',
    '-scheme', 'f28-treasure-regatta-mobile', '-configuration', 'Debug', '-sdk', 'iphonesimulator',
    '-destination', 'generic/platform=iOS Simulator', '-derivedDataPath', 'build/ios-simulator/DerivedData',
    'ARCHS=arm64', 'EXCLUDED_ARCHS=', 'VALID_ARCHS=arm64', 'CODE_SIGNING_ALLOWED=NO',
    'CODE_SIGNING_REQUIRED=NO', 'CODE_SIGN_IDENTITY=', '-jobs', '4', 'build']);
}
console.log('Simulator project configured. See docs/NATIVE_BUILD.md for verification scope and install steps.');
