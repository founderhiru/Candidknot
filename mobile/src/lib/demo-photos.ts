// Bundled locally (no remote URLs) — see assets/images/README.md.
// Six visually-distinct illustrated dogs (different coat colors and ear
// styles) — genuinely recognizable as dogs, not abstract gradients.
// Still illustration rather than real photography (no image-generation
// tool or licensed photo source is available in this project's
// environment); see the README for the real-photo swap-in path. Used
// only when a dog has no real uploaded cover photo.
//
// Deliberately untyped (matches every other local require() in this
// codebase, e.g. DogPhoto.tsx's own GENERIC_PLACEHOLDER): RN's asset
// require() returns an opaque module id, and react-native's
// ImageSourcePropType is broader than what every Image prop actually
// accepts (e.g. it allows arrays, which `defaultSource` rejects) —
// annotating it precisely here would fight the library's own types for
// no real benefit.
const DEMO_PHOTOS = [
  require("../../assets/images/demo-dogs/demo-dog-1.jpg"),
  require("../../assets/images/demo-dogs/demo-dog-2.jpg"),
  require("../../assets/images/demo-dogs/demo-dog-3.jpg"),
  require("../../assets/images/demo-dogs/demo-dog-4.jpg"),
  require("../../assets/images/demo-dogs/demo-dog-5.jpg"),
  require("../../assets/images/demo-dogs/demo-dog-6.jpg"),
];

/**
 * Deterministically maps a stable per-dog key (use the dog's `slug` —
 * present on both OwnedDogProfileItem and the public DogProfileItem, and
 * stable for that dog's lifetime, unlike `id` sort order) to one of the
 * bundled demo photos. Pure function of the string: the same key always
 * returns the same photo, every render, every session — no randomness,
 * no state. This is what makes "the same demo dog always shows the same
 * photo" true without needing to store a photo assignment anywhere.
 */
export function getDemoPhotoForKey(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    // Classic string hash (djb2-ish); >>> 0 keeps it an unsigned 32-bit
    // int so the modulo below is always non-negative.
    hash = (Math.imul(hash, 31) + key.charCodeAt(i)) >>> 0;
  }
  // The `?? DEMO_PHOTOS[0]` is unreachable in practice (hash % length is
  // always a valid index into a fixed 6-item array) — it's here only to
  // satisfy noUncheckedIndexedAccess, which can't prove that statically.
  return DEMO_PHOTOS[hash % DEMO_PHOTOS.length] ?? DEMO_PHOTOS[0];
}
