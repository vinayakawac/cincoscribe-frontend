import React from 'react';

/**
 * KofiButton — one static anchor tag. No SDK, no script, no tracking.
 *
 * GATE 5 requirement: renders exactly:
 *   <a href="https://ko-fi.com/[handle]" target="_blank">Support on Ko-fi</a>
 *
 * Props:
 *   handle  string  Ko-fi username (no @ prefix)
 */
export function KofiButton({ handle = 'vinayaka' }) {
  return (
    <a
      href={`https://ko-fi.com/${handle}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg bg-[#FF5E5B] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
    >
      {/* Ko-fi heart icon — inline SVG, no external dependency */}
      <svg
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 21.593c-.425-.396-8.743-7.96-8.743-13.097C3.257 4.24 7.363 2 12 2s8.743 2.24 8.743 6.496c0 5.137-8.318 12.7-8.743 13.097z" />
      </svg>
      Support on Ko-fi
    </a>
  );
}
