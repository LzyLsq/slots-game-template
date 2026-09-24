# F30 · Clockwork Fortune

Cocos Creator 3.8.8 project. Four mechanical treasury cabinets use distinct reel rules and artwork. Open the project in Cocos Creator or preview a local `web-mobile` build with `python3 tools/preview_server.py --port 6030`.

## Final visual review · 2026-09-24

The screenshots below come from the rebuilt project at 390 × 844 and 320 × 568. They are local desktop browser captures, not iPhone device captures.

| Screen | 390 × 844 | 320 × 568 |
|---|---|---|
| Hall | [Hall](docs/screenshots/final-20260924/390-home.png) | [Small hall](docs/screenshots/final-20260924/320-home.png) |
| Pendulum Vault | [Cabinet](docs/screenshots/final-20260924/390-golden-hour.png) | [Small cabinet](docs/screenshots/final-20260924/320-golden-hour.png) |
| Coin Press | [Cabinet](docs/screenshots/final-20260924/390-jade-treasury.png) | [Small cabinet](docs/screenshots/final-20260924/320-jade-treasury.png) |
| Hourglass Hoard | [Cabinet](docs/screenshots/final-20260924/390-pearl-palace.png) | [Small cabinet](docs/screenshots/final-20260924/320-pearl-palace.png) |
| Crown Gears | [Cabinet](docs/screenshots/final-20260924/390-ruby-revel.png) | [Small cabinet](docs/screenshots/final-20260924/320-ruby-revel.png) |

[Super award review](docs/screenshots/final-20260924/390-super-award.png). This is a controlled debug path; real awards use the settled result.

## Verification and release boundary

Run `npm run typecheck`, `npm run test:layout`, `npm run test:primary`, and `npm test` from this directory. The current preview build was produced with `tools/web-mobile-release-build.json`. The Cocos CLI printed `Finished` but returned exit code 36 and a worker SIGTERM diagnostic, so the build should be rechecked in the editor before release. Screenshots and automated desktop checks do not establish iOS device performance, production sign-in/payment readiness, asset rights, or App Store approval.
