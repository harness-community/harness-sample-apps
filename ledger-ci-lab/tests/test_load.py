import os

from ledger.accounts import Ledger
from ledger.fixtures import generate_entries


def test_ledger_loads_fixture_dataset():
    rows = int(os.environ.get("FIXTURE_ROWS", "50000"))
    ledger = Ledger()
    ledger.load(generate_entries(rows))
    assert ledger.count() == rows
