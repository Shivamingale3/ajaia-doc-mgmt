/** Mirrors backend/src/interfaces/*.interfaces.ts. Dates arrive as ISO
 * strings over JSON, not Date instances, so they're typed as `string` here. */

export interface PublicUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

export type DocumentRole = 'owner' | 'shared';

export interface DocumentSummary {
  id: string;
  title: string;
  role: DocumentRole;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDetail extends DocumentSummary {
  content: string;
}

export interface ShareEntry {
  userId: string;
  email: string;
  name: string;
  sharedAt: string;
}
