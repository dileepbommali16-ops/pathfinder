"""
Pathfinder 2.0 - Backup & Restore Automation (Security Point 19)
Creates timestamped backup archives of database/cohort datasets and verifies restore integrity.
"""
import os
import sys
import shutil
import hashlib
from pathlib import Path
from datetime import datetime

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKUP_DIR = ROOT_DIR / "backups"
DATA_SOURCE = ROOT_DIR / "sample-placement-2024-2026.csv"

def compute_checksum(filepath: Path) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()

def backup_data() -> Path:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    backup_file = BACKUP_DIR / f"cohort_backup_{timestamp}.csv"
    
    if not DATA_SOURCE.exists():
        raise FileNotFoundError(f"Source data file {DATA_SOURCE} not found.")
        
    shutil.copy2(DATA_SOURCE, backup_file)
    src_hash = compute_checksum(DATA_SOURCE)
    dst_hash = compute_checksum(backup_file)
    
    if src_hash != dst_hash:
        raise ValueError("Backup integrity failure: Hash mismatch between source and destination.")
        
    print(f"[Backup] Successfully created verified backup: {backup_file.name} (SHA256: {dst_hash[:12]}...)")
    return backup_file

def test_restore(backup_file: Path) -> bool:
    print("[Restore Test] Testing restore to temporary verification sandbox...")
    sandbox_target = BACKUP_DIR / "sandbox_restore_verify.csv"
    shutil.copy2(backup_file, sandbox_target)
    
    b_hash = compute_checksum(backup_file)
    s_hash = compute_checksum(sandbox_target)
    
    if b_hash != s_hash:
        print("[Restore Test FAILED] Checksum mismatch during restore.")
        return False
        
    # Read sandbox to verify data lines
    with open(sandbox_target, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    if len(lines) < 2:
        print("[Restore Test FAILED] Restored file has no record rows.")
        return False
        
    print(f"[Restore Test PASSED] Validated {len(lines):,} records restored cleanly without corruption.")
    
    # Cleanup sandbox test file
    sandbox_target.unlink()
    return True

if __name__ == "__main__":
    b_file = backup_data()
    success = test_restore(b_file)
    sys.exit(0 if success else 1)
