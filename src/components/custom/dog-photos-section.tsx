// @polsia:user-owned — Phase 4: photo gallery for an existing owned dog.
// Rendered only on the edit page (a dog must exist before photos attach to
// it). Ownership is enforced server-side on every request; this component
// never assumes the dogId prop belongs to the signed-in user.
'use client';

import { Star, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DogPhotoItem } from '@/lib/contracts/dog-photos';

const MAX_PHOTOS_PER_DOG = 6;

export function DogPhotosSection({
  dogId,
  photos,
  onChange,
}: {
  dogId: string;
  photos: DogPhotoItem[];
  onChange: (photos: DogPhotoItem[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sorted = [...photos].sort((a, b) => a.position - b.position);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/dog-profiles/${dogId}/photos`, {
        method: 'POST',
        body: formData,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error ?? 'Could not upload photo.');
        return;
      }
      onChange([...photos, body]);
      toast.success('Photo added.');
    } catch {
      toast.error('Could not upload photo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(photoId: string) {
    try {
      const res = await fetch(`/api/dog-profiles/${dogId}/photos/${photoId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        toast.error('Could not delete photo.');
        return;
      }
      onChange(photos.filter((p) => p.id !== photoId));
    } catch {
      toast.error('Could not delete photo.');
    }
  }

  async function handleSetCover(photoId: string) {
    try {
      const res = await fetch(`/api/dog-profiles/${dogId}/photos/${photoId}/position`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ position: 0 }),
      });
      if (!res.ok) {
        toast.error('Could not set cover photo.');
        return;
      }
      // Bump the previous cover down rather than refetching — swap slot 0.
      const previousCover = photos.find((p) => p.position === 0);
      onChange(
        photos.map((p) => {
          if (p.id === photoId) return { ...p, position: 0 };
          if (previousCover && p.id === previousCover.id) return { ...p, position: 1 };
          return p;
        }),
      );
    } catch {
      toast.error('Could not set cover photo.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Photos</CardTitle>
        <CardDescription>
          Up to {MAX_PHOTOS_PER_DOG} photos. The cover photo appears on Discover.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {sorted.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {sorted.map((photo) => (
              <div key={photo.id} className="group relative overflow-hidden rounded-md border">
                {/* biome-ignore lint/performance/noImgElement: user-uploaded remote URLs, not a build-time-known host set for next/image */}
                <img src={photo.url} alt="" className="aspect-square w-full object-cover" />
                {photo.position === 0 && (
                  <span className="absolute left-1 top-1 rounded bg-background/90 px-1.5 py-0.5 text-xs font-medium">
                    Cover
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {photo.position !== 0 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => handleSetCover(photo.id)}
                      title="Set as cover"
                    >
                      <Star className="size-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => handleDelete(photo.id)}
                    title="Delete"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {photos.length < MAX_PHOTOS_PER_DOG && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 size-4" />
              {uploading ? 'Uploading…' : 'Add a photo'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
