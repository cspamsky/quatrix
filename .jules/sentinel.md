# Sentinel's Journal

## 2025-02-12 - Path Traversal in File Listing
**Vulnerability:** The `ServerManager.listFiles` method allowed directory traversal via the `subDir` argument, enabling authenticated users to list files outside the server directory using `../../`.
**Learning:** `path.join` alone is insufficient for sanitizing user-provided paths. Resolving a path does not guarantee it remains within the intended sandbox.
**Prevention:** Always resolve the absolute path and verify it starts with the intended base directory using `.startsWith()` before performing file operations.
