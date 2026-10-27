"""Boundary regressions in disposable trees; no network, signing or TV access."""
from pathlib import Path
from unittest.mock import patch
import copy
import importlib.util
import json
import os
import shutil
import subprocess
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "tools" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CHECK = load("check_repository")
PACK = load("package_unsigned")


class RepositoryToolTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="tizen-tools-")
        self.root = Path(self.temporary.name)
        (self.root / "app").mkdir()
        for name in (*PACK.RUNTIME, "EXPORT-MANIFEST.json"):
            shutil.copy2(ROOT / "app" / name, self.root / "app" / name)

    def tearDown(self):
        self.temporary.cleanup()

    def package(self):
        with patch.object(PACK, "ROOT", self.root):
            return PACK.package()

    def test_runtime_archive_is_exact_and_repeatable(self):
        first = self.package()
        second = self.package()
        self.assertEqual(first["sha256"], second["sha256"])
        with zipfile.ZipFile(self.root / first["archive"]) as archive:
            self.assertEqual(archive.namelist(), list(PACK.RUNTIME))
            for name in PACK.RUNTIME:
                self.assertEqual(archive.read(name), (ROOT / "app" / name).read_bytes())

    def test_staged_hardlink_cannot_overwrite_another_source(self):
        stage = self.root / "build/runtime"
        stage.mkdir(parents=True)
        victim = self.root / "original-note.txt"
        victim.write_text("preserve original")
        os.link(victim, stage / "index.html")
        with self.assertRaisesRegex(ValueError, "one link"):
            self.package()
        self.assertEqual(victim.read_text(), "preserve original")

    def test_archive_hardlink_is_refused_before_runtime_writes(self):
        build = self.root / "build"
        build.mkdir()
        victim = self.root / "original-note.txt"
        victim.write_text("preserve original")
        version = json.loads((self.root / "app/EXPORT-MANIFEST.json").read_text())["exportVersion"]
        os.link(victim, build / f"kino-doma-{version}-unsigned.wgt")
        with self.assertRaisesRegex(ValueError, "one link"):
            self.package()
        self.assertEqual(victim.read_text(), "preserve original")
        self.assertEqual(list((build / "runtime").iterdir()), [])

    def test_extra_staging_content_is_not_silently_shipped(self):
        extra = self.root / "build/runtime/nested/not-runtime.txt"
        extra.parent.mkdir(parents=True)
        extra.write_text("fixture only")
        with self.assertRaisesRegex(ValueError, "extra files"):
            self.package()

    def test_dangling_public_symlink_is_seen_and_rejected(self):
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        link = self.root / "000-dangling.txt"
        link.symlink_to("missing-target")
        subprocess.run(["git", "-C", str(self.root), "add", "000-dangling.txt"], check=True)
        with patch.object(CHECK, "ROOT", self.root):
            self.assertIn("000-dangling.txt", CHECK.public_files())
            with self.assertRaisesRegex(ValueError, "Symlink"):
                CHECK.main()

    def test_closed_profile_rejects_new_fields_and_changed_constants(self):
        schema = json.loads((ROOT / "tv/schemas/public-evidence.schema.json").read_text())
        profile = json.loads((ROOT / "tv/profiles/qe75q64dauxxn-tizen9-2123.9.json").read_text())
        CHECK.validate_profile(profile, schema)
        extra = dict(profile, unverified_capability=True)
        with self.assertRaisesRegex(ValueError, "Extra property"):
            CHECK.validate_profile(extra, schema)
        changed = copy.deepcopy(profile)
        changed["device"]["model"] = "unverified-model"
        with self.assertRaisesRegex(ValueError, "constant mismatch"):
            CHECK.validate_profile(changed, schema)

    def test_native_manifest_cannot_substitute_a_different_valid_file(self):
        import hashlib
        original = self.root / "runtime.js"
        other = self.root / "README.md"
        original.write_text("original runtime fixture")
        other.write_text("different valid fixture")
        manifest = self.root / "fingerprint.sha256"
        manifest.write_text(hashlib.sha256(other.read_bytes()).hexdigest() + "  README.md\n")
        with self.assertRaisesRegex(ValueError, "file set"):
            CHECK.check_hash_manifest(manifest, self.root, {"runtime.js"})

    def test_dependency_lock_rejects_private_registry_urls(self):
        entry = {"resolved": "https://registry.npmjs.org/example/-/example-1.0.0.tgz",
                 "integrity": "sha512-" + "A" * 86 + "=="}
        CHECK.check_package_registry({"packages": {"example": entry}})
        entry["resolved"] = "https://npm.internal.invalid/example.tgz"
        with self.assertRaisesRegex(ValueError, "public npm"):
            CHECK.check_package_registry({"packages": {"example": entry}})

    def test_dependency_lock_requires_integrity_and_no_credentials(self):
        entry = {"resolved": "https://registry.npmjs.org/example/-/example-1.0.0.tgz"}
        with self.assertRaisesRegex(ValueError, "integrity"):
            CHECK.check_package_registry({"packages": {"example": entry}})
        entry["integrity"] = "sha512-" + "A" * 86 + "=="
        entry["resolved"] = "https://fixture-user:fixture-password@registry.npmjs.org/example.tgz"
        with self.assertRaisesRegex(ValueError, "credentials"):
            CHECK.check_package_registry({"packages": {"example": entry}})


class GitIndexPublicationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="tizen-index-")
        self.root = Path(self.temporary.name)
        self.git("init", "-q")
        # Deliberately assembled at runtime: this is never a real credential.
        self.synthetic_token = "ghp" + "_" + "A" * 36

    def tearDown(self):
        self.temporary.cleanup()

    def git(self, *arguments, input=None):
        return subprocess.run(["git", *arguments], cwd=self.root, input=input,
                              check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    def stage_text(self, text, name="public-note.txt"):
        path = self.root / name
        path.write_text(text)
        self.git("add", "--", name)
        return path

    def test_main_rejects_staged_secret_after_worktree_is_cleaned(self):
        path = self.stage_text("synthetic fixture: " + self.synthetic_token)
        path.write_text("clean replacement, not yet restaged")
        with patch.object(CHECK, "ROOT", self.root):
            with self.assertRaisesRegex(ValueError, "GitHub credential.*Git index") as failure:
                CHECK.main()
        self.assertNotIn(self.synthetic_token, str(failure.exception))

    def test_staged_secret_is_scanned_when_missing_from_worktree(self):
        path = self.stage_text("synthetic fixture: " + self.synthetic_token)
        path.unlink()
        with patch.object(CHECK, "ROOT", self.root):
            self.assertNotIn(path.name, CHECK.public_files())
            with self.assertRaisesRegex(ValueError, "GitHub credential.*Git index") as failure:
                CHECK.check_index_publication()
        self.assertNotIn(self.synthetic_token, str(failure.exception))

    def test_main_still_checks_unstaged_worktree_content(self):
        path = self.stage_text("clean staged content")
        path.write_text("synthetic fixture: " + self.synthetic_token)
        with patch.object(CHECK, "ROOT", self.root):
            self.assertEqual(CHECK.check_index_publication(), 1)
            with self.assertRaisesRegex(ValueError, "GitHub credential.*Working tree") as failure:
                CHECK.main()
        self.assertNotIn(self.synthetic_token, str(failure.exception))

    def test_clean_index_allows_benign_unstaged_edits(self):
        path = self.stage_text("clean staged content")
        path.write_text("ordinary unstaged development change")
        with patch.object(CHECK, "ROOT", self.root):
            self.assertEqual(CHECK.check_index_publication(), 1)
            self.assertIn(path.name, CHECK.public_files())

    def test_staged_symlink_is_rejected_after_regular_worktree_replacement(self):
        path = self.root / "public-note.txt"
        path.symlink_to("missing-target")
        self.git("add", "--", path.name)
        path.unlink()
        path.write_text("regular worktree replacement")
        with patch.object(CHECK, "ROOT", self.root):
            with self.assertRaisesRegex(ValueError, "Symlink/non-file.*Git index"):
                CHECK.check_index_publication()

    def test_unmerged_index_is_rejected(self):
        path = self.stage_text("clean staged content")
        object_id = self.git("rev-parse", ":" + path.name).stdout.decode().strip()
        self.git("update-index", "--force-remove", "--", path.name)
        records = "".join(f"100644 {object_id} {stage}\t{path.name}\n" for stage in (1, 2))
        self.git("update-index", "--index-info", input=records.encode())
        with patch.object(CHECK, "ROOT", self.root):
            with self.assertRaisesRegex(ValueError, "Unmerged Git index"):
                CHECK.check_index_publication()

    def test_control_character_index_path_is_rejected_without_echoing_it(self):
        path = self.stage_text("clean staged content", "line\nbreak.txt")
        with patch.object(CHECK, "ROOT", self.root):
            with self.assertRaisesRegex(ValueError, "Unsafe public path.*Git index") as failure:
                CHECK.check_index_publication()
        self.assertNotIn(path.name, str(failure.exception))

    def test_path_contract_rejects_nonportable_or_escaping_names(self):
        for name in ("../outside", "/absolute", "a/../outside", "a//b", "a/./b", "a\\b", "C:/outside"):
            with self.subTest(name=name), self.assertRaisesRegex(ValueError, "Unsafe public path"):
                CHECK.check_public_path(name, "Git index")


class EvidenceProfileTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="tizen-evidence-")
        self.root = Path(self.temporary.name)
        for profile, schema, _ in CHECK.EVIDENCE_PROFILES:
            for name in (profile, schema):
                target = self.root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(ROOT / name, target)

    def tearDown(self):
        self.temporary.cleanup()

    def check(self):
        with patch.object(CHECK, "ROOT", self.root):
            return CHECK.check_evidence_profiles()

    def read(self, name):
        return json.loads((self.root / name).read_text())

    def write(self, name, value):
        (self.root / name).write_text(json.dumps(value))

    def test_both_registered_model_profiles_are_validated(self):
        self.assertEqual(self.check(), ["QE75Q64DAUXXN", "QE75Q74DATXXN"])

    def test_unknown_profile_cannot_be_silently_skipped(self):
        (self.root / "tv/profiles/unreviewed-model.json").write_text("{}")
        with self.assertRaisesRegex(ValueError, "file set.*tv/profiles"):
            self.check()

    def test_unknown_schema_cannot_be_silently_skipped(self):
        (self.root / "tv/schemas/unreviewed.schema.json").write_text("{}")
        with self.assertRaisesRegex(ValueError, "file set.*tv/schemas"):
            self.check()

    def test_each_registered_pair_member_is_required(self):
        for profile, schema, _ in CHECK.EVIDENCE_PROFILES:
            for name in (profile, schema):
                with self.subTest(name=name):
                    path = self.root / name
                    original = path.read_bytes()
                    path.unlink()
                    try:
                        with self.assertRaisesRegex(ValueError, "file set"):
                            self.check()
                    finally:
                        path.write_bytes(original)

    def test_evidence_symlink_is_rejected_even_when_target_is_valid(self):
        profile, _, _ = CHECK.EVIDENCE_PROFILES[1]
        path = self.root / profile
        original = self.root / "valid-profile.json"
        path.rename(original)
        path.symlink_to(original)
        with self.assertRaisesRegex(ValueError, "Unsafe evidence entry"):
            self.check()

    def test_profiles_cannot_be_validated_against_the_other_model_schema(self):
        first, second = (pair[1] for pair in CHECK.EVIDENCE_PROFILES)
        left, right = self.read(first), self.read(second)
        self.write(first, right)
        self.write(second, left)
        with self.assertRaisesRegex(ValueError, "Required property|Extra property|constant mismatch"):
            self.check()

    def test_second_profile_rejects_an_unverified_speedup_claim(self):
        profile, _, _ = CHECK.EVIDENCE_PROFILES[1]
        value = self.read(profile)
        value["performance"]["measured_speedup_claimed"] = True
        self.write(profile, value)
        with self.assertRaisesRegex(ValueError, "constant mismatch.*measured_speedup_claimed"):
            self.check()

    def test_second_profile_rejects_extra_nested_fields(self):
        profile, _, _ = CHECK.EVIDENCE_PROFILES[1]
        value = self.read(profile)
        value["device"]["unreviewed_capability"] = True
        self.write(profile, value)
        with self.assertRaisesRegex(ValueError, "Extra property.*device"):
            self.check()

    def test_identity_is_bound_to_the_pair_even_if_schema_and_profile_change(self):
        profile, schema, _ = CHECK.EVIDENCE_PROFILES[1]
        value, definition = self.read(profile), self.read(schema)
        value["device"]["model"] = "unreviewed-model"
        definition["properties"]["device"]["properties"]["model"]["const"] = "unreviewed-model"
        self.write(profile, value)
        self.write(schema, definition)
        with self.assertRaisesRegex(ValueError, "identity differs"):
            self.check()

    def test_both_schemas_must_remain_closed_at_every_level(self):
        for _, schema, _ in CHECK.EVIDENCE_PROFILES:
            original = self.read(schema)
            variants = []
            opened_root = copy.deepcopy(original)
            opened_root["additionalProperties"] = True
            variants.append(opened_root)
            opened_device = copy.deepcopy(original)
            opened_device["properties"]["device"].pop("additionalProperties")
            variants.append(opened_device)
            optional_identity = copy.deepcopy(original)
            optional_identity["properties"]["device"]["required"].remove("model")
            variants.append(optional_identity)
            unconstrained_scalar = copy.deepcopy(original)
            unconstrained_scalar["properties"]["device"]["properties"]["model"].pop("const")
            variants.append(unconstrained_scalar)
            opened_array = copy.deepcopy(original)
            opened_array["properties"]["verified_changes"]["items"] = True
            variants.append(opened_array)
            for index, value in enumerate(variants):
                with self.subTest(schema=schema, variant=index):
                    self.write(schema, value)
                    try:
                        with self.assertRaisesRegex(ValueError, "Evidence object|Evidence array|Evidence scalar"):
                            self.check()
                    finally:
                        self.write(schema, original)


class GitIndexEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="tizen-index-evidence-")
        self.root = Path(self.temporary.name)
        self.git("init", "-q")
        self.names = [name for profile, schema, _ in CHECK.EVIDENCE_PROFILES
                      for name in (profile, schema)]
        for name in self.names:
            target = self.root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / name, target)
        self.git("add", "--", *self.names)

    def tearDown(self):
        self.temporary.cleanup()

    def git(self, *arguments):
        return subprocess.run(["git", *arguments], cwd=self.root, check=True,
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    def check_worktree(self):
        with patch.object(CHECK, "ROOT", self.root):
            return CHECK.check_evidence_profiles()

    def check_index(self):
        with patch.object(CHECK, "ROOT", self.root):
            return CHECK.check_index_publication(require_evidence=True)

    def test_clean_registered_pairs_validate_from_actual_index_blobs(self):
        self.assertEqual(self.check_index(), len(self.names))
        self.assertEqual(self.check_worktree(), ["QE75Q64DAUXXN", "QE75Q74DATXXN"])

    def test_staged_unknown_profile_deleted_from_worktree_is_rejected(self):
        name = "tv/profiles/unreviewed-model.json"
        path = self.root / name
        path.write_text("{}")
        self.git("add", "--", name)
        path.unlink()
        self.check_worktree()
        with self.assertRaisesRegex(ValueError, "file set.*Git index"):
            self.check_index()

    def test_staged_unknown_schema_deleted_from_worktree_is_rejected(self):
        name = "tv/schemas/unreviewed.schema.json"
        path = self.root / name
        path.write_text("{}")
        self.git("add", "--", name)
        path.unlink()
        self.check_worktree()
        with self.assertRaisesRegex(ValueError, "file set.*Git index"):
            self.check_index()

    def test_staged_profile_change_is_checked_after_clean_worktree_restore(self):
        name = CHECK.EVIDENCE_PROFILES[1][0]
        path = self.root / name
        original = path.read_bytes()
        value = json.loads(original)
        value["performance"]["measured_speedup_claimed"] = True
        path.write_text(json.dumps(value))
        self.git("add", "--", name)
        path.write_bytes(original)
        self.check_worktree()
        with self.assertRaisesRegex(ValueError, "constant mismatch.*Git index.*measured_speedup_claimed"):
            self.check_index()

    def test_staged_schema_weakening_is_checked_after_clean_worktree_restore(self):
        name = CHECK.EVIDENCE_PROFILES[1][1]
        path = self.root / name
        original = path.read_bytes()
        value = json.loads(original)
        value["properties"]["device"]["additionalProperties"] = True
        path.write_text(json.dumps(value))
        self.git("add", "--", name)
        path.write_bytes(original)
        self.check_worktree()
        with self.assertRaisesRegex(ValueError, "Evidence object.*Git index.*device"):
            self.check_index()

    def test_each_index_pair_member_is_required_despite_complete_worktree(self):
        for name in self.names:
            with self.subTest(name=name):
                self.git("update-index", "--force-remove", "--", name)
                try:
                    self.check_worktree()
                    with self.assertRaisesRegex(ValueError, "file set.*Git index"):
                        self.check_index()
                finally:
                    self.git("add", "--", name)

    def test_main_rejects_all_evidence_removed_only_from_index(self):
        self.git("update-index", "--force-remove", "--", *self.names)
        self.check_worktree()
        with patch.object(CHECK, "ROOT", self.root):
            with self.assertRaisesRegex(ValueError, "file set.*Git index"):
                CHECK.main()

    def test_staged_pair_identity_cannot_change_with_a_matching_schema(self):
        profile, schema, _ = CHECK.EVIDENCE_PROFILES[1]
        paths = [self.root / name for name in (profile, schema)]
        original = [path.read_bytes() for path in paths]
        value, definition = (json.loads(content) for content in original)
        value["device"]["model"] = "unreviewed-model"
        definition["properties"]["device"]["properties"]["model"]["const"] = "unreviewed-model"
        for path, data in zip(paths, (value, definition)):
            path.write_text(json.dumps(data))
        self.git("add", "--", profile, schema)
        for path, content in zip(paths, original):
            path.write_bytes(content)
        self.check_worktree()
        with self.assertRaisesRegex(ValueError, "identity differs.*Git index"):
            self.check_index()

    def test_number_type_accepts_numbers_and_rejects_non_numeric_values(self):
        CHECK.check_exact_evidence_schema({"type": "number", "const": 1.5})
        for value in (1, 1.5):
            CHECK.validate_profile(value, {"type": "number"})
        for value in (True, False, None, "1.5", []):
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, "Schema type mismatch"):
                CHECK.validate_profile(value, {"type": "number"})


if __name__ == "__main__":
    unittest.main()
