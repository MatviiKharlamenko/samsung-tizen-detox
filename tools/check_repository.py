"""Offline checks for public documentation, frozen evidence and publication hygiene.

This is a focused safeguard, not a general secret scanner or JSON Schema engine.
It never opens ignored private research/signing files or contacts a television.
"""
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit
import hashlib
import ipaddress
import json
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
NATIVE_026_FILES = (
    "index.html", "styles.css", "core.js", "collaps-bridge.js",
    "catalog-client.js", "catalog-ui.js", "adapters.js", "app.js",
    "icon.svg", "icon.png", "config.xml",
)
EVIDENCE_PROFILES = (
    ("tv/profiles/qe75q64dauxxn-tizen9-2123.9.json",
     "tv/schemas/public-evidence.schema.json", "QE75Q64DAUXXN"),
    ("tv/profiles/qe75q74datxxn-tizen9-2123.9.json",
     "tv/schemas/q74d-evidence.schema.json", "QE75Q74DATXXN"),
)
SCHEMA_KEYWORDS = {
    "$schema", "title", "description", "type", "const", "properties",
    "required", "additionalProperties", "prefixItems", "items", "minItems", "maxItems",
}
CYRILLIC = re.compile(r"[\u0400-\u04ff]")
FORBIDDEN_SUFFIXES = {".wgt", ".p12", ".pfx", ".pem", ".key", ".crt", ".cer", ".db", ".sqlite", ".log", ".pcap", ".zip"}
SECRET_PATTERNS = {
    "personal filesystem path": re.compile(r"/Users/[A-Za-z0-9._ -]+/|C:\\Users\\[A-Za-z0-9._ -]+\\"),
    "private key material": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "GitHub credential": re.compile(r"(?:gh[opusr]_[A-Za-z0-9]{24,}|github_pat_[A-Za-z0-9_]{30,})"),
    "MAC address": re.compile(r"(?i)(?:[0-9a-f]{2}:){5}[0-9a-f]{2}"),
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def check_public_path(name, origin):
    """Reject unsafe Git paths before filesystem access, without echoing them."""
    valid = (isinstance(name, str) and bool(name) and not name.startswith("/")
             and "\\" not in name and ":" not in name
             and all(ord(char) >= 32 and ord(char) != 127 for char in name)
             and all(part not in {"", ".", ".."} for part in name.split("/")))
    require(valid and PurePosixPath(name).as_posix() == name,
            f"Unsafe public path in {origin}")
    for label, pattern in SECRET_PATTERNS.items():
        require(not pattern.search(name), f"Potential {label} in a {origin} filename; inspect locally")


def check_public_blob(name, content, origin):
    """Apply the same publication policy to working files and indexed blobs."""
    check_public_path(name, origin)
    suffix = PurePosixPath(name).suffix.lower()
    require(suffix not in FORBIDDEN_SUFFIXES and ".private" not in name
            and not name.startswith(("work/", "private/", "backups/")),
            f"Private artifact in {origin}: {name}")
    require(not CYRILLIC.search(name) and ".ru." not in name,
            f"Non-English documentation filename in {origin}: {name}")
    if name in {"app/icon.png", "evidence/native-0.2.6/runtime/icon.png"}:
        return None
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise ValueError(f"Non-UTF-8 public text in {origin}: {name}") from None
    if suffix in {".md", ".yml", ".yaml", ".json"}:
        require(not CYRILLIC.search(text), f"Non-English repository prose in {origin}: {name}")
    if name == "package-lock.json":
        check_package_registry(json.loads(text))
    for label, pattern in SECRET_PATTERNS.items():
        require(not pattern.search(text),
                f"Potential {label} in {origin}: {name}; inspect locally without quoting values")
    for candidate in re.findall(r"(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w.])", text):
        try:
            address = ipaddress.ip_address(candidate)
        except ValueError:
            continue
        require(not address.is_private or candidate in {"127.0.0.1", "0.0.0.0"},
                f"Private network address in {origin}: {name}")
    return text


def check_index_publication(require_evidence=False):
    """Read the actual index objects, including paths absent from the worktree."""
    result = subprocess.run(
        ["git", "ls-files", "--cached", "--stage", "-z"],
        cwd=ROOT, check=True, stdout=subprocess.PIPE,
    )
    seen = set()
    blobs = {}
    evidence = {}
    for record in result.stdout.split(b"\0"):
        if not record:
            continue
        metadata, separator, raw_name = record.partition(b"\t")
        require(bool(separator), "Malformed Git index entry")
        fields = metadata.split()
        require(len(fields) == 3, "Malformed Git index metadata")
        mode, object_id, stage = fields
        require(stage == b"0", "Unmerged Git index; resolve it before publication checks")
        require(mode in {b"100644", b"100755"}, "Symlink/non-file entry in Git index")
        require(re.fullmatch(rb"(?:[a-f0-9]{40}|[a-f0-9]{64})", object_id) is not None,
                "Malformed Git index object identity")
        try:
            name = raw_name.decode("utf-8")
        except UnicodeDecodeError:
            raise ValueError("Non-UTF-8 path in Git index") from None
        check_public_path(name, "Git index")
        require(name not in seen, "Duplicate Git index path")
        seen.add(name)
        if object_id not in blobs:
            blob = subprocess.run(
                ["git", "cat-file", "blob", object_id.decode("ascii")],
                cwd=ROOT, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            )
            blobs[object_id] = blob.stdout
        check_public_blob(name, blobs[object_id], "Git index")
        if name.startswith(("tv/profiles/", "tv/schemas/")):
            evidence[name] = blobs[object_id]
    if evidence or require_evidence:
        check_evidence_documents(evidence, "Git index")
    return len(seen)


def public_files():
    result = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=ROOT, check=True, stdout=subprocess.PIPE,
    )
    try:
        names = result.stdout.decode("utf-8").split("\0")
    except UnicodeDecodeError:
        raise ValueError("Non-UTF-8 path in Working tree candidates") from None
    files = set()
    for name in names:
        if name:
            check_public_path(name, "Working tree")
            # Missing tracked paths are still checked independently from the index.
            if (ROOT / name).exists() or (ROOT / name).is_symlink():
                files.add(name)
    return sorted(files)


