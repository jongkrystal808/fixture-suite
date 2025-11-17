import re
from typing import List, Tuple

# ------------------------------------------------------------
# 支援的前綴合法符號
# ------------------------------------------------------------
# 字母、數字、dash、底線、slash、dot、space、colon
PREFIX_ALLOWED_CHARS = r"[A-Za-z0-9\-\_\/\.\:\ ]"


# ------------------------------------------------------------
# 解析序號：拆 prefix + 數字
# ------------------------------------------------------------
def split_prefix_number(serial: str) -> Tuple[str, str]:
    """
    將序號拆分為 prefix + number
    - prefix 可包含字母、數字、dash、底線、slash、dot、space、colon
    - number 必須為最後的一段連續數字（需可補零）

    範例：
      L001        -> ("L", "001")
      L- QA 0123  -> ("L- QA ", "0123")
      ABC/12:56   -> ("ABC/12:", "56")
    """

    if serial is None:
        raise ValueError("序號不得為空")

    serial = serial.strip()
    if serial == "":
        raise ValueError("序號不得為空字串")

    # 使用 regex 擷取結尾連續數字
    m = re.match(rf"^({PREFIX_ALLOWED_CHARS}*?)(\d+)$", serial)
    if not m:
        raise ValueError(f"無法解析序號：{serial} (必須以數字結尾)")

    prefix, number = m.group(1), m.group(2)
    return prefix, number


# ------------------------------------------------------------
# 依據 serial_end 的 number 長度決定補零規則
# ------------------------------------------------------------
def expand_serial_range(start: str, end: str) -> List[str]:
    """
    展開序號區間：
      start = "L1"
      end   = "L010"

    → ["L001", "L002", ..., "L010"]

    - 自動解析 prefix（必須相同）
    - 補零長度依 end 的數字長度決定
    """

    p1, n1 = split_prefix_number(start)
    p2, n2 = split_prefix_number(end)

    if p1 != p2:
        raise ValueError(f"序號前綴不一致：'{p1}' vs '{p2}'")

    try:
        s = int(n1)
        e = int(n2)
    except:
        raise ValueError("序號 number 必須為整數")

    if s > e:
        raise ValueError("起始序號不得大於結束序號")

    width = len(n2)  # 補零取決於 serial_end 長度

    result = [f"{p1}{str(i).zfill(width)}" for i in range(s, e + 1)]
    return result


# ------------------------------------------------------------
# 自然排序 key：prefix + 數字
# ------------------------------------------------------------
def serial_sort_key(serial: str):
    prefix, number = split_prefix_number(serial)
    return (prefix, int(number))


# ------------------------------------------------------------
# 清理序號清單：trim、去重、排序、統一補零
# ------------------------------------------------------------
def normalise_serial_list(serials: List[str]) -> List[str]:
    """
    對序號清單進行：
      - trim
      - 去重
      - 去空白
      - 自動拆 prefix+number
      - 數字補零（依最長 number 長度）
      - 自然排序

    適用於 individual 模式或 Excel 匯入
    """

    cleaned = []

    for s in serials:
        if not s or not s.strip():
            continue
        try:
            prefix, num = split_prefix_number(s.strip())
            cleaned.append((prefix, num))
        except:
            # 跳過無法解析的序號
            continue

    if not cleaned:
        return []

    # 找最長 number → 決定補零長度
    max_len = max(len(num) for _, num in cleaned)

    # 補零
    formatted = [f"{p}{n.zfill(max_len)}" for p, n in cleaned]

    # 去重
    formatted = list(set(formatted))

    # 排序
    formatted.sort(key=serial_sort_key)

    return formatted
