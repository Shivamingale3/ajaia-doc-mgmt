import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api-client';
import type { DocumentDetail, DocumentSummary, ShareEntry } from '../types/api.types';

export const documentsListQueryKey = ['documents'] as const;
export const documentQueryKey = (id: string) => ['documents', id] as const;
export const documentSharesQueryKey = (id: string) => ['documents', id, 'shares'] as const;

export const documentsListQueryOptions = queryOptions({
  queryKey: documentsListQueryKey,
  queryFn: () => apiGet<DocumentSummary[]>('/documents'),
});

export function documentQueryOptions(id: string) {
  return queryOptions({
    queryKey: documentQueryKey(id),
    queryFn: () => apiGet<DocumentDetail>(`/documents/${id}`),
  });
}

export function documentSharesQueryOptions(id: string) {
  return queryOptions({
    queryKey: documentSharesQueryKey(id),
    queryFn: () => apiGet<ShareEntry[]>(`/documents/${id}/shares`),
  });
}

export function useCreateDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title?: string) => apiPost<DocumentDetail>('/documents', { title }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentsListQueryKey });
    },
  });
}

export function useUploadDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiPost<DocumentDetail>('/documents/upload', formData);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentsListQueryKey });
    },
  });
}

export function useUpdateDocumentMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { title?: string; content?: string }) =>
      apiPatch<DocumentDetail>(`/documents/${id}`, input),
    onSuccess: (document) => {
      queryClient.setQueryData(documentQueryKey(id), document);
      void queryClient.invalidateQueries({ queryKey: documentsListQueryKey });
    },
  });
}

export function useDeleteDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiDelete<null>(`/documents/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentsListQueryKey });
    },
  });
}

export function useShareDocumentMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email: string) => apiPost<ShareEntry>(`/documents/${id}/shares`, { email }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentSharesQueryKey(id) });
    },
  });
}

export function useRevokeShareMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => apiDelete<null>(`/documents/${id}/shares/${userId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: documentSharesQueryKey(id) });
    },
  });
}
