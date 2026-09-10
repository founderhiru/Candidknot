// @polsia:user-owned — Phase 4: health passport section for an existing
// owned dog. Rendered only on the edit page. Ownership is enforced
// server-side on every request; this component never assumes the dogId
// prop belongs to the signed-in user.
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, Plus, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api-client';
import {
  HEALTH_RECORD_TYPES,
  HealthRecordItem,
  HealthRecordWrite,
} from '@/lib/contracts/health-records';
import { applyServerErrors } from '@/lib/forms';

const TYPE_LABELS: Record<(typeof HEALTH_RECORD_TYPES)[number], string> = {
  vaccination: 'Vaccination',
  vetVisit: 'Vet visit',
  other: 'Other',
};

export function DogHealthSection({
  dogId,
  records,
  onChange,
}: {
  dogId: string;
  records: HealthRecordItem[];
  onChange: (records: HealthRecordItem[]) => void;
}) {
  const [adding, setAdding] = useState(false);

  const form = useForm<HealthRecordWrite>({
    resolver: zodResolver(HealthRecordWrite),
    defaultValues: { type: 'vaccination', title: '', occurredOn: '', vetName: '', notes: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const created = await apiFetch(`/api/dog-profiles/${dogId}/health-records`, {
        method: 'POST',
        body: JSON.stringify(values),
        schema: HealthRecordItem,
      });
      onChange([created, ...records]);
      form.reset({ type: 'vaccination', title: '', occurredOn: '', vetName: '', notes: '' });
      setAdding(false);
      toast.success('Health record added.');
    } catch (err) {
      const applied = err instanceof Error && applyServerErrors(err.cause, form.setError);
      if (!applied) {
        toast.error('Something went wrong. Please try again.');
      }
    }
  });

  async function handleDeleteRecord(recordId: string) {
    try {
      const res = await fetch(`/api/dog-profiles/${dogId}/health-records/${recordId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        toast.error('Could not delete record.');
        return;
      }
      onChange(records.filter((r) => r.id !== recordId));
    } catch {
      toast.error('Could not delete record.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health passport</CardTitle>
        <CardDescription>
          Vaccinations, vet visits, and certificates. Visible only to you.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {records.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">No health records yet.</p>
        )}

        {records.map((record) => (
          <HealthRecordRow
            key={record.id}
            dogId={dogId}
            record={record}
            onDelete={() => handleDeleteRecord(record.id)}
            onDocumentsChange={(documents) =>
              onChange(records.map((r) => (r.id === record.id ? { ...r, documents } : r)))
            }
          />
        ))}

        {adding ? (
          <Form {...form}>
            <form
              onSubmit={onSubmit}
              className="flex flex-col gap-3 rounded-md border p-3"
              noValidate
            >
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HEALTH_RECORD_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Rabies vaccine" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="occurredOn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vetName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vet name (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Dr. Rao" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving…' : 'Save record'}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Button type="button" variant="secondary" size="sm" onClick={() => setAdding(true)}>
            <Plus className="mr-2 size-4" />
            Add a record
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function HealthRecordRow({
  dogId,
  record,
  onDelete,
  onDocumentsChange,
}: {
  dogId: string;
  record: HealthRecordItem;
  onDelete: () => void;
  onDocumentsChange: (documents: HealthRecordItem['documents']) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/dog-profiles/${dogId}/health-records/${record.id}/documents`, {
        method: 'POST',
        body: formData,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? 'Could not upload document.');
        return;
      }
      onDocumentsChange(body.documents);
      toast.success('Document added.');
    } catch {
      toast.error('Could not upload document.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDeleteDocument(documentId: string) {
    try {
      const res = await fetch(
        `/api/dog-profiles/${dogId}/health-records/${record.id}/documents/${documentId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        toast.error('Could not delete document.');
        return;
      }
      onDocumentsChange(record.documents.filter((d) => d.id !== documentId));
    } catch {
      toast.error('Could not delete document.');
    }
  }

  // Documents are private objects — there is no stored url to link to.
  // Each open request goes through the ownership-checked download route,
  // which returns a signed URL valid for a few minutes.
  async function handleOpenDocument(documentId: string) {
    setDownloadingId(documentId);
    try {
      const res = await fetch(
        `/api/dog-profiles/${dogId}/health-records/${record.id}/documents/${documentId}/download`,
      );
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.url) {
        toast.error('Could not open document.');
        return;
      }
      window.open(body.url, '_blank', 'noreferrer');
    } catch {
      toast.error('Could not open document.');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            {TYPE_LABELS[record.type]} · {record.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {record.occurredOn}
            {record.vetName ? ` · ${record.vetName}` : ''}
          </p>
          {record.notes && <p className="mt-1 text-sm">{record.notes}</p>}
        </div>
        <Button type="button" size="icon" variant="ghost" className="size-7" onClick={onDelete}>
          <Trash2 className="size-4" />
        </Button>
      </div>

      {record.documents.length > 0 && (
        <ul className="flex flex-col gap-1">
          {record.documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2 text-sm">
              <button
                type="button"
                disabled={downloadingId === doc.id}
                onClick={() => handleOpenDocument(doc.id)}
                className="flex items-center gap-1 underline underline-offset-2 disabled:opacity-50"
              >
                <FileText className="size-3.5" />
                {downloadingId === doc.id ? 'Opening…' : doc.fileName}
              </button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-6"
                onClick={() => handleDeleteDocument(doc.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 size-3.5" />
          {uploading ? 'Uploading…' : 'Attach document'}
        </Button>
      </div>
    </div>
  );
}
