from ledger.fees import processing_fee


def test_fee_on_round_amount():
    assert processing_fee(1000) == 59


def test_fee_rounds_half_up():
    # 2.9% of 2500 is 72.5 cents, plus the 30 cent flat fee: 102.5 rounds to 103
    assert processing_fee(2500) == 103
