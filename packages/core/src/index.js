// ─────────────────────────────────────────────────────────────────────────────
// @cincoscribe/core — shared types, schema, and business logic
// Framework-agnostic. No Electron, React, or Node-specific imports.
// ─────────────────────────────────────────────────────────────────────────────

// ── Transcript ───────────────────────────────────────────────────────────────

/**
 * @typedef {Object} TranscriptChunk
 * @property {[number, number]} timestamp  [startSec, endSec]
 * @property {string}           text
 */

/**
 * @typedef {Object} TranscriptResult
 * @property {string}            text    Full concatenated transcript
 * @property {TranscriptChunk[]} chunks  Timestamped segments
 */

// ── TTS ──────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} TTSRequest
 * @property {string} text    Text to synthesize (max 2000 chars)
 * @property {string} voice   Voice name (e.g. "default", "en-us")
 * @property {number} [speed] Playback speed multiplier (0.5–2.0, default 1.0)
 */

/**
 * @typedef {Object} TTSResponse
 * @property {boolean} success
 * @property {string}  [error]       Present on failure
 * @property {number}  [duration]    Audio duration in seconds
 * @property {number}  [word_count]
 */

// ── History ──────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} HistoryEntry
 * @property {string} id
 * @property {string} name
 * @property {string} mode          Model or engine label
 * @property {string} language
 * @property {number} duration
 * @property {number} wordCount
 * @property {number} segmentCount
 * @property {string} text
 * @property {string} createdAt     ISO 8601
 */

// ── Sync (web — future, types only) ──────────────────────────────────────────

/**
 * @typedef {Object} SyncRecord
 * @property {string} id
 * @property {string} userId        NULL for local-only mode
 * @property {string} type          'transcript' | 'tts'
 * @property {string} payload       JSON-serialized content
 * @property {string} createdAt     ISO 8601
 * @property {string} [updatedAt]
 */

// ── Sidecar API contract ──────────────────────────────────────────────────────

/** Port the FastAPI sidecar listens on */
const SIDECAR_PORT = 5555;

/** Base URL for sidecar HTTP calls */
const SIDECAR_BASE = `http://127.0.0.1:${SIDECAR_PORT}`;

module.exports = { SIDECAR_PORT, SIDECAR_BASE };
