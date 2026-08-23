import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApiError } from '../../lib/api-client';
import {
  documentSharesQueryOptions,
  useRevokeShareMutation,
  useShareDocumentMutation,
} from '../../queries/documents.queries';

interface ShareDialogProps {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ documentId, open, onOpenChange }: ShareDialogProps) {
  const { data: shares } = useQuery({
    ...documentSharesQueryOptions(documentId),
    enabled: open,
  });
  const shareMutation = useShareDocumentMutation(documentId);
  const revokeMutation = useRevokeShareMutation(documentId);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleShare(event: React.FormEvent): void {
    event.preventDefault();
    setError(null);

    shareMutation.mutate(email, {
      onSuccess: () => {
        setEmail('');
      },
      onError: (err) => {
        setError(err instanceof ApiError ? err.message : 'Could not share the document.');
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription>
            Anyone you share with can view and edit this document.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleShare} className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="share-email">Email</Label>
            <Input
              id="share-email"
              type="email"
              placeholder="teammate@example.com"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
            />
          </div>
          <Button type="submit" disabled={shareMutation.isPending}>
            {shareMutation.isPending ? 'Sharing…' : 'Share'}
          </Button>
        </form>
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Shared with
          </span>
          {!shares || shares.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one yet.</p>
          ) : (
            shares.map((share) => (
              <div key={share.userId} className="flex items-center justify-between text-sm">
                <span>
                  {share.name} <span className="text-muted-foreground">({share.email})</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={revokeMutation.isPending}
                  onClick={() => {
                    revokeMutation.mutate(share.userId);
                  }}
                >
                  Revoke
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
