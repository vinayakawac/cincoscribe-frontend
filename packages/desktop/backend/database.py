"""
database.py — Database management for CincoScribe backend using standard library SQLite.
"""

import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import Generator
import config


def get_connection():
    db_path = config.get_db_path()
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize database tables for voices and voice_samples on startup."""
    conn = get_connection()
    try:
        with conn:
            # Table: voices (renamed from voice_profiles)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS voices (
                    id TEXT PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
                    description TEXT,
                    language TEXT DEFAULT 'en' NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
            """)
            # Table: voice_samples (renamed from profile_samples)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS voice_samples (
                    id TEXT PRIMARY KEY,
                    voice_id TEXT NOT NULL,
                    audio_path TEXT NOT NULL,
                    reference_text TEXT NOT NULL,
                    duration_sec REAL,
                    sample_rate INTEGER,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (voice_id) REFERENCES voices (id) ON DELETE CASCADE
                );
            """)
            # Legacy tables fallback for backward compatibility
            conn.execute("""
                CREATE TABLE IF NOT EXISTS voice_profiles (
                    id TEXT PRIMARY KEY,
                    name TEXT UNIQUE NOT NULL,
                    description TEXT,
                    language TEXT DEFAULT 'en' NOT NULL,
                    avatar_path TEXT,
                    effects_chain TEXT,
                    default_engine TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS profile_samples (
                    id TEXT PRIMARY KEY,
                    profile_id TEXT NOT NULL,
                    audio_path TEXT NOT NULL,
                    reference_text TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (profile_id) REFERENCES voice_profiles (id) ON DELETE CASCADE
                );
            """)
    finally:
        conn.close()


class DatabaseSession:
    def __init__(self):
        self.conn = get_connection()

    def close(self):
        self.conn.close()


def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Dependency provider for FastAPI route endpoints."""
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
