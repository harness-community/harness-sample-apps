import socket
import threading

import pytest


@pytest.fixture
def local_db():
    """A listener on an ephemeral port that stands in for the database."""
    server = socket.socket()
    server.bind(("127.0.0.1", 0))
    server.listen()
    stop = threading.Event()

    def accept():
        server.settimeout(0.2)
        while not stop.is_set():
            try:
                conn, _ = server.accept()
                conn.close()
            except OSError:
                pass

    thread = threading.Thread(target=accept, daemon=True)
    thread.start()
    yield "127.0.0.1", server.getsockname()[1]
    stop.set()
    thread.join()
    server.close()
