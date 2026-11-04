from collections import defaultdict


class Ledger:
    """In-memory ledger that keeps a running balance per account, in cents."""

    def __init__(self):
        self._balances = defaultdict(int)
        self._entries = []

    def post(self, account, amount_cents, memo=""):
        self._balances[account] += amount_cents
        self._entries.append({"account": account, "amount_cents": amount_cents, "memo": memo})

    def load(self, entries):
        for entry in entries:
            self.post(entry["account"], entry["amount_cents"], entry.get("memo", ""))

    def balance(self, account):
        return self._balances[account]

    def count(self):
        return len(self._entries)
