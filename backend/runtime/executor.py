import sqlite3
import os
from typing import List, Dict, Any
from schemas.app_config import AppConfig

class RuntimeExecutor:
    def __init__(self, db_path: str = "database/runtime_test.db"):
        self.db_path = db_path
        self.logs = []

    def execute(self, config: AppConfig) -> Dict[str, Any]:
        self.logs = []
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
            
        try:
            # 1. Connect to SQLite
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            self.logs.append("Successfully connected to SQLite engine.")
            
            # 2. Execute SQL for each table
            tables_created = 0
            for table in config.db.tables:
                columns = []
                for col in table.columns:
                    col_def = f"{col.name} {col.type}"
                    if col.primary_key: col_def += " PRIMARY KEY"
                    if not col.nullable: col_def += " NOT NULL"
                    if col.unique: col_def += " UNIQUE"
                    columns.append(col_def)
                
                sql = f"CREATE TABLE {table.name} ({', '.join(columns)});"
                self.logs.append(f"Executing: {sql}")
                cursor.execute(sql)
                tables_created += 1
            
            conn.commit()
            conn.close()
            
            # 3. Simulate API registration
            self.logs.append(f"Registered {len(config.api.endpoints)} API endpoints in mock router.")
            
            return {
                "status": "success",
                "tables_created": tables_created,
                "endpoints_registered": len(config.api.endpoints),
                "logs": self.logs
            }
        except Exception as e:
            self.logs.append(f"Simulation Error: {str(e)}")
            return {
                "status": "failed",
                "logs": self.logs
            }
