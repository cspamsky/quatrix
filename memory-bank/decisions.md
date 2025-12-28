# Technical Decisions & Research Findings

**Date**: 2025-12-28
**Status**: Implementation Phase

## 1. CS2 Server Deployment Strategy ✅

### ⚠️ CRITICAL DECISION: NO DOCKER FOR GAME SERVERS

**User Decision**: CS2 servers will run as **native processes**, NOT in Docker containers.

---

## 2. Database Strategy ✅ NEW DECISION

### ⚠️ CRITICAL DECISION: NO DOCKER FOR DATABASE

**User Decision**: Database will run as a **Native (Local)** process.
**Choice**: **SQLite** for development and MVP.

**Rationale:**
- **Zero Configuration**: No need to install a database server or manage Docker containers for storage.
- **Portability**: The database is a single file (`dev.db`) within the backend folder.
- **Speed**: Extremely fast for panel-scale operations.
- **Native Alignment**: Consistent with the "no-docker on host" philosophy for the core application data.

---

## 3. Web Panel Deployment Strategy ✅ UPDATED

**User Decision**: Running everything **Natively** during development. Docker remains a production-only option for containerizing the web logic.

---

## Summary of Recommendations

| Decision | Recommendation | Priority |
|----------|---------------|----------|
| **CS2 Deployment** | **Native processes (NO Docker)** | ✅ Confirmed |
| **Database** | **SQLite (Native File)** | ✅ Confirmed |
| **Panel Deployment** | **Native for Dev, Docker for Prod** | ✅ Confirmed |
| **UI Language** | English + Turkish | ✅ Confirmed |

---

**Last Updated**: 2025-12-28 00:50 (UTC+3)
