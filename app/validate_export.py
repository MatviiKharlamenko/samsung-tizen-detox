"""Read-only source integrity check. Optional argument: flat source ZIP path."""
from pathlib import Path, PurePosixPath
import hashlib
import json
import re
import stat
import sys
import zipfile
import xml.etree.ElementTree as ET


RUNTIME_FILES = {"index.html", "styles.css", "core.js", "collaps-bridge.js",
                 "catalog-client.js", "catalog-ui.js", "adapters.js", "app.js",
                 "icon.svg", "icon.png", "config.xml"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def main():
    require(len(sys.argv) <= 2, "Expected at most one flat source ZIP argument")
    root = Path(__file__).resolve().parent
    manifest_path = root / "EXPORT-MANIFEST.json"
    require(not manifest_path.is_symlink(), "The manifest must not be a symlink")
    manifest = json.loads(manifest_path.read_text())
    require(isinstance(manifest, dict), "Manifest must be an object")
    version = manifest.get("exportVersion")
    require(isinstance(version, str)
            and re.fullmatch(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)", version),
            "Source version must be numeric semantic version major.minor.patch")
    entries = manifest.get("entries")
    require(isinstance(entries, list), "Manifest entries must be a list")
    names = {"EXPORT-MANIFEST.json"}
    runtime_count = 0
    runtime_names = set()
    for entry in entries:
        require(isinstance(entry, dict), "Invalid manifest entry")
        name = entry.get("name")
        require(isinstance(name, str) and bool(name), "Invalid manifest name")
        require(PurePosixPath(name).name == name and name not in {".", ".."}
                and "\\" not in name and not any(ord(char) < 32 or ord(char) == 127 for char in name),
                "Manifest names must be safe top-level file names")
        require(name not in names, "Duplicate manifest name")
        names.add(name)
        require(type(entry.get("bytes")) is int and entry["bytes"] >= 0,
                "Invalid manifest byte count")
        digest = entry.get("sha256")
        require(isinstance(digest, str) and len(digest) == 64
                and all(char in "0123456789abcdef" for char in digest),
                "Invalid manifest SHA-256")
        runtime_count += entry.get("kind") == "runtime"
        if entry.get("kind") == "runtime":
            runtime_names.add(name)
    require(runtime_count == manifest.get("runtimeFileCount") == 11,
            "Unexpected runtime file count")
    require(runtime_names == RUNTIME_FILES, "Runtime file allowlist differs from the expected widget")
    require(manifest.get("checksummedFileCount") == len(entries)
            and manifest.get("archiveFileCountIncludingThisManifest") == len(names),
            "Manifest file counts do not match its entries")

    actual = set()
    for path in root.rglob("*"):
        require(not path.is_symlink(), "Symlinks are not allowed in the source tree")
        if path.is_file():
            actual.add(path.relative_to(root).as_posix())
        else:
            require(path.is_dir(), "Unexpected source filesystem entry")
    require(actual == names, "Source file set differs from the manifest")
    for entry in entries:
        content = (root / entry["name"]).read_bytes()
        require(len(content) == entry["bytes"]
                and hashlib.sha256(content).hexdigest() == entry["sha256"],
                "Source bytes differ from the manifest: " + entry["name"])

    widget = ET.fromstring((root / "config.xml").read_bytes())
    require(widget.tag == "{http://www.w3.org/ns/widgets}widget"
            and widget.get("version") == version,
            "Widget version does not match the source manifest")

    if len(sys.argv) == 2:
        with zipfile.ZipFile(sys.argv[1]) as archive:
            members = archive.namelist()
            require(len(members) == len(set(members)) and set(members) == names,
                    "ZIP has duplicate, missing, or unexpected members")
            for entry in archive.infolist():
                require(not stat.S_ISLNK(entry.external_attr >> 16)
                        and entry.file_size == (root / entry.filename).stat().st_size,
                        "ZIP member type or size differs from source")
            require(archive.testzip() is None, "ZIP CRC check failed")
            for name in names:
                require(archive.read(name) == (root / name).read_bytes(),
                        "ZIP bytes differ from source: " + name)
    print(json.dumps({"version": manifest["exportVersion"], "files": len(names),
                      "runtimeFiles": runtime_count, "integrity": "OK"}))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError, zipfile.BadZipFile, ET.ParseError) as failure:
        print("Integrity check failed: " + str(failure), file=sys.stderr)
        sys.exit(1)
