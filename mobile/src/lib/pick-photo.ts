import * as ImagePicker from "expo-image-picker";
import type { PickedImage } from "@/lib/dog-api";

/**
 * Opens the native photo library picker (camera roll) and returns a
 * PickedImage ready for uploadDogPhoto(), or null if the user cancelled or
 * permission was denied. Kept as one small function so screens don't each
 * re-derive the {uri, name, type} shape multipart upload needs.
 */
export async function pickDogPhoto(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: true,
    aspect: [1, 1],
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  const extension = asset.uri.split(".").pop()?.toLowerCase() ?? "jpg";
  const mimeType =
    extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : "image/jpeg";

  return {
    uri: asset.uri,
    name: `photo.${extension === "jpg" || extension === "jpeg" ? "jpg" : extension}`,
    type: mimeType,
  };
}
