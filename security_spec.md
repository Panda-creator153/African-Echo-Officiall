# Firebase Security Specification

## 1. Data Invariants
- Only verified admins can write (create, update, delete) to any collection.
- Public can read all content (settings, home, about, booking, contact, tracks, albums, videos, gallery).
- Tracks, Albums, Videos, and Gallery Images must have valid IDs.
- Timestamps for creation/update must be server-generated.
- Emails in contact/booking must be valid formats.

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to update `/settings/main` as a non-authenticated user.
2. **Identity Spoofing**: Attempt to update `/settings/main` as an authenticated user who is not an admin.
3. **Identity Spoofing**: Attempt to create a document in `/admins/` as a non-admin.
4. **State Shortcutting**: Attempt to update a track's `id` field (immutable).
5. **Resource Poisoning**: Attempt to inject a 2MB string into `Track.lyrics`.
6. **Resource Poisoning**: Attempt to create a track with a 1KB string as an ID.
7. **Bypassing Validation**: Attempt to create a track without a `title`.
8. **Bypassing Validation**: Attempt to create a video with an invalid `youtubeUrl` (not a string).
9. **Bypassing Validation**: Attempt to update `/settings/main` with extra "Shadow" fields like `isAdmin: true`.
10. **PII Leak**: Attempt to list `/admins/` as a public user.
11. **Timestamp Manipulation**: Attempt to set `updatedAt` to a past date from the client.
12. **Relational Sync**: Attempt to create an album that references non-existent tracks.

## 3. The Test Runner

See `firestore.rules.test.ts` (to be created) for full verification.
