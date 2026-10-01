# Restore point — Maro UI refinement, 1 October 2026

- Name/tag: `pre-ui-system-refinement-2026-10-01` (annotated, retained permanently).
- Original branch: `recovery/maro-v1-20260930`.
- Original production/source commit: `fdb52d737ba7a2ab91a46fc61d7cb2509601bba2`.
- Exact working-state backup commit: `0dc627753c0062caa16f79192826c8028511c2ed`.
- Refinement branch: `ui/system-refinement-20261001`.
- Checkout: `C:/Users/nicep/Desktop/maro-al/maro-v1-recovery-20260930`.

The source was unchanged at the original commit. Nothing was staged. The existing untracked launch documentation and launch/theme verification fixtures were committed intact to the backup commit before UI edits. The tag includes those files. Ignored dependencies, build output and private environment files remain in place; they are never added to Git. The older `maro-al`, MCP and Paddle checkouts were inspected but not modified.

## Production and environment at entry

Railway project `cb4c8dcc-712d-459d-b01c-96ae9ad29814`, production environment `46f492bd-a88b-4b68-aa5a-455a2707ca10`, **web service** `4f5a55b0-dc24-4d6e-8d20-669b8d6ecf3d`. The recorded successful web deployment is `30dafcaf-fbe7-44a0-928c-c2e3bb871169`, with the original commit above. It uses Railpack, Node 22, pnpm 11.0.8, `pnpm start`, health check `/`, and `railway.toml`. The recorded source branch is `recovery/maro-v1-20260930`. The reconciliation service is separate and is not a target of UI work.

Relevant recorded flags: `PUBLIC_LAUNCH_MODE=live`, `NEXT_PUBLIC_SIGNUP_ENABLED=true`, `NEXT_PUBLIC_PADDLE_ENABLED=false`, `APP_ORIGIN=https://maro.al`. Existing Qelt/Mshelt theme storage and bootstrap are retained. No secret values are documented here. The initial direct metadata request returned HTTP 403. The already installed Railway CLI subsequently confirmed the live successful deployment and exact source SHA above. The baseline build initially encountered sandbox `spawn EPERM` and was rerun with compiler-worker permission; see the validation record for its result.

## Deterministic rollback

Preserve any work made since the refinement in its own branch/commit first. Recover the exact pre-refinement files in a separate checkout without resetting or cleaning an existing checkout:

```powershell
Set-Location 'C:\Users\nicep\Desktop\maro-al\maro-v1-recovery-20260930'
git worktree add --detach '..\maro-pre-ui-system-refinement-20261001' pre-ui-system-refinement-2026-10-01
```

The resulting checkout is the backup commit above. Use the existing production build environment (private variables are managed in Railway), validate it, then deploy it with the existing Railway CLI workflow, specifying the project, production environment and **web** service IDs above. Alternatively use Railway's rollback/redeploy of the original successful web deployment after checking it is still available. Do not deploy the reconciliation service or run migrations.

To undo the UI on the existing production branch while retaining history, run `git revert ui-system-refinement-2026-10-01` (the final UI release tag identified in `docs/UI_REFINEMENT_VALIDATION.md`), then build and deploy that revert. Do not revert the backup commit: it only preserves pre-existing evidence. Do not use `git reset --hard` or `git clean` on a checkout with subsequent work.

A portable Git bundle of the restore tag is retained at `../ui-refinement-20261001/pre-ui-system-refinement.bundle`. If the repository is unavailable, run `git clone <bundle-path> maro-restore`, then check out the tag. Deployment also requires the existing environment configuration; the bundle deliberately contains no environment secrets.
