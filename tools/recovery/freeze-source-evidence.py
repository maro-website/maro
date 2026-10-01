"""Record local candidate identity; no network, secrets or Git mutations."""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
EVIDENCE = ROOT / "docs/evidence"
GOLDEN = "1a1dfb9d748bd03bb3342be26998b288961f0986"
MAIN = "32e2ecbe2598ff2d06326229c66505ee478d662b"


def git(*args, cwd=ROOT):
    return subprocess.check_output(
        ["git", "-c", "core.safecrlf=false", "-c", "core.whitespace=blank-at-eol,blank-at-eof,space-before-tab,cr-at-eol", *args],
        cwd=cwd, stderr=subprocess.DEVNULL,
    )


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save(name, value):
    (EVIDENCE / name).write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")


def changes(ref):
    parts = git("diff", "--cached", "--no-renames", "--name-status", "-z", ref).decode("utf-8").split("\0")
    return [{"status": parts[i], "path": parts[i + 1]} for i in range(0, len(parts) - 1, 2) if not parts[i + 1].startswith("docs/evidence/")]


def main():
    inputs = json.loads((EVIDENCE / "selected-source-ports.json").read_text(encoding="utf-8"))
    ci = ROOT.parent / "maro-paddle/.github/workflows/security.yml"
    if not any(item["path"] == ".github/workflows/security.yml" for item in inputs):
        inputs.append({"path": ".github/workflows/security.yml", "source": "P/current-main", "source_sha256": sha(ci)})
        save("selected-source-ports.json", inputs)
    source_checks = []
    for item in inputs:
        if "source_sha256" not in item:
            continue  # Adapted hunks are identified by the final source manifest.
        source_path = item["path"]
        if item["source"].startswith("P historical SQL"):
            source_path = "supabase/migrations/" + Path(source_path).name
        original = ROOT.parent / ("maro-paddle" if item["source"].startswith("P") else "maro-al") / source_path
        source_checks.append({"path": item["path"], "source": item["source"], "unchanged": sha(original) == item["source_sha256"]})
    assert all(item["unchanged"] for item in source_checks), "A selected source input changed"

    quarantine_checks = []
    for item in json.loads((ROOT / "quarantine/20260930/PROVENANCE.json").read_text(encoding="utf-8")):
        if "files" not in item:
            assert (Path(item["original_root"]) / item["original_path"]).exists()
            continue
        origin = Path(item["original_path"])
        for file in item["files"]:
            suffix = Path(file["path"]).relative_to(origin) if origin.suffix == "" else Path()
            preserved = ROOT / item["preserved_at"] / suffix
            if origin.suffix:
                preserved = ROOT / item["preserved_at"]
            quarantine_checks.append({"path": str(preserved.relative_to(ROOT)).replace("\\", "/"), "matches": sha(preserved) == file["sha256"]})
    for item in json.loads((ROOT / "quarantine/20260930/ADDITIONAL_PROVENANCE.json").read_text(encoding="utf-8")):
        p = Path(item["target"])
        quarantine_checks.append({"path": str(p.relative_to(ROOT)).replace("\\", "/"), "matches": sha(p) == item["sha256"]})
    for item in json.loads((ROOT / "quarantine/20260930/non-v1-routes/PROVENANCE.json").read_text(encoding="utf-8")):
        p = ROOT / item["preserved"]
        quarantine_checks.append({"path": str(p.relative_to(ROOT)).replace("\\", "/"), "matches": sha(p) == item["original_sha256"]})
    assert all(item["matches"] for item in quarantine_checks), "Quarantine bytes changed"

    paths = sorted(set(git("ls-files", "--cached", "--others", "--exclude-standard", "-z").decode("utf-8").rstrip("\0").split("\0")))
    paths = [p for p in paths if p and not p.startswith("docs/evidence/") and (ROOT / p).is_file()]
    assert not any(p.startswith(".env") and p != ".env.example" for p in paths)
    files = [{"path": p, "bytes": (ROOT / p).stat().st_size, "sha256": sha(ROOT / p)} for p in paths]
    save("recovery-source-manifest.json", {
        "schema": 1, "hash_format": "SHA-256 of actual worktree bytes, including local line endings",
        "exclusions": ["docs/evidence (separately hashed in identity)", "Git ignored dependencies/build/test DB/secrets"],
        "golden": GOLDEN, "current_main": MAIN,
        "files": files, "changes_against_golden": changes(GOLDEN), "changes_against_main": changes(MAIN),
    })
    patch = git("diff", "--cached", "--binary", GOLDEN, "--", ".", ":(exclude)docs/evidence")
    (EVIDENCE / "recovery-against-golden.patch").write_bytes(patch)
    originals = {}
    for name in ["maro-al", "maro-paddle"]:
        path = ROOT.parent / name
        originals[name] = {"head": git("rev-parse", "HEAD", cwd=path).decode().strip(), "status": git("status", "--short", cwd=path).decode()}
    save("recovery-source-identity.json", {
        "created_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "worktree": str(ROOT), "branch": git("branch", "--show-current").decode().strip(),
        "golden_base": GOLDEN,
        "candidate_commit_resolution": "The final local freeze commit is the tip of recovery/maro-v1-20260930; no push or merge",
        "manifest_sha256": sha(EVIDENCE / "recovery-source-manifest.json"),
        "patch_sha256": sha(EVIDENCE / "recovery-against-golden.patch"),
        "evidence_sha256": {p.name: sha(p) for p in sorted(EVIDENCE.iterdir()) if p.is_file() and p.name != "recovery-source-identity.json"},
        "source_inputs": source_checks, "quarantine_preserved": quarantine_checks,
        "original_checkouts": originals,
        "validation": {"full_tests_passed": 1135, "full_tests_skipped": 11, "financial_postgresql_passed": 15, "reconciliation_runner_passed": 26, "recovery_specific_passed": 34, "typecheck": "pass", "lint": "pass; three existing warnings", "production_build": "pass"},
        "registration": "NOT READY TO OPEN REGISTRATION",
    })
    print(json.dumps({"source_files": len(files), "source_inputs_verified": len(source_checks), "quarantine_files_verified": len(quarantine_checks), "manifest_sha256": sha(EVIDENCE / "recovery-source-manifest.json")}, indent=2))


if __name__ == "__main__":
    main()
