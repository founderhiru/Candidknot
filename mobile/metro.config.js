// Metro config for Expo SDK 52.
//
// @better-auth/expo (imported as "@better-auth/expo/client" in
// src/lib/auth-client.ts) exposes its subpaths ONLY via package.json's
// "exports" map — it has no legacy flat file fallback for "/client". SDK
// 52's default Metro config resolves resolver.unstable_enablePackageExports
// to false (confirmed via `getDefaultConfig` — this is a real,
// version-specific default, not an assumption), so without this override
// Metro cannot find the module at all and the iOS bundle fails with
// "Unable to resolve module @better-auth/expo/client".
//
// This is the ONLY change from Expo's own defaults — everything else comes
// from getDefaultConfig(__dirname) untouched.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

module.exports = config;