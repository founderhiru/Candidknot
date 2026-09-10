import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ErrorText } from "@/components/ErrorText";
import type { DogPhotoItem } from "@/lib/contracts";
import { deleteDogPhoto, setCoverPhoto, uploadDogPhoto } from "@/lib/dog-api";
import { pickDogPhoto } from "@/lib/pick-photo";
import { colors, radius, spacing, typography } from "@/theme/tokens";

const MAX_PHOTOS = 6;

interface PhotoGridProps {
  dogId: string;
  photos: DogPhotoItem[];
  onPhotosChange: (photos: DogPhotoItem[]) => void;
}

/**
 * Full Dog Photos CRUD against the existing Phase 4 endpoints: upload
 * (multipart), delete (with confirm), set cover (PATCH position -> 0).
 * Each photo's own busy/error state is tracked independently so one
 * failed delete/set-cover doesn't block interacting with the others.
 */
export function PhotoGrid({ dogId, photos, onPhotosChange }: PhotoGridProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<{
    id: string;
    message: string;
  } | null>(null);

  const sorted = [...photos].sort((a, b) => a.position - b.position);

  async function handleAddPhoto() {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert(
        "Photo limit reached",
        `A dog can have at most ${MAX_PHOTOS} photos.`,
      );
      return;
    }
    setUploadError(null);
    const image = await pickDogPhoto();
    if (!image) return; // cancelled or permission denied — nothing to report

    setUploading(true);
    try {
      const uploaded = await uploadDogPhoto(dogId, image);
      onPhotosChange([...photos, uploaded]);
    } catch {
      setUploadError("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSetCover(photoId: string) {
    setPhotoError(null);
    setBusyPhotoId(photoId);
    try {
      const updated = await setCoverPhoto(dogId, photoId);
      const previousCover = photos.find((p) => p.position === 0);
      onPhotosChange(
        photos.map((p) => {
          if (p.id === updated.id) return updated;
          if (previousCover && p.id === previousCover.id)
            return { ...p, position: 1 };
          return p;
        }),
      );
    } catch {
      setPhotoError({
        id: photoId,
        message: "Couldn't set cover photo. Try again.",
      });
    } finally {
      setBusyPhotoId(null);
    }
  }

  function confirmDelete(photoId: string) {
    Alert.alert("Delete photo?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => handleDelete(photoId),
      },
    ]);
  }

  async function handleDelete(photoId: string) {
    setPhotoError(null);
    setBusyPhotoId(photoId);
    try {
      await deleteDogPhoto(dogId, photoId);
      onPhotosChange(photos.filter((p) => p.id !== photoId));
    } catch {
      setPhotoError({
        id: photoId,
        message: "Couldn't delete photo. Try again.",
      });
    } finally {
      setBusyPhotoId(null);
    }
  }

  return (
    <View>
      <Text style={typography.label}>
        PHOTOS ({photos.length}/{MAX_PHOTOS})
      </Text>
      <View style={styles.grid}>
        {sorted.map((photo) => (
          <View key={photo.id} style={styles.tile}>
            <Image source={{ uri: photo.url }} style={styles.image} />
            {photo.position === 0 ? (
              <View style={styles.coverBadge}>
                <Text style={styles.coverBadgeText}>Cover</Text>
              </View>
            ) : null}
            {busyPhotoId === photo.id ? (
              <View style={styles.overlay}>
                <ActivityIndicator color={colors.accentText} />
              </View>
            ) : (
              <View style={styles.actions}>
                {photo.position !== 0 ? (
                  <Pressable
                    onPress={() => handleSetCover(photo.id)}
                    style={styles.actionButton}
                    accessibilityRole="button"
                  >
                    <Text style={styles.actionText}>Set as cover</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => confirmDelete(photo.id)}
                  style={styles.actionButton}
                  accessibilityRole="button"
                >
                  <Text style={[styles.actionText, styles.deleteText]}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            )}
            {photoError?.id === photo.id ? (
              <ErrorText>{photoError.message}</ErrorText>
            ) : null}
          </View>
        ))}

        {photos.length < MAX_PHOTOS ? (
          <Pressable
            onPress={handleAddPhoto}
            style={[styles.tile, styles.addTile]}
            accessibilityRole="button"
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Text style={styles.addTileText}>+ Add photo</Text>
            )}
          </Pressable>
        ) : null}
      </View>
      {uploadError ? <ErrorText>{uploadError}</ErrorText> : null}
    </View>
  );
}

const TILE_SIZE = 108;

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  tile: {
    width: TILE_SIZE,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  image: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    backgroundColor: colors.background,
  },
  addTile: {
    height: TILE_SIZE,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  addTileText: { ...typography.bodyMuted, fontSize: 13, textAlign: "center" },
  coverBadge: {
    position: "absolute",
    top: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  coverBadgeText: { color: colors.accentText, fontSize: 11, fontWeight: "600" },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  actions: { marginTop: spacing.xs, gap: 2 },
  actionButton: { paddingVertical: 2 },
  actionText: { fontSize: 12, color: colors.accent, fontWeight: "600" },
  deleteText: { color: colors.danger },
});
