import { db } from '../infra/db.js';
import { HttpException } from '../exceptions/http.exception.js';
import { sanitizeContent } from '../utils/sanitizeContent.js';
import { DEFAULT_DOCUMENT_TITLE } from '../validationSchemas/document.schema.js';
import type {
  CreateDocumentInput,
  DocumentDetail,
  DocumentRole,
  DocumentSummary,
  ShareEntry,
  UpdateDocumentInput,
} from '../interfaces/document.interfaces.js';

/** Fields needed to resolve access + render a document; never over-fetches shares. */
const DOCUMENT_WITH_OWNER_SELECT = {
  id: true,
  title: true,
  content: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { firstName: true, lastName: true } },
} as const;

interface DocumentWithOwner {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  owner: { firstName: string; lastName: string };
}

class DocumentService {
  public async create(userId: string, input: CreateDocumentInput): Promise<DocumentDetail> {
    const document = await db.document.create({
      data: {
        title: input.title ?? DEFAULT_DOCUMENT_TITLE,
        content: '',
        ownerId: userId,
      },
      select: DOCUMENT_WITH_OWNER_SELECT,
    });

    return this.toDetail(document, 'owner');
  }

  /** Used by the upload flow: same shape as create, with pre-populated content. */
  public async createWithContent(
    userId: string,
    title: string,
    rawHtml: string,
  ): Promise<DocumentDetail> {
    const document = await db.document.create({
      data: {
        title,
        content: sanitizeContent(rawHtml),
        ownerId: userId,
      },
      select: DOCUMENT_WITH_OWNER_SELECT,
    });

    return this.toDetail(document, 'owner');
  }

  /** Owned and shared-with-me documents, each tagged with the caller's role. */
  public async listForUser(userId: string): Promise<DocumentSummary[]> {
    const [owned, shared] = await Promise.all([
      db.document.findMany({
        where: { ownerId: userId },
        select: DOCUMENT_WITH_OWNER_SELECT,
        orderBy: { updatedAt: 'desc' },
      }),
      db.document.findMany({
        where: { shares: { some: { userId } } },
        select: DOCUMENT_WITH_OWNER_SELECT,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return [
      ...owned.map((doc) => this.toSummary(doc, 'owner')),
      ...shared.map((doc) => this.toSummary(doc, 'shared')),
    ];
  }

  public async getById(documentId: string, userId: string): Promise<DocumentDetail> {
    const { document, role } = await this.resolveAccess(documentId, userId);

    return this.toDetail(document, role);
  }

  /** Owner and shared users can both rename/edit — sharing is single-tier (full edit). */
  public async update(
    documentId: string,
    userId: string,
    input: UpdateDocumentInput,
  ): Promise<DocumentDetail> {
    const { role } = await this.resolveAccess(documentId, userId);

    const document = await db.document.update({
      where: { id: documentId },
      data: {
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.content === undefined ? {} : { content: sanitizeContent(input.content) }),
      },
      select: DOCUMENT_WITH_OWNER_SELECT,
    });

    return this.toDetail(document, role);
  }

  public async remove(documentId: string, userId: string): Promise<void> {
    await this.assertOwner(documentId, userId);

    await db.document.delete({ where: { id: documentId } });
  }

  public async share(
    documentId: string,
    ownerId: string,
    targetEmail: string,
  ): Promise<ShareEntry> {
    await this.assertOwner(documentId, ownerId);

    const target = await db.user.findUnique({
      where: { email: targetEmail },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!target) {
      throw new HttpException(404, 'No account found with that email');
    }

    if (target.id === ownerId) {
      throw new HttpException(400, "You can't share a document with yourself");
    }

    // Upsert: sharing with someone who already has access is a no-op success,
    // not an error — the unique constraint on [documentId, userId] is what
    // makes that safe under concurrent requests.
    const share = await db.documentShare.upsert({
      where: { documentId_userId: { documentId, userId: target.id } },
      update: {},
      create: { documentId, userId: target.id },
    });

    return {
      userId: target.id,
      email: target.email,
      name: `${target.firstName} ${target.lastName}`,
      sharedAt: share.createdAt,
    };
  }

  /** Idempotent: revoking access that no longer exists is a success, not an error. */
  public async revokeShare(
    documentId: string,
    ownerId: string,
    targetUserId: string,
  ): Promise<void> {
    await this.assertOwner(documentId, ownerId);

    await db.documentShare.deleteMany({ where: { documentId, userId: targetUserId } });
  }

  public async listShares(documentId: string, ownerId: string): Promise<ShareEntry[]> {
    await this.assertOwner(documentId, ownerId);

    const shares = await db.documentShare.findMany({
      where: { documentId },
      select: {
        userId: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return shares.map((share) => ({
      userId: share.userId,
      email: share.user.email,
      name: `${share.user.firstName} ${share.user.lastName}`,
      sharedAt: share.createdAt,
    }));
  }

  /**
   * Resolves whether `userId` may access `documentId` at all, and as what role.
   *
   * A caller with no relationship to the document gets the same 404 as a
   * document that doesn't exist — existence is only revealed to participants.
   * Owner-only actions layer `assertOwner` on top of this, which is allowed to
   * answer with 403 instead, since a shared (non-owner) caller already
   * legitimately knows the document exists.
   */
  private async resolveAccess(
    documentId: string,
    userId: string,
  ): Promise<{ document: DocumentWithOwner; role: DocumentRole }> {
    const document = await db.document.findUnique({
      where: { id: documentId },
      select: DOCUMENT_WITH_OWNER_SELECT,
    });

    if (!document) {
      throw new HttpException(404, 'Document not found');
    }

    if (document.ownerId === userId) {
      return { document, role: 'owner' };
    }

    const share = await db.documentShare.findUnique({
      where: { documentId_userId: { documentId, userId } },
    });

    if (!share) {
      throw new HttpException(404, 'Document not found');
    }

    return { document, role: 'shared' };
  }

  private async assertOwner(documentId: string, userId: string): Promise<DocumentWithOwner> {
    const { document, role } = await this.resolveAccess(documentId, userId);

    if (role !== 'owner') {
      throw new HttpException(403, 'Only the document owner can do this');
    }

    return document;
  }

  private toSummary(document: DocumentWithOwner, role: DocumentRole): DocumentSummary {
    return {
      id: document.id,
      title: document.title,
      role,
      ownerName: `${document.owner.firstName} ${document.owner.lastName}`,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  private toDetail(document: DocumentWithOwner, role: DocumentRole): DocumentDetail {
    return {
      ...this.toSummary(document, role),
      content: document.content,
    };
  }
}

const documentService = new DocumentService();

export default documentService;