def check_hash_manifest(path, base, expected_names=None):
    names = set()
    for line in path.read_text().splitlines():
        digest, name = line.split("  ", 1)
        require(name not in names and re.fullmatch(r"[a-f0-9]{64}", digest), "Invalid or duplicate hash manifest entry")
        names.add(name)
        target = base / name
        require(not Path(name).is_absolute() and ".." not in Path(name).parts and not target.is_symlink(), "Unsafe manifest path")
        require(target.is_file() and hashlib.sha256(target.read_bytes()).hexdigest() == digest, f"Hash mismatch: {name}")
    if expected_names is not None:
        require(names == set(expected_names), "Hash manifest file set differs from the required runtime set")
    return len(names)


def check_package_registry(lock):
    """Public development dependencies must not depend on a private npm mirror."""
    for entry in lock["packages"].values():
        if "resolved" not in entry:
            continue
        url = urlsplit(entry["resolved"])
        require(url.scheme == "https" and url.hostname == "registry.npmjs.org"
                and not url.username and not url.password and url.port in (None, 443)
                and not url.query and not url.fragment,
                "Dependency lock must use public npm tarballs without credentials")
        require(isinstance(entry.get("integrity"), str)
                and re.fullmatch(r"sha512-[A-Za-z0-9+/]+=*", entry["integrity"]),
                "Dependency lock must pin SHA-512 integrity")


def anchors(text):
    result = set(re.findall(r'<a\s+(?:id|name)=["\']([^"\']+)["\']', text))
    counts = {}
    fenced = False
    for line in text.splitlines():
        if line.lstrip().startswith(("```", "~~~")):
            fenced = not fenced
        if fenced:
            continue
        match = re.match(r"^#{1,6}\s+(.+?)\s*#*\s*$", line)
        if match:
            slug = re.sub(r"[^\w\- ]", "", match.group(1).lower()).replace(" ", "-")
            count = counts.get(slug, 0)
            result.add(slug + (f"-{count}" if count else ""))
            counts[slug] = count + 1
    return result


