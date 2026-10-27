"""Runner cleanup smoke tests with fake Playwright, no browser or network service."""
from pathlib import Path
import os
import re
import queue
import signal
import socket
import subprocess
import sys
import tempfile
import threading
import time
import unittest

ROOT = Path(__file__).resolve().parents[1]


class BrowserRunnerTests(unittest.TestCase):
    def run_fixture(self, content, interrupt=False):
        with tempfile.TemporaryDirectory(prefix="kino-runner-") as temporary:
            directory = Path(temporary)
            module = directory / "fake-playwright.cjs"
            module.write_text(content)
            env = dict(os.environ, PLAYWRIGHT_MODULE=str(module),
                       CINEMA_REPORT_DIR=str(directory / "reports"), CINEMA_PYTHON=sys.executable)
            child = subprocess.Popen(["node", str(ROOT / "tools/run_browser_checks.cjs")],
                                     cwd=ROOT, env=env, stdout=subprocess.PIPE,
                                     stderr=subprocess.STDOUT, text=True, bufsize=1)
            output = ""
            try:
                if interrupt:
                    received = queue.Queue()
                    lines = []
                    def capture():
                        for line in child.stdout:
                            lines.append(line)
                            received.put(line)
                    reader = threading.Thread(target=capture, daemon=True)
                    reader.start()
                    deadline = time.monotonic() + 10
                    while time.monotonic() < deadline:
                        try:
                            line = received.get(timeout=.25)
                        except queue.Empty:
                            if child.poll() is not None:
                                self.fail("Runner stopped before the signal fixture")
                            continue
                        if "INTERRUPT_SMOKE_READY" in line:
                            child.send_signal(signal.SIGTERM)
                            break
                    else:
                        self.fail("Runner did not start the first suite")
                    child.wait(timeout=6)
                    reader.join(timeout=2)
                    output = "".join(lines)
                    child.stdout.close()
                else:
                    output, _ = child.communicate(timeout=12)
                match = re.search(r"Preview: http://127\.0\.0\.1:(\d+)/", output)
                self.assertIsNotNone(match, output)
                port = int(match.group(1))
                deadline = time.monotonic() + 3
                while time.monotonic() < deadline:
                    with socket.socket() as probe:
                        probe.settimeout(.2)
                        closed = probe.connect_ex(("127.0.0.1", port)) != 0
                    if closed:
                        break
                    time.sleep(.05)
                self.assertTrue(closed, "Owned preview remained reachable")
                self.assertIn("Running verify-home.cjs", output)
                self.assertNotIn("Running verify-watched.cjs", output)
                return child.returncode
            finally:
                if child.poll() is None:
                    child.kill()
                    child.communicate(timeout=5)

    def test_first_suite_failure_closes_preview_and_stops_sequence(self):
        code = self.run_fixture("exports.chromium={launch:async()=>{throw new Error('Intentional runner smoke failure')}};")
        self.assertEqual(code, 1)

    @unittest.skipIf(sys.platform == "win32", "POSIX signal cleanup semantics")
    def test_sigterm_closes_preview_and_stops_sequence(self):
        code = self.run_fixture("process.on('SIGTERM',()=>{});exports.chromium={launch:()=>{console.log('INTERRUPT_SMOKE_READY');return new Promise(()=>{setTimeout(()=>process.exit(42),8000)})}};", interrupt=True)
        self.assertEqual(code, 143)


if __name__ == "__main__":
    unittest.main()
