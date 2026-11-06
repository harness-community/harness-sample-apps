import os

ROW_BYTES = 96


def write_export(path, rows):
    """Write a fixed-width CSV export and reserve the disk space up front.

    Reserving the full size first makes a full disk fail immediately, before any rows are written.
    """
    try:
        with open(path, "wb") as out:
            os.posix_fallocate(out.fileno(), 0, rows * ROW_BYTES)
            written = 0
            for i in range(min(rows, 1000)):
                line = f"{i},acct-{i % 5000},{(i * 37) % 10000}".ljust(ROW_BYTES - 1) + "\n"
                out.write(line.encode())
                written += ROW_BYTES
            out.truncate(written)
    except OSError:
        if os.path.exists(path):
            os.remove(path)
        raise
    return written
