/* Own ephemeral preview and sequential browser fixtures; no TV or personal profile. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const {spawn} = require('node:child_process');
const {createRequire} = require('node:module');

const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'app');
const SUITES = ['verify-home.cjs', 'verify-watched.cjs', 'verify-refinement.cjs', 'verify-qol.cjs', 'verify-collaps.cjs', 'verify-sounds.cjs'];
const SERVER = String.raw`
import functools, http.server, json, pathlib, sys, threading
from urllib.parse import urlsplit
if sys.version_info < (3, 12):
    raise SystemExit('Python 3.12 or newer is required')
base = pathlib.Path(sys.argv[1])
allowed = {'index.html','styles.css','core.js','collaps-bridge.js','catalog-client.js','catalog-ui.js','adapters.js','app.js','icon.svg','icon.png','config.xml'}
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
    def permitted(self):
        name = urlsplit(self.path).path
        name = 'index.html' if name == '/' else name.removeprefix('/')
        target = base / name
        if name not in allowed or target.is_symlink() or not target.is_file():
            self.send_error(404); return False
        self.path = '/' + name
        return True
    def do_GET(self):
        if self.permitted(): super().do_GET()
    def do_HEAD(self):
        if self.permitted(): super().do_HEAD()
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(base)))
def parent_closed():
    sys.stdin.buffer.read()
    server.shutdown()
threading.Thread(target=parent_closed, daemon=True).start()
print(json.dumps({'port': server.server_address[1]}), flush=True)
try: server.serve_forever()
finally: server.server_close()
`;

let server, activeSuite, interrupted, closing = false, serverFailure;
const signals = new Map([['SIGINT', 130], ['SIGTERM', 143]]);
function cancel(signal) {
  interrupted = signal;
  void stop(activeSuite);
  void stop(server);
}
function inside(base, destination) {
  const relative = path.relative(base, destination);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}
function reportDirectory() {
  const requested = path.resolve(ROOT, process.env.CINEMA_REPORT_DIR || 'build/browser-reports');
  let existing = requested;
  const missing = [];
  while (!fs.existsSync(existing)) {
    if (fs.lstatSync(existing, {throwIfNoEntry: false})?.isSymbolicLink()) throw new Error('Report directory contains a dangling symlink');
    missing.unshift(path.basename(existing));
    existing = path.dirname(existing);
  }
  const canonical = path.join(fs.realpathSync(existing), ...missing);
  if (inside(fs.realpathSync(APP), canonical)) throw new Error('Reports must be outside app/ to preserve source and evidence');
  fs.mkdirSync(canonical, {recursive: true});
  // Fresh per-run output cannot overwrite existing reports or hard-linked files.
  return fs.mkdtempSync(path.join(canonical, 'run-'));
}
async function stop(child) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise(resolve => {
    let timer;
    const done = () => { clearTimeout(timer); resolve(); };
    child.once('close', done);
    child.kill('SIGTERM');
    timer = setTimeout(() => { child.kill('SIGKILL'); done(); }, 2500);
  });
}
function startServer() {
  server = spawn(process.env.CINEMA_PYTHON || 'python3', ['-u', '-c', SERVER, APP], {cwd: ROOT, stdio: ['pipe', 'pipe', 'pipe']});
  server.stderr.on('data', chunk => process.stderr.write(chunk));
  server.on('error', error => {
    serverFailure = new Error('Cannot start Python preview: ' + error.code + '. Use Python 3.12+ or set CINEMA_PYTHON.');
    void stop(activeSuite);
  });
  return new Promise((resolve, reject) => {
    let ready = false;
    const lines = readline.createInterface({input: server.stdout});
    const timer = setTimeout(() => reject(new Error('Python preview did not start within 10 seconds')), 10000);
    server.once('error', () => { clearTimeout(timer); lines.close(); reject(serverFailure); });
    server.once('close', (code, signal) => {
      clearTimeout(timer); lines.close();
      if (!closing && !interrupted) {
        serverFailure = new Error('Python preview stopped unexpectedly (' + (signal || code) + ')');
        void stop(activeSuite);
      }
      if (!ready) reject(serverFailure || new Error('Preview startup interrupted'));
    });
    lines.on('line', line => {
      let value;
      try { value = JSON.parse(line); } catch (_) { return; }
      if (!ready && Number.isInteger(value.port) && value.port > 0 && value.port < 65536) {
        ready = true; clearTimeout(timer); lines.close(); resolve('http://127.0.0.1:' + value.port + '/');
      }
    });
  });
}
function runSuite(name, env) {
  return new Promise((resolve, reject) => {
    activeSuite = spawn(process.execPath, [path.join(APP, name)], {cwd: ROOT, env, stdio: ['ignore', 'inherit', 'inherit']});
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      void stop(activeSuite).then(() => reject(new Error(name + ' exceeded its three-minute limit')));
    }, 180000);
    activeSuite.once('error', error => { clearTimeout(timer); reject(new Error(name + ' could not start: ' + error.code)); });
    activeSuite.once('close', (code, signal) => {
      clearTimeout(timer);
      if (timedOut) reject(new Error(name + ' exceeded its three-minute limit'));
      else if (signal || code !== 0) reject(new Error(name + ' failed (' + (signal || code) + ')'));
      else resolve();
    });
  });
}
async function main() {
  if (process.argv.length > 2) throw new Error('Usage: node tools/run_browser_checks.cjs');
  try { createRequire(path.join(APP, 'app.js')).resolve(process.env.PLAYWRIGHT_MODULE || 'playwright'); }
  catch (_) { throw new Error('Playwright is unavailable. Run npm ci, or set PLAYWRIGHT_MODULE to an existing installation. Google Chrome must also be installed.'); }
  const reports = reportDirectory();
  for (const signal of signals.keys()) process.on(signal, cancel);
  try {
    const url = await startServer();
    console.log('[browser-checks] Preview: ' + url);
    console.log('[browser-checks] Reports: ' + path.relative(ROOT, reports));
    const env = {...process.env, CINEMA_PREVIEW_URL: url, CINEMA_REPORT_DIR: reports};
    for (const [index, name] of SUITES.entries()) {
      if (interrupted || serverFailure) throw serverFailure || new Error('Interrupted');
      console.log('[browser-checks] Running ' + name + ' (' + (index + 1) + '/' + SUITES.length + ')');
      await runSuite(name, env);
    }
    if (interrupted || serverFailure) throw serverFailure || new Error('Interrupted');
    console.log(JSON.stringify({browserSuitesPassed: SUITES.length, reportDirectory: path.relative(ROOT, reports)}));
  } finally {
    closing = true;
    await stop(activeSuite);
    await stop(server);
    for (const signal of signals.keys()) process.removeListener(signal, cancel);
  }
}
main().catch(error => {
  console.error('[browser-checks] ' + (serverFailure || error).message);
  process.exitCode = interrupted ? signals.get(interrupted) : 1;
});
