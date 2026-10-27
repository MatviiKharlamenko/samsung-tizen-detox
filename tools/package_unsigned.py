"""Stage only the 11 runtime files and create a deterministic, unsigned WGT.

No SDK, certificates, device connection, network access or source mutation.
"""
from pathlib import Path
import hashlib
import json
import re
import stat
import sys
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = (
    "index.html", "styles.css", "core.js", "collaps-bridge.js",
    "catalog-client.js", "catalog-ui.js", "adapters.js", "app.js",
    "icon.svg", "icon.png", "config.xml",
)
WIDGET = "{http://www.w3.org/ns/widgets}"
TIZEN = "{http://tizen.org/ns/widgets}"


def package():
    source = ROOT / "app"
    manifest = json.loads((source / "EXPORT-MANIFEST.json").read_text())
    expected = {entry["name"]: entry for entry in manifest["entries"]}
    contents = {}
    for name in RUNTIME:
        path = source / name
        if path.is_symlink() or not path.is_file():
            raise ValueError(f"Missing or symlinked runtime file: {name}")
        body = path.read_bytes()
        entry = expected.get(name, {})
        if len(body) != entry.get("bytes") or hashlib.sha256(body).hexdigest() != entry.get("sha256"):
            raise ValueError(f"Runtime manifest mismatch: {name}")
        contents[name] = body
    config = ET.fromstring(contents["config.xml"])
    app = config.find(TIZEN + "application")
    profile = config.find(TIZEN + "profile")
    icon = config.find(WIDGET + "icon")
    content = config.find(WIDGET + "content")
    version = config.get("version", "")
    if config.tag != WIDGET + "widget" or not re.fullmatch(r"\d+\.\d+\.\d+", version):
        raise ValueError("Invalid widget identity/version")
    if version != manifest["exportVersion"] or app is None:
        raise ValueError("Widget and source manifest versions differ")
    if app.get("id") != "FatherCine.Main" or app.get("package") != "FatherCine":
        raise ValueError("Unexpected application identity")
    if app.get("required_version") != "9.0" or profile is None or profile.get("name") != "tv-samsung":
        raise ValueError("Expected the verified Samsung TV / Tizen 9 target")
    if content is None or content.get("src") != "index.html" or icon is None or icon.get("src") != "icon.png":
        raise ValueError("Unexpected entry point or icon")
    if contents["icon.png"][:24] != b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00u\x00\x00\x00u":
        raise ValueError("Expected the own 117-by-117 PNG icon")

    build = ROOT / "build"
    stage = build / "runtime"
    if build.is_symlink() or stage.is_symlink():
        raise ValueError("Build directories must not be symlinks")
    stage.mkdir(parents=True, exist_ok=True)
    # Never silently include stale SDK output or local signing material in staging.
    unexpected = [p for p in stage.rglob("*") if p.is_symlink()
                  or (not p.is_file() and not p.is_dir())
                  or (p.is_file() and p.relative_to(stage).as_posix() not in RUNTIME)]
    if unexpected:
        raise ValueError("Staging contains extra files; use a clean build/runtime directory")
    archive = build / f"kino-doma-{version}-unsigned.wgt"
    # Refuse aliases and special output files before the first content write.
    # This protects source files accidentally hard-linked into a build directory.
    for target in [*(stage / name for name in contents), archive]:
        if target.is_symlink():
            raise ValueError("Build outputs must not be symlinks")
        if target.exists():
            status = target.stat()
            if not stat.S_ISREG(status.st_mode) or status.st_nlink != 1:
                raise ValueError("Build outputs must be regular files with one link")
    for name, body in contents.items():
        (stage / name).write_bytes(body)
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as output:
        for name, body in contents.items():
            entry = zipfile.ZipInfo(name, (2026, 10, 26, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            output.writestr(entry, body)
    with zipfile.ZipFile(archive) as result:
        if result.testzip() is not None or result.namelist() != list(RUNTIME):
            raise ValueError("Archive validation failed")
        if any(result.read(name) != body for name, body in contents.items()):
            raise ValueError("Archive runtime bytes differ")
    return {"version": version, "signed": False, "runtimeFiles": len(contents),
            "staging": stage.relative_to(ROOT).as_posix(),
            "archive": archive.relative_to(ROOT).as_posix(),
            "sha256": hashlib.sha256(archive.read_bytes()).hexdigest()}


if __name__ == "__main__":
    try:
        print(json.dumps(package()))
    except (OSError, ValueError, KeyError, ET.ParseError, zipfile.BadZipFile) as error:
        print(f"Unsigned packaging failed: {error}", file=sys.stderr)
        sys.exit(1)
