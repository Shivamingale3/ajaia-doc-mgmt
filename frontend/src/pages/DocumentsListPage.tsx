import { useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ApiError } from '../lib/api-client';
import {
  documentsListQueryOptions,
  useCreateDocumentMutation,
  useUploadDocumentMutation,
} from '../queries/documents.queries';
import { ROUTE_PATHS } from '../constants/route-paths.constants';
import type { DocumentSummary } from '../types/api.types';

const UPLOAD_ACCEPT = '.txt,.md';

function formatUpdatedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function DocumentRow({ document }: { document: DocumentSummary }) {
  return (
    <Link
      to={ROUTE_PATHS.DOCUMENT_DETAIL}
      params={{ id: document.id }}
      className="flex items-center justify-between border-b border-border px-1 py-3 last:border-b-0 hover:bg-muted"
    >
      <div className="flex flex-col">
        <span className="font-medium">{document.title}</span>
        {document.role === 'shared' && (
          <span className="text-xs text-muted-foreground">Shared by {document.ownerName}</span>
        )}
      </div>
      <span className="text-xs text-muted-foreground">{formatUpdatedAt(document.updatedAt)}</span>
    </Link>
  );
}

export function DocumentsListPage() {
  const navigate = useNavigate();
  const { data: documents, isLoading, error } = useQuery(documentsListQueryOptions);
  const createMutation = useCreateDocumentMutation();
  const uploadMutation = useUploadDocumentMutation();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCreate(): void {
    createMutation.mutate(undefined, {
      onSuccess: (document) => {
        void navigate({ to: ROUTE_PATHS.DOCUMENT_DETAIL, params: { id: document.id } });
      },
    });
  }

  function handleUploadClick(): void {
    setUploadError(null);
    fileInputRef.current?.click();
  }

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    uploadMutation.mutate(file, {
      onSuccess: (document) => {
        void navigate({ to: ROUTE_PATHS.DOCUMENT_DETAIL, params: { id: document.id } });
      },
      onError: (err) => {
        setUploadError(err instanceof ApiError ? err.message : 'Upload failed. Try again.');
      },
    });
  }

  const owned = documents?.filter((doc) => doc.role === 'owner') ?? [];
  const shared = documents?.filter((doc) => doc.role === 'shared') ?? [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={UPLOAD_ACCEPT}
            className="hidden"
            onChange={handleFileSelected}
          />
          <Button
            variant="outline"
            onClick={handleUploadClick}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? 'Uploading…' : 'Upload'}
          </Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'New document'}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Upload supports .txt and .md files — the file becomes a new document.
      </p>
      {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Couldn't load documents.</p>}

      {documents && (
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              My documents
            </h2>
            {owned.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No documents yet — create one to get started.
              </p>
            ) : (
              <div>
                {owned.map((doc) => (
                  <DocumentRow key={doc.id} document={doc} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Shared with me
            </h2>
            {shared.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing has been shared with you yet.</p>
            ) : (
              <div>
                {shared.map((doc) => (
                  <DocumentRow key={doc.id} document={doc} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
