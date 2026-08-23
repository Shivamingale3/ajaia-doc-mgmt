import { marked } from 'marked';

/** Extensions accepted by the upload endpoint — kept in sync with the multer
 * file filter in document.routes.ts and with the frontend's <input accept>. */
export type UploadableExtension = 'txt' | 'md';

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Blank-line-separated paragraphs, each escaped and wrapped in <p>. */
function txtToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * Converts an uploaded file's raw text into HTML matching what the editor
 * itself produces. The result still passes through sanitizeContent() before
 * being persisted (see document.service.ts) — marked renders raw HTML found
 * in the source verbatim, so that sanitize pass is what actually keeps this
 * safe, not anything done here.
 */
export function fileToHtml(extension: UploadableExtension, text: string): string {
  if (extension === 'md') {
    const result = marked.parse(text, { async: false, gfm: true });
    return typeof result === 'string' ? result : '';
  }

  return txtToHtml(text);
}
