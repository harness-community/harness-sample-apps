from ledger.accounts import Ledger


def test_balance_tracks_postings():
    ledger = Ledger()
    ledger.post("acct-1", 5000)
    ledger.post("acct-1", -1200)
    assert ledger.balance("acct-1") == 3800


def test_unknown_account_has_zero_balance():
    assert Ledger().balance("missing") == 0
