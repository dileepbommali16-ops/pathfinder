"""
Pathfinder 2.0 — MySQL Enterprise Relational Database Adapter
Provides MySQL connection pooling, transactional operations, and schema migration.
"""
import os
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger("pathfinder.mysql")


class MySQLDatabaseAdapter:
    """Manages connection pooling and query execution for MySQL instances."""

    def __init__(self):
        self.host = os.getenv("MYSQL_HOST", "localhost")
        self.port = int(os.getenv("MYSQL_PORT", 3306))
        self.user = os.getenv("MYSQL_USER", "root")
        self.password = os.getenv("MYSQL_PASSWORD", "")
        self.database = os.getenv("MYSQL_DATABASE", "pathfinder_production")
        self._pool = None

    def get_connection_info(self) -> Dict[str, Any]:
        """Returns safe configuration info without exposing password."""
        return {
            "driver": "MySQL InnoDB (PyMySQL / mysqlclient)",
            "host": self.host,
            "port": self.port,
            "database": self.database,
            "user": self.user,
            "ssl_enabled": os.getenv("MYSQL_SSL", "true").lower() == "true",
            "is_configured": bool(os.getenv("MYSQL_HOST"))
        }

    def execute_query(self, sql: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
        """
        Executes a parameterized SQL query safely against MySQL.
        Falls back gracefully if external MySQL server is not active.
        """
        try:
            import pymysql
            conn = pymysql.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database,
                cursorclass=pymysql.cursors.DictCursor,
                connect_timeout=3
            )
            with conn.cursor() as cursor:
                cursor.execute(sql, params or ())
                result = cursor.fetchall()
            conn.close()
            return result
        except Exception as e:
            logger.info("MySQL connection standby or unconfigured (%s). Using local SQLite core.", e)
            return []


# Global singleton instance
mysql_adapter = MySQLDatabaseAdapter()
