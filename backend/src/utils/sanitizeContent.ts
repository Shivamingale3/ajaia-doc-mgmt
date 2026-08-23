import sanitizeHtml from 'sanitize-html';

/**
 * Allowlist matching exactly the Tiptap extensions enabled on the frontend
 * (paragraph, bold, italic, underline, heading, bullet/ordered lists). Applied
 * to every piece of content before it reaches Postgres — both editor saves and
 * markdown-converted uploads — so nothing outside what the editor itself can
 * produce ever gets persisted, regardless of what a client or an uploaded file
 * claims to contain.
 *
 * This is defense-in-depth: Tiptap's own ProseMirror parser is already
 * schema-constrained (it silently drops tags/attributes it doesn't recognize),
 * but stored content should be safe on its own terms, not only when it happens
 * to pass back through Tiptap.
 */
const ALLOWED_TAGS = ['p', 'h1', 'h2', 'h3', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'br'];

export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {},
    // Collapses anything sanitize-html would otherwise strip down to its text,
    // rather than dropping the text along with the tag — an upload with a
    // stray <script> should lose the tag, not the sentence it was next to.
    disallowedTagsMode: 'discard',
  });
}
