import socket
import time


def wait_for_db(host, port, timeout_s, interval_s=2):
    """Block until host:port accepts connections, or raise TimeoutError after timeout_s seconds."""
    start = time.monotonic()
    while True:
        try:
            with socket.create_connection((host, port), timeout=2):
                return time.monotonic() - start
        except OSError:
            elapsed = int(time.monotonic() - start)
            print(f"waiting for database at {host}:{port} ({elapsed}s elapsed)", flush=True)
            if elapsed >= timeout_s:
                raise TimeoutError(f"database at {host}:{port} not reachable after {timeout_s}s")
            time.sleep(interval_s)
