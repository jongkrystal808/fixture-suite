# backend/app/database.py
"""
資料庫連接管理模組
提供資料庫連接、CRUD 操作和上下文管理器
"""
import pymysql.cursors
import pymysql
import time
from contextlib import contextmanager
from typing import Optional, Dict, List, Any, Tuple
from backend.config import settings


class Database:
    """資料庫管理類"""

    def __init__(self):
        self.connection = None
        self.connect()

    def connect(self, max_retries: int = 10, retry_delay: int = 2):
        """
        建立資料庫連接，支援自動重試

        Args:
            max_retries: 最大重試次數
            retry_delay: 重試間隔（秒）
        """
        for attempt in range(max_retries):
            try:
                self.connection = pymysql.connect(
                    host=settings.DB_HOST,
                    port=settings.DB_PORT,
                    user=settings.DB_USER,
                    password=settings.DB_PASS,
                    database=settings.DB_NAME,
                    charset='utf8mb4',
                    cursorclass=pymysql.cursors.DictCursor,
                    autocommit=False
                )
                print(f"✅ 資料庫連接成功 ({settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME})")
                return
            except pymysql.Error as e:
                if attempt < max_retries - 1:
                    print(f"⚠️  資料庫連接失敗 (第 {attempt + 1} 次)，{retry_delay} 秒後重試...")
                    time.sleep(retry_delay)
                else:
                    print(f"❌ 資料庫連接失敗：{e}")
                    raise

    def check_connection(self) -> bool:
        """
        檢查資料庫連線狀態（不使用 get_cursor，避免遞迴）
        """
        try:
            if self.connection is None:
                return False
            # ping(reconnect=False) 只檢查，不自動重連；我們由 ensure_connection 統一負責重連
            self.connection.ping(reconnect=False)
            return True
        except Exception:
            return False

    def ensure_connection(self):
        """確保資料庫連接正常，如果斷開則重新連接（不進入遞迴）"""
        try:
            if self.connection is None:
                self.connect()
                return
            # 試著檢查連線；失敗就重連
            self.connection.ping(reconnect=False)
        except Exception:
            print("⚠️  資料庫連接已斷開，嘗試重新連接...")
            self.connect()

    @contextmanager
    def get_cursor(self):
        """
        提供資料庫游標的上下文管理器

        Yields:
            pymysql.cursors.DictCursor: 資料庫游標
        """
        self.ensure_connection()
        cursor = self.connection.cursor(pymysql.cursors.DictCursor)  # Returns dict
        try:
            yield cursor
            self.connection.commit()
        except Exception as e:
            self.connection.rollback()
            raise e
        finally:
            cursor.close()

    def execute_query(
        self,
        query: str,
        params: Optional[Tuple] = None
    ) -> List[Dict[str, Any]]:
        """
        執行查詢並返回結果

        Args:
            query: SQL 查詢語句
            params: 查詢參數

        Returns:
            List[Dict]: 查詢結果列表
        """
        with self.get_cursor() as cursor:
            cursor.execute(query, params or ())
            return cursor.fetchall()

    def execute_one(
        self,
        query: str,
        params: Optional[Tuple] = None
    ) -> Optional[Dict[str, Any]]:
        """
        執行查詢並返回單一結果

        Args:
            query: SQL 查詢語句
            params: 查詢參數

        Returns:
            Optional[Dict]: 查詢結果或 None
        """
        with self.get_cursor() as cursor:
            cursor.execute(query, params or ())
            return cursor.fetchone()

    def execute_update(
        self,
        query: str,
        params: Optional[Tuple] = None
    ) -> int:
        """
        執行更新操作

        Args:
            query: SQL 更新語句
            params: 更新參數

        Returns:
            int: 影響的行數
        """
        with self.get_cursor() as cursor:
            affected_rows = cursor.execute(query, params or ())
            return affected_rows

    def execute_insert(self, query: str, params: Optional[Tuple] = None) -> int:
        """
        執行原生 SQL 的 INSERT 並回傳 lastrowid
        """
        with self.get_cursor() as cursor:
            cursor.execute(query, params or ())
            return cursor.lastrowid

    def insert(
        self,
        table: str,
        data: Dict[str, Any]
    ) -> int:
        """
        插入資料並返回 ID

        Args:
            table: 表格名稱
            data: 要插入的資料字典

        Returns:
            int: 新插入記錄的 ID
        """
        columns = ', '.join(data.keys())
        placeholders = ', '.join(['%s'] * len(data))
        query = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"

        with self.get_cursor() as cursor:
            cursor.execute(query, tuple(data.values()))
            return cursor.lastrowid

    def update(
        self,
        table: str,
        data: Dict[str, Any],
        where: Dict[str, Any]
    ) -> int:
        """
        更新資料

        Args:
            table: 表格名稱
            data: 要更新的資料字典
            where: WHERE 條件字典

        Returns:
            int: 影響的行數
        """
        set_clause = ', '.join([f"{k} = %s" for k in data.keys()])
        where_clause = ' AND '.join([f"{k} = %s" for k in where.keys()])
        query = f"UPDATE {table} SET {set_clause} WHERE {where_clause}"

        with self.get_cursor() as cursor:
            params = tuple(data.values()) + tuple(where.values())
            return cursor.execute(query, params)

    def delete(
        self,
        table: str,
        where: Dict[str, Any]
    ) -> int:
        """
        刪除資料

        Args:
            table: 表格名稱
            where: WHERE 條件字典

        Returns:
            int: 影響的行數
        """
        where_clause = ' AND '.join([f"{k} = %s" for k in where.keys()])
        query = f"DELETE FROM {table} WHERE {where_clause}"

        with self.get_cursor() as cursor:
            return cursor.execute(query, tuple(where.values()))

    def get_table_list(self) -> List[str]:
        """
        獲取資料庫中所有表格名稱

        Returns:
            List[str]: 表格名稱列表
        """
        query = "SHOW TABLES"
        results = self.execute_query(query)
        # 表格名稱在結果的第一個值中
        return [list(row.values())[0] for row in results]

    def get_mysql_version(self) -> str:
        """
        獲取 MySQL 版本

        Returns:
            str: MySQL 版本號
        """
        result = self.execute_one("SELECT VERSION() as version")
        return result['version'] if result else "Unknown"

    def close(self):
        """關閉資料庫連接"""
        if self.connection:
            self.connection.close()
            print("✅ 資料庫連接已關閉")


# 建立全域資料庫實例
db = Database()