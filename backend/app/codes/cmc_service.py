"""
CMC Generator & Serial Service
Developer 1: Backend Core
Generates canonical codes with Verhoeff check digits and formatted descriptions.
"""

from typing import Dict, Any, Tuple

# Verhoeff algorithm multiplication and permutation tables
d_table = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 6, 7, 8, 9, 0, 1, 2, 3, 4],
    [6, 7, 8, 9, 5, 1, 2, 3, 4, 0],
    [7, 8, 9, 5, 6, 2, 3, 4, 0, 1],
    [8, 9, 5, 6, 7, 3, 4, 0, 1, 2],
    [9, 5, 6, 7, 8, 4, 0, 1, 2, 3]
]

p_table = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 4, 1, 2, 6],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
]

inv_table = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]


def calc_verhoeff_check_digit(number_str: str) -> str:
    """Calculates Verhoeff check digit for a string of digits."""
    clean_str = "".join(filter(str.isdigit, number_str))
    c = 0
    for i, digit in enumerate(reversed(clean_str)):
        c = d_table[c][p_table[(i + 1) % 8][int(digit)]]
    return str(inv_table[c])


class CMCService:
    def generate_code(
        self,
        class_code: str,
        subclass_code: str,
        size_code: str,
        material_code: str,
        pressure_code: str,
        serial_number: int
    ) -> str:
        """
        Generates 18-digit hyphenated code:
        CLASS (4) - SUBCLASS (4) - SIZE (4) - MATERIAL (4) - PRESSURE (4) - SERIAL (4) - CHECK (1)
        Example: 0112-0003-0050-0017-0150-0001-4
        """
        c_code = (class_code or "0000").zfill(4)
        sub_code = (subclass_code or "0000").zfill(4)
        sz_code = (size_code or "0000").zfill(4)
        mat_code = (material_code or "0000").zfill(4)
        press_code = (pressure_code or "0000").zfill(4)
        ser_code = str(serial_number).zfill(4)

        raw_digits = f"{c_code}{sub_code}{sz_code}{mat_code}{press_code}{ser_code}"
        check_digit = calc_verhoeff_check_digit(raw_digits)

        return f"{c_code}-{sub_code}-{sz_code}-{mat_code}-{press_code}-{ser_code}-{check_digit}"

    def generate_descriptions(self, class_name: str, attributes: Dict[str, Any]) -> Tuple[str, str]:
        """Generates standardized short and long descriptions."""
        type_val = attributes.get("type", {}).get("value", "")
        size_val = attributes.get("primary_size", {}).get("value", "")
        press_val = attributes.get("pressure", {}).get("value", "")
        mat_val = attributes.get("material", {}).get("value", "")
        conn_val = attributes.get("connection", {}).get("value", "")

        short_desc = f"{class_name},{type_val},{size_val},{press_val},{mat_val},{conn_val}".strip(",")
        long_desc = f"{class_name}, Type: {type_val}, Size: {size_val}MM, Rating: {press_val}, Material: {mat_val}, Connection: {conn_val}"
        return short_desc, long_desc
