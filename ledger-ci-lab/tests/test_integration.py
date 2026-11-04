import os

from ledger.db import wait_for_db


def test_database_becomes_reachable(local_db):
    host = os.environ.get("DB_HOST")
    port = int(os.environ.get("DB_PORT", "5432"))
    if host is None:
        host, port = local_db
    wait_for_db(host, port, timeout_s=int(os.environ.get("DB_WAIT_SECONDS", "10")))
