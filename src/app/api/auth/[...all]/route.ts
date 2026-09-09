// @polsia:user-owned — mounts every better-auth endpoint (send-otp, sign-in,
// sign-out, get-session, etc.) under /api/auth/*. Do not add other logic
// here; extend behavior via plugins/config in @/lib/auth instead.
import 'server-only';
import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';

export const { GET, POST } = toNextJsHandler(auth);