def validate_profile(value, schema, location="profile"):
    """Validate every keyword used by this repository's deliberately closed schema."""
    if isinstance(schema, bool):
        require(schema, f"Disallowed schema item: {location}")
        return
    require(not set(schema) - SCHEMA_KEYWORDS, f"Unsupported schema keyword at {location}")
    types = {"object": dict, "array": list, "string": str, "integer": int, "boolean": bool, "null": type(None)}
    if "type" in schema:
        kind = schema["type"]
        valid = type(value) in (int, float) if kind == "number" else type(value) is types.get(kind)
        require(valid, f"Schema type mismatch: {location}")
    if "const" in schema:
        expected = schema["const"]
        require(value == expected and (not isinstance(value, bool) or type(expected) is bool), f"Schema constant mismatch: {location}")
    if isinstance(value, dict):
        properties = schema.get("properties", {})
        require(set(schema.get("required", [])) <= set(value), f"Required property missing: {location}")
        if schema.get("additionalProperties") is False:
            require(set(value) <= set(properties), f"Extra property: {location}")
        for name, child in value.items():
            if name in properties:
                validate_profile(child, properties[name], f"{location}.{name}")
    if isinstance(value, list):
        require(len(value) >= schema.get("minItems", 0) and len(value) <= schema.get("maxItems", float("inf")), f"Array size mismatch: {location}")
        prefix = schema.get("prefixItems", [])
        for index, child in enumerate(value):
            subschema = prefix[index] if index < len(prefix) else schema.get("items", True)
            validate_profile(child, subschema, f"{location}[{index}]")


def check_exact_evidence_schema(schema, location="schema"):
    """Evidence snapshots must remain closed at every object, array and scalar."""
    require(type(schema) is dict and not set(schema) - SCHEMA_KEYWORDS,
            f"Unsupported evidence schema at {location}")
    kind = schema.get("type")
    if kind == "object":
        properties = schema.get("properties")
        required = schema.get("required")
        require(type(properties) is dict and type(required) is list
                and len(required) == len(set(required))
                and set(required) == set(properties)
                and schema.get("additionalProperties") is False,
                f"Evidence object must declare exactly its required properties: {location}")
        for name, child in properties.items():
            check_exact_evidence_schema(child, f"{location}.{name}")
    elif kind == "array":
        prefix = schema.get("prefixItems")
        require(type(prefix) is list and type(schema.get("minItems")) is int
                and schema["minItems"] == schema.get("maxItems") == len(prefix)
                and schema.get("items") is False,
                f"Evidence array must declare its exact item set: {location}")
        for index, child in enumerate(prefix):
            check_exact_evidence_schema(child, f"{location}[{index}]")
    else:
        require(kind in {"string", "integer", "number", "boolean", "null"} and "const" in schema,
                f"Evidence scalar must declare its type and constant: {location}")
        validate_profile(schema["const"], schema, location)


def check_evidence_profiles():
    """Validate only reviewed model/schema pairs; new evidence requires registration."""
    documents = {}
    for folder, expected in (
        ("tv/profiles", {profile for profile, _, _ in EVIDENCE_PROFILES}),
        ("tv/schemas", {schema for _, schema, _ in EVIDENCE_PROFILES}),
    ):
        directory = ROOT / folder
        require(directory.is_dir() and not directory.is_symlink(),
                f"Missing or unsafe evidence directory: {folder}")
        found = set()
        for path in directory.rglob("*"):
            require(path.is_file() and not path.is_symlink(),
                    f"Unsafe evidence entry in {folder}")
            found.add(path.relative_to(ROOT).as_posix())
        require(found == expected, f"Evidence file set differs from registered pairs: {folder}")
        documents.update({name: (ROOT / name).read_bytes() for name in found})
    return check_evidence_documents(documents, "Working tree")


