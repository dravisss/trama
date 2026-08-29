# Public release readiness

This checklist tracks the first public GitHub release. Publishing or pushing remains a separate,
explicit action.

## Completed locally

- [x] MIT license and package metadata.
- [x] One anonymous public example: Sobrecarga de Filas.
- [x] Example contains a map and canonical Presentation V2; no `model.story` is persisted.
- [x] Customer databases and `data/*.db` are not tracked.
- [x] Private Kumu research corpus removed from the public tree.
- [x] Internal prototypes, screenshots and generated design artifacts preserved on
  `codex/internal-pre-public` and removed from the public tree.
- [x] Local server binds to loopback by default.
- [x] Mutating browser requests enforce same-origin checks.
- [x] JSON requests have a configurable size limit.
- [x] Database paths are restricted to `data/` unless explicitly overridden.
- [x] README, contribution, support and security guidance.
- [x] GitHub Actions CI for clean install, tests and build.

## Required before the first public tag

- [ ] Create the GitHub repository and replace the README clone placeholder.
- [ ] Run CI on GitHub and enable branch protection.
- [ ] Confirm a clean clone can run `npm ci`, `npm run check` and `npm run serve`.
- [ ] Review the final staged file inventory and secret scan.
- [ ] Create the first changelog entry and tag only after explicit approval.

## Distribution decision

LoopViewer is published as a clonable application, not as an npm package. `private: true` is
intentional. The reusable browser bundle is generated locally in `dist/`.
