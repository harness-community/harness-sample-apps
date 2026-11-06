import os
from decimal import ROUND_HALF_UP, Decimal


def processing_fee(amount_cents):
    """Card processing fee in cents: 2.9% of the amount plus 30 cents, rounded half up.

    FEE_MODE=legacy keeps the float math from the first version of the service.
    """
    if os.environ.get("FEE_MODE", "decimal") == "legacy":
        return int(amount_cents * 0.029 + 30)
    fee = Decimal(amount_cents) * Decimal("0.029") + Decimal(30)
    return int(fee.quantize(Decimal("1"), rounding=ROUND_HALF_UP))
