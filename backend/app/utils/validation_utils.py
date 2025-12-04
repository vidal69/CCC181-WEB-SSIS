import re


ID_NUMBER_RE = re.compile(r"^\d{4}-\d{4}$")
def _valid_id_number(id_number: str) -> bool:
    """Validate the format of a student ID number (e.g., "2021-1234")"""
    return bool(ID_NUMBER_RE.match(id_number))