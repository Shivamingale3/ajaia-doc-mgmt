export type DocumentRole = 'owner' | 'shared';

/** List-view shape — no content, so listing many documents stays cheap. */
export interface DocumentSummary {
  id: string;
  title: string;
  role: DocumentRole;
  ownerName: string;
  updatedAt: Date;
  createdAt: Date;
}

export interface DocumentDetail extends DocumentSummary {
  content: string;
}

export interface ShareEntry {
  userId: string;
  email: string;
  name: string;
  sharedAt: Date;
}

export interface CreateDocumentInput {
  title?: string;
}

export interface UpdateDocumentInput {
  title?: string;
  content?: string;
}
