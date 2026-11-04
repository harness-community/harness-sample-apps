import os

from ledger.export import write_export


def test_export_writes_rows(tmp_path):
    rows = int(os.environ.get("EXPORT_ROWS", "10000"))
    path = tmp_path / "ledger-export.csv"
    written = write_export(str(path), rows)
    assert os.path.getsize(path) == written
