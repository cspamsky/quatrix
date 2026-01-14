# 🐞 Bug Report

**Title:** Critical Remote Code Execution (RCE) via Settings Manipulation
**Severity:** 🔴 BLOCKER
**Area:** API / Backend

**Steps to Reproduce:**
1. Authenticate as a user to get a valid JWT.
2. Use the File Manager API (`POST /api/servers/:id/files/write`) to upload a malicious executable (e.g., `evil.bat` or `evil.sh`) to a server instance directory.
3. Use the Settings API (`PUT /api/settings`) to update the `steamcmd_path` setting to point to the uploaded malicious executable (e.g., `.../game/csgo/evil.bat`).
4. Trigger an installation or update via `POST /api/servers/:id/install`.

**Expected Result:**
The system should validate the `steamcmd_path` setting to ensure it points to a valid SteamCMD executable or restricted directory. It should also prevent execution of arbitrary files.

**Actual Result:**
The system executes the file specified in `steamcmd_path` using `child_process.spawn`. Since the attacker controls both the file content (via upload) and the path (via settings), this leads to full Remote Code Execution (RCE) on the host server.

**Notes / Edge Cases:**
- This requires authentication, but any valid user can perform this attack.
- The `steamcmd_path` is a global setting, so one user can compromise the entire system for all users.

---

# 🐞 Bug Report

**Title:** Arbitrary File Write via SteamCMD Download Path
**Severity:** 🔴 BLOCKER
**Area:** API / Backend

**Steps to Reproduce:**
1. Authenticate as a user.
2. Send a `POST` request to `/api/settings/steamcmd/download` with a malicious `path` in the body (e.g., pointing to a critical system directory or startup folder).

**Expected Result:**
The system should enforce a strict allowlist for download locations or ignore the user-provided path entirely.

**Actual Result:**
The system downloads and extracts `steamcmd.zip` to the specified location. This allows overwriting system files or planting files in sensitive directories.

**Notes / Edge Cases:**
- Extraction overwrites existing files without warning.

---

# 🐞 Bug Report

**Title:** Denial of Service via Synchronous File I/O
**Severity:** 🟠 CRITICAL
**Area:** Backend / Performance

**Steps to Reproduce:**
1. Identify a server with a large log file (or create one via repeated writes).
2. Request the logs via `GET /api/servers/:id/logs`.
3. Alternatively, trigger multiple simultaneous file reads/writes.

**Expected Result:**
File operations should be asynchronous (non-blocking) to allow the Node.js event loop to handle other requests.

**Actual Result:**
The backend uses `fs.readFileSync`, `fs.writeFileSync`, and `fs.readSync` (in `getLastLogs`). Large files or concurrent requests will block the main thread, causing the entire API to hang and become unresponsive for all users.

**Notes / Edge Cases:**
- `getLastLogs` reads backwards but uses synchronous `fs.readSync` inside a loop, which blocks execution.

---

# 🐞 Bug Report

**Title:** Missing Input Validation on Server Creation
**Severity:** 🟡 MAJOR
**Area:** API

**Steps to Reproduce:**
1. Send a `POST` request to `/api/servers` with invalid data:
   - `port`: `999999` or `-1`
   - `name`: A string with 10,000 characters
   - `rcon_password`: Empty string or SQL injection strings (though prepared statements protect DB, logic might fail).

**Expected Result:**
The API should reject invalid inputs with a 400 Bad Request and validation errors.

**Actual Result:**
The API accepts the inputs and inserts them into the database. This leads to crashes when starting the server (invalid port) or UI rendering issues (huge names).

**Notes / Edge Cases:**
- No port conflict check exists at creation time.

---

# 🐞 Bug Report

**Title:** Missing Rate Limiting on Sensitive Endpoints
**Severity:** 🟡 MAJOR
**Area:** Security / API

**Steps to Reproduce:**
1. Authenticate as a user.
2. Send 1000 requests to `POST /api/servers/:id/rcon` or `POST /api/servers/:id/files/write` in a loop.

**Expected Result:**
The API should rate-limit these requests to prevent abuse and resource exhaustion.

**Actual Result:**
No rate limiting is applied (except on login/register). An attacker can flood the game server with RCON commands or fill the disk with file writes.

---

# 📋 Test Coverage Gaps

- **Security Testing:** No tests for path traversal, command injection, or authorization boundaries.
- **Load Testing:** No tests for concurrent file operations or WebSocket message broadcasting under load.
- **Edge Case Testing:** No tests for invalid inputs (ports, names, paths) or network failures (SteamCMD download fail).
- **State validation:** No tests ensuring DB state matches actual process state (e.g. if server crashes, DB says 'ONLINE').

---

# 🚦 Release Readiness

**Is this project ready for release? NO**

**Why?**
The project contains critical security vulnerabilities (RCE, Arbitrary File Write) that would allow any authenticated user to completely compromise the host server. Additionally, the use of synchronous I/O ensures the application will not scale and will be easily DoS'd. Basic input validation is missing, making the system fragile. These issues must be addressed before any public release.