def check_evidence_documents(documents, origin):
    """Apply the same exact pair contract to filesystem bytes and actual index blobs."""
    expected = {name for profile, schema, _ in EVIDENCE_PROFILES for name in (profile, schema)}
    require(set(documents) == expected,
            f"Evidence file set differs from registered pairs in {origin}")
    models = []
    for profile_name, schema_name, model in EVIDENCE_PROFILES:
        schema = json.loads(documents[schema_name])
        profile = json.loads(documents[profile_name])
        check_exact_evidence_schema(schema, f"{origin}:{schema_name}")
        validate_profile(profile, schema, f"{origin}:{profile_name}")
        require(profile["device"]["model"] == model
                and profile["device"]["os_version"] == "9.0"
                and profile["device"]["firmware_version"] == "2123.9",
                f"Evidence identity differs from its registered pair in {origin}: {profile_name}")
        models.append(model)
    return models


def main():
    files = public_files()
    markdown = {}
    for name in files:
        path = ROOT / name
        require(not path.is_symlink() and path.is_file(), f"Symlink/non-file in public tree: {name}")
        text = check_public_blob(name, path.read_bytes(), "Working tree")
        if path.suffix.lower() == ".md":
            markdown[name] = text
    index_files = check_index_publication(require_evidence=True)
    links = 0
    for name, text in markdown.items():
        for target in re.findall(r"\[[^\]]*\]\(([^)\s]+)\)", text):
            if re.match(r"^[a-zA-Z]+:", target):
                continue
            relative, _, fragment = unquote(target).partition("#")
            destination = ((ROOT / name).parent / relative).resolve() if relative else ROOT / name
            require(destination.is_relative_to(ROOT) and destination.exists(), f"Broken local link in {name}: {target}")
            if fragment:
                require(destination.suffix == ".md" and fragment in anchors(destination.read_text()), f"Broken local anchor in {name}: {target}")
            links += 1
    subprocess.run([sys.executable, str(ROOT / "app/validate_export.py")], check=True, cwd=ROOT)
    tv_hashes = check_hash_manifest(ROOT / "tv/MANIFEST.sha256", ROOT / "tv")
    tv_files = {p.relative_to(ROOT / "tv").as_posix() for p in (ROOT / "tv").rglob("*") if p.is_file()}
    tv_names = {line.split("  ", 1)[1] for line in (ROOT / "tv/MANIFEST.sha256").read_text().splitlines()}
    require(tv_files == tv_names | {"MANIFEST.sha256"}, "TV file set differs from its manifest")
    native_prefix = "evidence/native-0.2.6/runtime/"
    native_names = {native_prefix + name for name in NATIVE_026_FILES}
    native_hashes = check_hash_manifest(ROOT / "evidence/native-0.2.6-runtime.sha256", ROOT, native_names)
    snapshot = ROOT / native_prefix
    snapshot_files = set()
    for path in snapshot.rglob("*"):
        require(not path.is_symlink() and (path.is_file() or path.is_dir()), "Unsafe native snapshot entry")
        if path.is_file():
            snapshot_files.add(path.relative_to(snapshot).as_posix())
    require(snapshot_files == set(NATIVE_026_FILES), "Native snapshot has missing or extra files")
    source_manifest = json.loads((ROOT / "app/EXPORT-MANIFEST.json").read_text())
    package = json.loads((ROOT / "package.json").read_text())
    require(package["version"] == source_manifest["exportVersion"], "Root and application source versions differ")
    lock = json.loads((ROOT / "package-lock.json").read_text())
    check_package_registry(lock)
    require(lock["version"] == package["version"]
            and lock["packages"][""]["devDependencies"] == package["devDependencies"],
            "Dependency lock differs from package metadata")
    evidence_models = check_evidence_profiles()
    print(json.dumps({"publicFiles": len(files), "indexPublicFiles": index_files,
                      "markdownFiles": len(markdown), "localLinksAndAnchors": links,
                      "tvHashes": tv_hashes, "historicalNativeVersion": "0.2.6",
                      "frozenNativeRuntimeFiles": native_hashes, "currentSourceVersion": package["version"],
                      "englishDocumentation": "PASS", "privacyPatterns": "PASS", "profileSchema": "PASS",
                      "validatedEvidenceProfiles": len(evidence_models), "evidenceModels": evidence_models}))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        print(f"Repository check failed: {error}", file=sys.stderr)
        sys.exit(1)
