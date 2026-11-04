def generate_entries(rows):
    """Build a list of ledger entries for load tests."""
    entries = []
    for i in range(rows):
        entries.append(
            {
                "id": i,
                "account": f"acct-{i % 5000}",
                "amount_cents": (i * 37) % 10000,
                "memo": f"fixture entry {i}",
            }
        )
    return entries
