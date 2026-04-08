"""Supabase client for notifications service."""
from __future__ import annotations

import os
import logging

from supabase import create_client, Client

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client | None = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized successfully")
    except Exception as e:
        logger.error("Failed to initialize Supabase client: %s", e)
        supabase = None
else:
    logger.warning("Supabase credentials not provided. Persistence disabled.")
