"""
使用記錄 API (v4.0, Stored Procedure 版)
--------------------------------------
此版本不再直接寫入 usage_logs，
所有 INSERT 一律透過 MySQL Stored Procedure：

- sp_insert_usage_log

summary 表（fixture_usage_summary, serial_usage_summary）
由 Stored Procedure + 刪除時的重算邏輯共同維護。

支援：
- record_level = fixture / individual / batch
- individual / batch 會展開為 serial 紀錄呼叫 SP
- use_count > 0
- operator 若未提供 → 預設為登入者
- fixture_id / model_id / station_id 必填
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from typing import Optional, Dict, Any
from datetime import datetime
from openpyxl import Workbook, load_workbook
from openpyxl.utils import get_column_letter
from fastapi.responses import StreamingResponse
import io
from openpyxl.comments import Comment

from backend.app.database import db
from backend.app.dependencies import get_current_user, get_current_customer_id
from backend.app.utils.serial_tools import expand_serial_range, normalise_serial_list


router = APIRouter(prefix="/usage", tags=["使用紀錄 Usage Logs v4.0"])


# -------------------------------------------------------------
# Helper：基本存在性檢查
# -------------------------------------------------------------
def ensure_fixture_exists(fixture_id: str, customer_id: str):
    row = db.execute_query(
        "SELECT id FROM fixtures WHERE id=%s AND customer_id=%s",
        (fixture_id, customer_id)
    )
    if not row:
        raise HTTPException(400, f"治具 {fixture_id} 不存在或不屬於客戶 {customer_id}")


def ensure_model_exists(model_id: str, customer_id: str):
    row = db.execute_query(
        "SELECT id FROM machine_models WHERE id=%s AND customer_id=%s",
        (model_id, customer_id)
    )
    if not row:
        raise HTTPException(400, f"機種 {model_id} 不存在或不屬於客戶 {customer_id}")


def ensure_station_exists(station_id: str, customer_id: str):
    row = db.execute_query(
        "SELECT id FROM stations WHERE id=%s AND customer_id=%s",
        (station_id, customer_id)
    )
    if not row:
        raise HTTPException(400, f"站點 {station_id} 不存在或不屬於客戶 {customer_id}")


# -------------------------------------------------------------
# Helper：呼叫 sp_insert_usage_log
# -------------------------------------------------------------
def call_sp_insert_usage(
    customer_id: str,
    fixture_id: str,
    sp_record_level: str,      # 'fixture' or 'serial'
    serial_number: Optional[str],
    station_id: str,
    model_id: str,
    use_count: int,
    operator: str,
    note: Optional[str],
):
    """
    封裝對 sp_insert_usage_log 的呼叫

    SP 定義：

    sp_insert_usage_log(
        IN p_customer_id VARCHAR(50),
        IN p_fixture_id VARCHAR(50),
        IN p_record_level ENUM('fixture','serial'),
        IN p_serial_number VARCHAR(100),
        IN p_station_id VARCHAR(50),
        IN p_model_id VARCHAR(50),
        IN p_use_count INT,
        IN p_operator VARCHAR(100),
        IN p_note TEXT,
        OUT o_inserted_count INT,
        OUT o_message VARCHAR(255)
    )
    """

    out = db.call_sp_with_out(
        "sp_insert_usage_log",
        [
            customer_id,
            fixture_id,
            sp_record_level,
            serial_number,
            station_id,
            model_id,
            use_count,
            operator,
            note,
        ],
        ["o_inserted_count", "o_message"],
    )

    # 可能是 dict 或 tuple，兩種都處理一下
    if isinstance(out, dict):
        inserted = out.get("o_inserted_count")
        message = out.get("o_message")
    else:
        # 順序：o_inserted_count, o_message
        inserted = out[0] if out and len(out) > 0 else None
        message = out[1] if out and len(out) > 1 else None

    if not inserted:
        # SP 自己會填錯誤訊息（如：治具不存在 / 序號不屬於該治具）
        raise HTTPException(400, message or "使用記錄新增失敗")

    return {
        "inserted_count": inserted,
        "message": message or "使用記錄新增成功",
    }


# -------------------------------------------------------------
# 列表（僅查 usage_logs，不牽涉 summary）
# -------------------------------------------------------------
@router.get("", summary="查詢使用紀錄列表 (v4.0)")
def list_usage_logs(
    fixture_id: Optional[str] = None,
    serial_number: Optional[str] = None,
    model_id: Optional[str] = None,
    station_id: Optional[str] = None,
    operator: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    skip: int = 0,
    limit: int = 100,
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    where = ["ul.customer_id=%s"]
    params = [customer_id]

    if fixture_id:
        where.append("ul.fixture_id=%s")
        params.append(fixture_id)

    if serial_number:
        where.append("ul.serial_number=%s")
        params.append(serial_number)

    if model_id:
        where.append("ul.model_id=%s")
        params.append(model_id)

    if station_id:
        where.append("ul.station_id=%s")
        params.append(station_id)

    if operator:
        where.append("ul.operator LIKE %s")
        params.append(f"%{operator}%")

    if date_from:
        where.append("ul.used_at >= %s")
        params.append(date_from)

    if date_to:
        where.append("ul.used_at <= %s")
        params.append(date_to)

    sql = f"""
        SELECT 
            ul.*,
            f.fixture_name,
            m.model_name,
            s.station_name
        FROM usage_logs ul
        LEFT JOIN fixtures f 
            ON ul.fixture_id = f.id AND ul.customer_id = f.customer_id
        LEFT JOIN machine_models m
            ON ul.model_id = m.id AND ul.customer_id = m.customer_id
        LEFT JOIN stations s
            ON ul.station_id = s.id AND ul.customer_id = s.customer_id
        WHERE {' AND '.join(where)}
        ORDER BY ul.used_at DESC, ul.id DESC
        LIMIT %s OFFSET %s
    """

    params.extend([limit, skip])
    rows = db.execute_query(sql, tuple(params))
    return rows


# -------------------------------------------------------------
# 使用記錄匯入樣本（Template, xlsx）
# -------------------------------------------------------------
@router.get("/template", summary="下載使用記錄匯入樣本（xlsx）")
def download_usage_template(
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    wb = Workbook()
    ws = wb.active
    ws.title = "Usage Import Template"

    headers = [
        "fixture_id",
        "model_id",
        "station_id",
        "record_level",
        "serial_number",
        "serial_start",
        "serial_end",
        "use_count",
        "operator",
        "note",
    ]

    ws.append(headers)

    # 第二列：欄位說明（比照收 / 退料樣本精神）
    descriptions = [
        "治具編號（必填）",
        "機種 ID（必填）",
        "站點 ID（必填）",
        "fixture / individual / batch",
        "序號（individual 模式使用）",
        "起始序號（batch 模式使用）",
        "結束序號（batch 模式使用）",
        "使用次數（整數 > 0）",
        "操作人員（可留空，自動帶登入者）",
        "備註（選填）",
    ]
    ws.append(descriptions)

    # -----------------------------
    # 範例資料（可直接刪除）
    # -----------------------------

    # 範例 1：fixture-level
    ws.append([
        "FX-0001",          # fixture_id
        "MODEL-A",          # model_id
        "STATION-01",       # station_id
        "fixture",          # record_level
        "",                 # serial_number
        "",                 # serial_start
        "",                 # serial_end
        1,                  # use_count
        "",                 # operator
        "範例：治具層級使用", # note
    ])

    # 範例 2：individual serial
    ws.append([
        "FX-0001",
        "MODEL-A",
        "STATION-01",
        "individual",
        "SN0001",
        "",
        "",
        1,
        "",
        "範例：單一序號使用",
    ])

    # 範例 3：batch serial
    ws.append([
        "FX-0001",
        "MODEL-A",
        "STATION-01",
        "batch",
        "",
        "SN0001",
        "SN0010",
        1,
        "",
        "範例：批量序號使用",
    ])


    # 加上欄位註解（滑鼠 hover 可看）
    comments = {
        "D": "fixture：治具層級\nindividual：單一序號\nbatch：序號區間",
        "E": "record_level=individual 時填",
        "F": "record_level=batch 時填",
        "G": "record_level=batch 時填",
        "H": "必須為正整數",
    }

    for col, text in comments.items():
        ws[f"{col}1"].comment = Comment(text, "system")

    # 基本欄寬
    for col in range(1, len(headers) + 1):
        ws.column_dimensions[get_column_letter(col)].width = 22

    # 輸出
    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    filename = "usage_import_template.xlsx"

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )


# -------------------------------------------------------------
# 匯入使用記錄（Import, xlsx）
# -------------------------------------------------------------
@router.post("/import", summary="匯入使用記錄（xlsx）")
def import_usage_logs(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    # -----------------------------
    # 基本檢查
    # -----------------------------
    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(400, "只支援 xlsx 檔案")

    try:
        # ⭐ FastAPI UploadFile → bytes → BytesIO（最穩定）
        content = file.file.read()
        wb = load_workbook(io.BytesIO(content), data_only=True)
    except Exception as e:
        raise HTTPException(400, "無法讀取 Excel 檔案")

    ws = wb.active

    rows = list(ws.iter_rows(values_only=True))
    if len(rows) < 3:
        raise HTTPException(400, "Excel 內容不足（至少需要標題列與資料列）")

    headers = [str(h).strip() if h else "" for h in rows[0]]

    def col(name: str):
        if name not in headers:
            raise HTTPException(400, f"缺少欄位：{name}")
        return headers.index(name)

    # 欄位索引
    idx_fixture = col("fixture_id")
    idx_model   = col("model_id")
    idx_station = col("station_id")
    idx_level   = col("record_level")
    idx_serial  = col("serial_number")
    idx_start   = col("serial_start")
    idx_end     = col("serial_end")
    idx_count   = col("use_count")
    idx_operator= col("operator")
    idx_note    = col("note")

    success = 0
    errors = []

    # -----------------------------
    # 逐列處理（從第 3 列開始）
    # -----------------------------
    for i, row in enumerate(rows[2:], start=3):
        try:
            fixture_id = str(row[idx_fixture]).strip() if row[idx_fixture] else ""
            model_id   = str(row[idx_model]).strip() if row[idx_model] else ""
            station_id = str(row[idx_station]).strip() if row[idx_station] else ""
            record_level = str(row[idx_level]).strip() if row[idx_level] else "fixture"

            if not fixture_id or not model_id or not station_id:
                raise Exception("fixture_id / model_id / station_id 為必填")

            try:
                use_count = int(row[idx_count])
            except Exception:
                raise Exception("use_count 必須為整數")

            if use_count <= 0:
                raise Exception("use_count 必須 > 0")

            operator = (
                str(row[idx_operator]).strip()
                if row[idx_operator]
                else user["username"]
            )
            note = str(row[idx_note]).strip() if row[idx_note] else None

            # -----------------------------
            # fixture-level
            # -----------------------------
            if record_level == "fixture":
                call_sp_insert_usage(
                    customer_id=customer_id,
                    fixture_id=fixture_id,
                    sp_record_level="fixture",
                    serial_number=None,
                    station_id=station_id,
                    model_id=model_id,
                    use_count=use_count,
                    operator=operator,
                    note=note,
                )
                success += 1
                continue

            # -----------------------------
            # individual
            # -----------------------------
            if record_level == "individual":
                sn = str(row[idx_serial]).strip() if row[idx_serial] else ""
                if not sn:
                    raise Exception("individual 模式需填 serial_number")

                call_sp_insert_usage(
                    customer_id=customer_id,
                    fixture_id=fixture_id,
                    sp_record_level="serial",
                    serial_number=sn,
                    station_id=station_id,
                    model_id=model_id,
                    use_count=use_count,
                    operator=operator,
                    note=note,
                )
                success += 1
                continue

            # -----------------------------
            # batch
            # -----------------------------
            if record_level == "batch":
                start = str(row[idx_start]).strip() if row[idx_start] else ""
                end   = str(row[idx_end]).strip() if row[idx_end] else ""

                if not start or not end:
                    raise Exception("batch 模式需填 serial_start / serial_end")

                serials = expand_serial_range(start, end)
                if not serials:
                    raise Exception("serial_start / serial_end 無法解析")

                for sn in serials:
                    call_sp_insert_usage(
                        customer_id=customer_id,
                        fixture_id=fixture_id,
                        sp_record_level="serial",
                        serial_number=sn,
                        station_id=station_id,
                        model_id=model_id,
                        use_count=use_count,
                        operator=operator,
                        note=note,
                    )
                    success += 1
                continue

            raise Exception(f"未知的 record_level：{record_level}")

        except Exception as e:
            errors.append(f"第 {i} 列：{str(e)}")

    return {
        "success_count": success,
        "error_count": len(errors),
        "errors": errors,
    }



# -------------------------------------------------------------
# 新增使用記錄（fixture / individual / batch）
# -------------------------------------------------------------
@router.post("", summary="新增使用紀錄（支援 fixture / individual / batch）")
def create_usage(
    data: Dict[str, Any],
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    """
    前端 payload（app-usage.js v4.0）預期：

    {
      "fixture_id": "L-00001",
      "model_id": "EDS-2008",
      "station_id": "T1_MP",
      "use_count": 5,
      "operator": "100182",        # 可省略 → 後端帶登入者
      "note": "備註",
      "record_level": "fixture" | "individual" | "batch",
      "serials": ["SN001", "SN002"],        # individual
      "serial_start": "SN001",             # batch
      "serial_end": "SN100"                # batch
    }
    """

    fixture_id = data.get("fixture_id")
    if not fixture_id:
        raise HTTPException(400, "缺少 fixture_id")

    model_id = data.get("model_id")
    if not model_id:
        raise HTTPException(400, "缺少 model_id")

    station_id = data.get("station_id")
    if not station_id:
        raise HTTPException(400, "缺少 station_id")

    ensure_fixture_exists(fixture_id, customer_id)
    ensure_model_exists(model_id, customer_id)
    ensure_station_exists(station_id, customer_id)

    # 操作者
    operator = data.get("operator") or user["username"]

    # 使用次數
    try:
        use_count = int(data.get("use_count", 1))
    except Exception:
        raise HTTPException(400, "use_count 必須為整數")

    if use_count <= 0:
        raise HTTPException(400, "use_count 必須 > 0")

    note = data.get("note")

    record_level = data.get("record_level", "fixture")  # fixture / individual / batch

    # -----------------------------
    # 1. fixture-level 使用紀錄
    # -----------------------------
    if record_level == "fixture":
        result = call_sp_insert_usage(
            customer_id=customer_id,
            fixture_id=fixture_id,
            sp_record_level="fixture",
            serial_number=None,
            station_id=station_id,
            model_id=model_id,
            use_count=use_count,
            operator=operator,
            note=note,
        )
        return {
            "mode": "fixture",
            "inserted_count": result["inserted_count"],
            "message": result["message"],
        }

    # -----------------------------
    # 2. individual: 多筆序號
    # -----------------------------
    if record_level == "individual":
        serials_raw = data.get("serials") or data.get("serial_numbers")
        if not serials_raw:
            raise HTTPException(400, "individual 模式需要 serials 陣列或字串")

        if isinstance(serials_raw, str):
            serials = normalise_serial_list(
                [x.strip() for x in serials_raw.split(",") if x.strip()]
            )
        else:
            serials = normalise_serial_list(serials_raw)

        if not serials:
            raise HTTPException(400, "individual 模式解析不到任何序號")

        created = 0
        errors = []

        for sn in serials:
            try:
                res = call_sp_insert_usage(
                    customer_id=customer_id,
                    fixture_id=fixture_id,
                    sp_record_level="serial",
                    serial_number=sn,
                    station_id=station_id,
                    model_id=model_id,
                    use_count=use_count,
                    operator=operator,
                    note=note,
                )
                created += res["inserted_count"] or 0
            except HTTPException as he:
                errors.append(f"{sn}: {he.detail}")
            except Exception as e:
                errors.append(f"{sn}: {str(e)}")

        return {
            "mode": "individual",
            "requested": len(serials),
            "inserted_count": created,
            "errors": errors,
        }

    # -----------------------------
    # 3. batch: serial_start + serial_end
    # -----------------------------
    if record_level == "batch":
        start = data.get("serial_start")
        end = data.get("serial_end")
        serials = expand_serial_range(start or "", end or "")

        if not serials:
            raise HTTPException(400, "batch 模式需要有效的 serial_start / serial_end")

        created = 0
        errors = []

        for sn in serials:
            try:
                res = call_sp_insert_usage(
                    customer_id=customer_id,
                    fixture_id=fixture_id,
                    sp_record_level="serial",
                    serial_number=sn,
                    station_id=station_id,
                    model_id=model_id,
                    use_count=use_count,
                    operator=operator,
                    note=note,
                )
                created += res["inserted_count"] or 0
            except HTTPException as he:
                errors.append(f"{sn}: {he.detail}")
            except Exception as e:
                errors.append(f"{sn}: {str(e)}")

        return {
            "mode": "batch",
            "range": {"start": start, "end": end},
            "requested": len(serials),
            "inserted_count": created,
            "errors": errors,
        }

    raise HTTPException(400, f"未知的 record_level: {record_level}")


# -------------------------------------------------------------
# 單筆查詢
# -------------------------------------------------------------
@router.get("/{log_id}", summary="取得單筆使用紀錄")
def get_usage(
    log_id: int,
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    rows = db.execute_query(
        """
        SELECT 
            ul.*,
            f.fixture_name,
            m.model_name,
            s.station_name
        FROM usage_logs ul
        LEFT JOIN fixtures f 
            ON ul.fixture_id = f.id AND ul.customer_id = f.customer_id
        LEFT JOIN machine_models m
            ON ul.model_id = m.id AND ul.customer_id = m.customer_id
        LEFT JOIN stations s
            ON ul.station_id = s.id AND ul.customer_id = s.customer_id
        WHERE ul.id=%s AND ul.customer_id=%s
        """,
        (log_id, customer_id),
    )

    if not rows:
        raise HTTPException(404, "使用記錄不存在")

    return rows[0]


# -------------------------------------------------------------
# 刪除 + 自動重算 summary
# -------------------------------------------------------------
@router.delete("/{log_id}", summary="刪除使用紀錄（並重算 summary）")
def delete_usage(
    log_id: int,
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    # 1. 先查舊資料
    rows = db.execute_query(
        """
        SELECT id, customer_id, fixture_id, serial_number, record_level
        FROM usage_logs
        WHERE id=%s AND customer_id=%s
        """,
        (log_id, customer_id),
    )

    if not rows:
        raise HTTPException(404, "使用記錄不存在")

    row = rows[0]
    fixture_id = row["fixture_id"]
    serial_number = row.get("serial_number")
    record_level = row.get("record_level")

    # 2. 刪除 usage_logs
    db.execute_update(
        "DELETE FROM usage_logs WHERE id=%s AND customer_id=%s",
        (log_id, customer_id),
    )

    # 3. 重算 fixture_usage_summary（只看 record_level='fixture'）
    agg_fx = db.execute_query(
        """
        SELECT 
            COALESCE(SUM(use_count), 0) AS total_use_count,
            MAX(used_at) AS last_used_at
        FROM usage_logs
        WHERE customer_id=%s
          AND fixture_id=%s
          AND record_level='fixture'
        """,
        (customer_id, fixture_id),
    )[0]

    total_fx = agg_fx["total_use_count"] or 0
    last_fx = agg_fx["last_used_at"]

    if total_fx > 0 and last_fx:
        db.execute_update(
            """
            INSERT INTO fixture_usage_summary
                (customer_id, fixture_id, total_use_count, last_used_at, updated_at)
            VALUES (%s, %s, %s, %s, NOW())
            ON DUPLICATE KEY UPDATE
                total_use_count = VALUES(total_use_count),
                last_used_at    = VALUES(last_used_at),
                updated_at      = NOW()
            """,
            (customer_id, fixture_id, total_fx, last_fx),
        )
    else:
        db.execute_update(
            """
            DELETE FROM fixture_usage_summary
            WHERE customer_id=%s AND fixture_id=%s
            """,
            (customer_id, fixture_id),
        )

    # 4. 如為 serial-level，重算 serial_usage_summary
    if record_level == "serial" and serial_number:
        agg_sn = db.execute_query(
            """
            SELECT 
                COALESCE(SUM(use_count), 0) AS total_use_count,
                MAX(used_at) AS last_used_at
            FROM usage_logs
            WHERE customer_id=%s
              AND fixture_id=%s
              AND serial_number=%s
              AND record_level='serial'
            """,
            (customer_id, fixture_id, serial_number),
        )[0]

        total_sn = agg_sn["total_use_count"] or 0
        last_sn = agg_sn["last_used_at"]

        if total_sn > 0 and last_sn:
            db.execute_update(
                """
                INSERT INTO serial_usage_summary
                    (customer_id, fixture_id, serial_number,
                     total_use_count, last_used_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                ON DUPLICATE KEY UPDATE
                    total_use_count = VALUES(total_use_count),
                    last_used_at    = VALUES(last_used_at),
                    updated_at      = NOW()
                """,
                (customer_id, fixture_id, serial_number, total_sn, last_sn),
            )
        else:
            db.execute_update(
                """
                DELETE FROM serial_usage_summary
                WHERE customer_id=%s AND fixture_id=%s AND serial_number=%s
                """,
                (customer_id, fixture_id, serial_number),
            )

    return {"message": "已刪除", "id": log_id}


# -------------------------------------------------------------
# 總結摘要：治具層級
# -------------------------------------------------------------
@router.get("/summary/{fixture_id}", summary="取得治具使用摘要")
def get_fixture_summary(
    fixture_id: str,
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):
    rows = db.execute_query(
        """
        SELECT *
        FROM fixture_usage_summary
        WHERE customer_id=%s AND fixture_id=%s
        """,
        (customer_id, fixture_id),
    )

    if not rows:
        # 沒有任何使用記錄時，回傳空物件更友善
        return {
            "customer_id": customer_id,
            "fixture_id": fixture_id,
            "total_use_count": 0,
            "last_used_at": None,
            "updated_at": None,
        }

    return rows[0]


# -------------------------------------------------------------
# 總結摘要：序號層級
# -------------------------------------------------------------
@router.get("/serial/{serial_number}", summary="取得序號使用摘要")
def get_serial_summary(
    serial_number: str,
    user=Depends(get_current_user),
    customer_id=Depends(get_current_customer_id),
):

    rows = db.execute_query(
        """
        SELECT *
        FROM serial_usage_summary
        WHERE customer_id=%s AND serial_number=%s
        """,
        (customer_id, serial_number),
    )

    if not rows:
        return {
            "customer_id": customer_id,
            "serial_number": serial_number,
            "total_use_count": 0,
            "last_used_at": None,
            "updated_at": None,
        }

    return rows[0]
