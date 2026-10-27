/* Verification-tool regressions only: temporary files, no browser/network/TV. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');

test('All browser checks isolate generated output by default and honor explicit report directories', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'cinema-report-path-'));
  const previousCwd = process.cwd();
  let cases = 0;
  try {
    process.chdir(temporary);
    const fakeApp = path.join(temporary, 'repo', 'app');
    fs.mkdirSync(fakeApp, {recursive: true});
    const scripts = fs.readdirSync(__dirname).filter(name => /^verify-.*\.cjs$/.test(name));
    assert.equal(scripts.length, 6);
    for (const name of scripts) {
      const source = fs.readFileSync(path.join(__dirname, name), 'utf8');
      assert.doesNotMatch(source, /writeFileSync\(path\.join\(__dirname/);
      assert.doesNotMatch(source, /screenshot\(\{path:path\.join\(__dirname/);
      for (const override of [undefined, path.join(temporary, 'explicit-reports'), 'relative-reports']) {
        const environment = override ? {CINEMA_REPORT_DIR: override} : {};
        let launchCalls = 0;
        const context = vm.createContext({
          require: name => name === 'playwright' ? {
            chromium: {launch: () => {launchCalls++; return new Promise(() => {});}}
          } : require(name),
          process: {env: environment}, __dirname: fakeApp,
          console: {log() {}, error() {}}, setTimeout, clearTimeout, URL, Promise
        });
        // Execute the actual prelude; stop at a deliberately unresolved fake
        // browser launch so fixtures cannot issue any requests or create a page.
        vm.runInContext(source, context, {filename: name, timeout: 1000});
        const expected = override ? path.resolve(override) : path.join(temporary, 'repo', 'build', 'browser-reports');
        assert.equal(vm.runInContext('reportDir', context), expected);
        assert.equal(fs.statSync(expected).isDirectory(), true);
        assert.equal(launchCalls, 1);
        cases++;
      }
    }
    assert.equal(cases, 18);
    assert.deepEqual(fs.readdirSync(fakeApp), []);
  } finally {
    process.chdir(previousCwd);
    fs.rmSync(temporary, {recursive: true, force: true});
  }
});

test('Source and ZIP validation reject corruption and unsafe entries even with Python optimization', () => {
  const program = String.raw`
from pathlib import Path
import hashlib, json, re, shutil, stat, subprocess, sys, tempfile, warnings, zipfile
source = Path(sys.argv[1])
cases = 0
with tempfile.TemporaryDirectory(prefix='cinema-validator-') as temporary:
    root = Path(temporary) / 'app'
    shutil.copytree(source, root)
    manifest = root / 'EXPORT-MANIFEST.json'
    original = manifest.read_text()
    def check(name, expected, arguments=()):
        global cases
        for mode in [[], ['-O']]:
            result = subprocess.run([sys.executable, *mode, str(root / 'validate_export.py'), *map(str, arguments)], capture_output=True, text=True)
            if (result.returncode == 0) != expected:
                raise RuntimeError(name + ' returned an unexpected result: ' + result.stderr)
            cases += 1
    check('pristine source', True)
    (root / 'nested').mkdir()
    (root / 'nested' / 'unlisted.txt').write_text('public fixture')
    check('unlisted nested file', False)
    shutil.rmtree(root / 'nested')
    (root / 'unlisted-link').symlink_to(root / 'README.md')
    check('source symlink', False)
    (root / 'unlisted-link').unlink()
    value = json.loads(original)
    value['entries'].append(value['entries'][0])
    manifest.write_text(json.dumps(value))
    check('duplicate manifest name', False)
    manifest.write_text(original)
    value = json.loads(original)
    value['entries'][0]['name'] = '../outside'
    manifest.write_text(json.dumps(value))
    check('unsafe manifest name', False)
    manifest.write_text(original)
    content = (root / 'README.md').read_bytes()
    (root / 'README.md').write_bytes(content + b'\n')
    check('modified source bytes', False)
    (root / 'README.md').write_bytes(content)
    manifest.write_text('[]')
    check('invalid manifest shape', False)
    manifest.write_text(original)
    config = root / 'config.xml'
    original_config = config.read_text()
    def source_version(source, widget):
        config.write_text(re.sub(r'(<widget\b[^>]*\bversion=")[^"]+', lambda match: match.group(1) + widget, original_config))
        value = json.loads(original)
        value['exportVersion'] = source
        for entry in value['entries']:
            if entry['name'] == 'config.xml':
                content = config.read_bytes()
                entry['bytes'] = len(content)
                entry['sha256'] = hashlib.sha256(content).hexdigest()
        manifest.write_text(json.dumps(value))
    source_version('12.34.56', '12.34.56')
    check('matching future numeric semantic version', True)
    source_version(json.loads(original)['exportVersion'], '12.34.56')
    check('mismatched source and widget versions', False)
    source_version('01.2.3', '01.2.3')
    check('invalid semantic version with leading zero', False)
    config.write_text(original_config)
    manifest.write_text(original)
    archive = Path(temporary) / 'source.zip'
    with zipfile.ZipFile(archive, 'w') as handle:
        for entry in sorted(root.iterdir()):
            handle.writestr(entry.name, entry.read_bytes())
    check('matching flat ZIP', True, [archive])
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        with zipfile.ZipFile(archive, 'a') as handle:
            handle.writestr('README.md', (root / 'README.md').read_bytes())
    check('duplicate ZIP member', False, [archive])
    archive.unlink()
    with zipfile.ZipFile(archive, 'w') as handle:
        for entry in sorted(root.iterdir()):
            info = zipfile.ZipInfo(entry.name)
            if entry.name == 'README.md':
                info.create_system = 3
                info.external_attr = (stat.S_IFLNK | 0o777) << 16
            handle.writestr(info, entry.read_bytes())
    check('symlink ZIP member', False, [archive])
print(json.dumps({'cases': cases, 'allPassed': True}))
`;
  const result = JSON.parse(execFileSync(process.env.PYTHON || 'python3', ['-c', program, __dirname], {encoding: 'utf8'}));
  assert.deepEqual(result, {cases: 26, allPassed: true});
});
