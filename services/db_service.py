# -*- coding: utf-8 -*-
"""
@license
SPDX-License-Identifier: Apache-2.0
"""

import os
import json
from typing import List, Optional
from models.audit import AuditReport

DATA_DIR = os.environ.get("DATA_DIR", os.getcwd())
DB_FILE = os.path.join(DATA_DIR, "audits_db.json")

class DbService:
    @staticmethod
    def _init_db() -> None:
        """Initializes the JSON database file if it does not exist."""
        try:
            if not os.path.exists(DB_FILE):
                print(f"[Database] Initializing new JSON database file at: {DB_FILE}")
                with open(DB_FILE, "w", encoding="utf-8") as f:
                    json.dump([], f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[Database Error] Fails to initialize database file: {str(e)}")

    @staticmethod
    def get_reports() -> List[AuditReport]:
        """Reads and returns all audited reports from the JSON database."""
        DbService._init_db()
        try:
            if not os.path.exists(DB_FILE):
                return []
            with open(DB_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [AuditReport(**item) for item in data]
        except Exception as e:
            print(f"[Database Error] Fails to parse database reports: {str(e)}")
            return []

    @staticmethod
    def get_report_by_id(report_id: str) -> Optional[AuditReport]:
        """Fetches an audit report by its unique ID."""
        reports = DbService.get_reports()
        for r in reports:
            if r.id == report_id:
                return r
        return None

    @staticmethod
    def save_report(report: AuditReport) -> None:
        """Saves a new audit report or updates an existing one."""
        DbService._init_db()
        try:
            reports = DbService.get_reports()
            
            # Find if report already exists and update, otherwise append
            index = -1
            for idx, r in enumerate(reports):
                if r.id == report.id:
                    index = idx
                    break
            
            report_dict = report.model_dump()
            if index >= 0:
                reports[index] = report
                print(f"[Database] Updated existing report ID '{report.id}' for URL: {report.url}")
            else:
                reports.append(report)
                print(f"[Database] Inserted new report ID '{report.id}' for URL: {report.url}")

            # Write back to file
            with open(DB_FILE, "w", encoding="utf-8") as f:
                # Use model_dump for perfect dict conversion
                serialized = [r.model_dump() for r in reports]
                json.dump(serialized, f, indent=2, ensure_ascii=False)
                
        except Exception as e:
            print(f"[Database Error] Fails to save report '{report.id}': {str(e)}")
            raise e

    @staticmethod
    def delete_report(report_id: str) -> bool:
        """Deletes a report by ID. Returns True if deleted, False otherwise."""
        DbService._init_db()
        try:
            reports = DbService.get_reports()
            initial_count = len(reports)
            filtered = [r for r in reports if r.id != report_id]
            
            if len(filtered) < initial_count:
                with open(DB_FILE, "w", encoding="utf-8") as f:
                    serialized = [r.model_dump() for r in filtered]
                    json.dump(serialized, f, indent=2, ensure_ascii=False)
                print(f"[Database] Deleted report ID: {report_id}")
                return True
            return False
        except Exception as e:
            print(f"[Database Error] Fails to delete report '{report_id}': {str(e)}")
            return False

    @staticmethod
    def clear_all_reports() -> bool:
        """Deletes all audit reports from the database."""
        DbService._init_db()
        try:
            with open(DB_FILE, "w", encoding="utf-8") as f:
                json.dump([], f, indent=2, ensure_ascii=False)
            print("[Database] Cleared all reports successfully.")
            return True
        except Exception as e:
            print(f"[Database Error] Fails to clear database: {str(e)}")
            return False

