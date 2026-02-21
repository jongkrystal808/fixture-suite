from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter(prefix="/usage", tags=["usage"])


class ModelRunPayload(BaseModel):
    customer_id: str
    model_id: str
    run_qty: int
    operator: str | None = None
    station_id: str | None = None
    note: str | None = None


@router.post("/model-run")
def model_run(payload: ModelRunPayload, db: Session = Depends(get_db)):

    if payload.run_qty <= 0:
        raise HTTPException(status_code=400, detail="run_qty must be > 0")

    # 1️⃣ 取得該 model 需要的治具
    requirements = db.execute(
        """
        SELECT fixture_id, required_qty
        FROM fixture_requirements
        WHERE customer_id = :customer_id
          AND model_id = :model_id
        """,
        {
            "customer_id": payload.customer_id,
            "model_id": payload.model_id
        }
    ).fetchall()

    if not requirements:
        raise HTTPException(status_code=404, detail="No fixture requirements found")

    # 2️⃣ 對每個治具寫 usage_log
    for row in requirements:
        fixture_id = row[0]
        required_qty = row[1]

        use_count = payload.run_qty * required_qty

        db.execute(
            """
            INSERT INTO usage_logs
            (customer_id, fixture_id, record_level,
             station_id, model_id,
             use_count, operator, note)
            VALUES
            (:customer_id, :fixture_id, 'fixture',
             :station_id, :model_id,
             :use_count, :operator, :note)
            """,
            {
                "customer_id": payload.customer_id,
                "fixture_id": fixture_id,
                "station_id": payload.station_id,
                "model_id": payload.model_id,
                "use_count": use_count,
                "operator": payload.operator,
                "note": payload.note
            }
        )

    db.commit()

    return {
        "status": "success",
        "message": "Model run recorded",
        "affected_fixtures": len(requirements)
    }