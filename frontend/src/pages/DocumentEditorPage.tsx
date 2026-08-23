import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Button } from '@/components/ui/button';
import { EditorToolbar } from '../components/documents/EditorToolbar';
import { ShareDialog } from '../components/documents/ShareDialog';
import {
  documentQueryOptions,
  useDeleteDocumentMutation,
  useUpdateDocumentMutation,
} from '../queries/documents.queries';
import { ROUTE_PATHS } from '../constants/route-paths.constants';
import type { DocumentDetail } from '../types/api.types';

const AUTOSAVE_DELAY_MS = 1500;

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

function SaveStatusLabel({ status }: { status: SaveStatus }) {
  const label = {
    saved: 'Saved',
    saving: 'Saving…',
    unsaved: 'Unsaved changes',
    error: 'Failed to save',
  }[status];

  return (
    <span
      className={
        status === 'error' ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'
      }
    >
      {label}
    </span>
  );
}

/** Keyed by document id in the parent, so this remounts (and its editor
 * state resets) when navigating from one document straight to another. */
function DocumentEditor({ document }: { document: DocumentDetail }) {
  const navigate = useNavigate();
  const updateMutation = useUpdateDocumentMutation(document.id);
  const deleteMutation = useDeleteDocumentMutation();

  const [title, setTitle] = useState(document.title);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [shareOpen, setShareOpen] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: document.content,
    onUpdate: () => {
      scheduleSave();
    },
  });

  function save(): void {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    setStatus('saving');
    updateMutation.mutate(
      { title, content: editor?.getHTML() ?? document.content },
      {
        onSuccess: () => {
          setStatus('saved');
        },
        onError: () => {
          setStatus('error');
        },
      },
    );
  }

  function scheduleSave(): void {
    setStatus('unsaved');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(save, AUTOSAVE_DELAY_MS);
  }

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  function handleDelete(): void {
    if (!window.confirm(`Delete "${document.title}"? This can't be undone.`)) {
      return;
    }

    deleteMutation.mutate(document.id, {
      onSuccess: () => {
        void navigate({ to: ROUTE_PATHS.DOCUMENTS });
      },
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <Link to={ROUTE_PATHS.DOCUMENTS} className="text-sm text-muted-foreground underline">
          ← Documents
        </Link>
        <div className="flex items-center gap-3">
          <SaveStatusLabel status={status} />
          <Button variant="outline" size="sm" onClick={save} disabled={status === 'saving'}>
            Save
          </Button>
          {document.role === 'owner' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShareOpen(true);
                }}
              >
                Share
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          scheduleSave();
        }}
        className="border-none bg-transparent text-3xl font-semibold outline-none"
        aria-label="Document title"
      />

      {document.role === 'shared' && (
        <p className="text-xs text-muted-foreground">Shared by {document.ownerName}</p>
      )}

      {editor && (
        <div className="flex flex-col gap-3">
          <EditorToolbar editor={editor} />
          <EditorContent
            editor={editor}
            className="min-h-[50vh] text-base leading-relaxed [&_.tiptap]:outline-none [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
          />
        </div>
      )}

      {document.role === 'owner' && (
        <ShareDialog documentId={document.id} open={shareOpen} onOpenChange={setShareOpen} />
      )}
    </div>
  );
}

export function DocumentEditorPage({ id }: { id: string }) {
  const { data: document, isLoading, error } = useQuery(documentQueryOptions(id));

  if (isLoading) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>;
  }

  if (error || !document) {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <p className="text-sm text-destructive">
          This document doesn't exist, or you don't have access to it.
        </p>
        <Link to={ROUTE_PATHS.DOCUMENTS} className="text-sm underline">
          Back to documents
        </Link>
      </div>
    );
  }

  return <DocumentEditor key={document.id} document={document} />;
}
