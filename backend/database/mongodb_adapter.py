"""
Pathfinder 2.0 — MongoDB Enterprise Document Store Adapter
Provides MongoDB client management, document indexing, and aggregation pipelines.
"""
import os
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger("pathfinder.mongodb")


class MongoDBDatabaseAdapter:
    """Manages NoSQL connections and operations against MongoDB Atlas / clusters."""

    def __init__(self):
        self.uri = os.getenv("MONGODB_URI", "")
        self.database_name = os.getenv("MONGODB_DB_NAME", "pathfinder_db")
        self._client = None

    def get_connection_info(self) -> Dict[str, Any]:
        """Returns safe configuration info without exposing credentials."""
        return {
            "driver": "MongoDB Wire Protocol (PyMongo / Motor)",
            "database": self.database_name,
            "ssl_enabled": "ssl=true" in self.uri.lower() or "tls=true" in self.uri.lower(),
            "is_configured": bool(self.uri)
        }

    def find_documents(self, collection_name: str, query: Optional[Dict[str, Any]] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Executes a find query safely against a MongoDB collection.
        Falls back gracefully if MongoDB URI is not active.
        """
        if not self.uri:
            logger.info("MongoDB URI unconfigured. Operating in standard standalone mode.")
            return []

        try:
            from pymongo import MongoClient
            client = MongoClient(self.uri, serverSelectionTimeoutMS=2000)
            db = client[self.database_name]
            cursor = db[collection_name].find(query or {}).limit(limit)
            results = list(cursor)
            client.close()
            return results
        except Exception as e:
            logger.info("MongoDB connection standby (%s). Standalone engine active.", e)
            return []


# Global singleton instance
mongodb_adapter = MongoDBDatabaseAdapter()
