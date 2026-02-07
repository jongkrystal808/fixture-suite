from dbutils.pooled_db import PooledDB
import pymysql
from typing import Any, Dict, List, Tuple, Optional
from backend.config import settings


class Database:
    def __init__(self):
        # ❗ 關鍵：先不要建立連線池
        self.pool: Optional[PooledDB] = None

    def _init_pool(self):
        if self.pool is None:
            self.pool = PooledDB(
                creator=pymysql,
                maxconnections=20,
                mincached=2,
                maxcached=5,
                blocking=True,
                ping=1,
                host=settings.DB_HOST,
                port=settings.DB_PORT,
                user=settings.DB_USER,
                password=settings.DB_PASS,
                database=settings.DB_NAME,
                charset="utf8mb4",
                autocommit=True,
            )

    # --------------------------------------------------------
    # 基礎方法：取得連線
    # --------------------------------------------------------
    def get_conn(self):
        self._init_pool()
        return self.pool.connection()

    # --------------------------------------------------------
    # Query Methods
    # --------------------------------------------------------
    def execute_query(self, sql: str, params: Optional[Tuple] = None):
        conn = self.get_conn()
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute(sql, params or ())
                return cursor.fetchall()
        except Exception as e:
            # 🔥 關鍵：把真正的 SQL error 打出來
            print("❌ SQL EXECUTE ERROR")
            print("SQL:", sql)
            print("PARAMS:", params)
            print("ERROR:", e)
            raise
        finally:
            conn.close()

    def execute_one(self, sql: str, params: Optional[Tuple] = None) -> Optional[Dict[str, Any]]:
        conn = self.get_conn()
        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                cursor.execute(sql, params or ())
                return cursor.fetchone()
        finally:
            conn.close()

    def execute_update(self, sql: str, params: Optional[Tuple] = None) -> int:
        conn = self.get_conn()
        try:
            with conn.cursor() as cursor:
                affected = cursor.execute(sql, params or ())
            conn.commit()
            return affected
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def execute_insert(self, sql: str, params: Optional[Tuple] = None) -> int:
        conn = self.get_conn()
        try:
            with conn.cursor() as cursor:
                cursor.execute(sql, params or ())
                new_id = cursor.lastrowid
            conn.commit()
            return new_id
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    # --------------------------------------------------------
    # Stored Procedure with OUT parameters
    # --------------------------------------------------------
    def call_sp_with_out(self, proc_name: str, args: list, out_names: list):
        conn = self.get_conn()
        try:
            cursor = conn.cursor(pymysql.cursors.DictCursor)

            for out_name in out_names:
                cursor.execute(f"SET @{out_name} = NULL;")

            placeholders = ",".join(["%s"] * len(args))
            out_placeholders = ",".join([f"@{name}" for name in out_names])
            call_sql = f"CALL {proc_name}({placeholders},{out_placeholders});"

            cursor.execute(call_sql, args)

            out_sql = "SELECT " + ",".join([f"@{name} AS {name}" for name in out_names])
            cursor.execute(out_sql)
            out_data = cursor.fetchone()

            conn.commit()
            return out_data

        except Exception:
            conn.rollback()
            raise

        finally:
            cursor.close()
            conn.close()

    def check_connection(self) -> bool:
        try:
            conn = self.get_conn()
            conn.close()
            return True
        except Exception:
            return False


# ✅ 這行可以保留，因為 __init__ 已經安全了
db = Database()
