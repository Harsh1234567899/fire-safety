# 🔍 QA Audit Report — Sahaj Group LMS

**Date:** 2026-02-16  
**Scope:** Full stack (frontend + backend)  
**Auditor:** Automated Code Review
---
now first scan the whole website and find where all brand name is there like shahaj group and its logo address email number i want to make it in env because im going to sell this product 
---
---

## 📊 Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical (app-breaking / security) | 5 |
| 🟠 High (incorrect behavior) | 7 |
| 🟡 Medium (code quality / maintainability) | 9 |
| 🔵 Low (typos / cleanup) | 8 |

---

## 🔴 CRITICAL BUGS

### BUG-001: `registerUser` Role Check is Always True
**File:** `backend/controllers/auth.controller.js` **Line 24**

```js
// CURRENT (BROKEN)
if (req.user.role !== 'admin' || 'manager') { ... }
```

`'manager'` is a truthy string, so this evaluates as `(role !== 'admin') || true` — which is **always true**. This means **no one can register users**, including admins.

```diff
- if (req.user.role !== 'admin' || 'manager') {
+ if (req.user.role !== 'admin' && req.user.role !== 'manager') {
```

---

### BUG-002: Login Validation Allows Empty Fields
**File:** `backend/controllers/auth.controller.js` **Line 62**

```js
// CURRENT (BROKEN)
if (!(systemId || password)) { ... }
```

This only fails when **both** are falsy. If a user provides only `systemId` but no `password`, the check passes. Should use AND:

```diff
- if (!(systemId || password)) {
+ if (!systemId || !password) {
```

---

### BUG-003: Secrets Exposed in `.env` Committed to Repo
**File:** `backend/.env`

The `.env` file contains:
- MongoDB Atlas credentials (`delta:delta1234`)
- JWT signing secrets
- Cloudinary API key and secret

> [!CAUTION]
> If this repo is public or shared, **all credentials are compromised**. Rotate them immediately and add `.env` to `.gitignore`.

---

### BUG-004: `refreshAccessToken` Exported Before Declaration
**File:** `backend/controllers/auth.controller.js` **Line 181 vs 184**

```js
export { ..., refreshAccessToken }  // line 181
const refreshAccessToken = asyncHandler(async (req, res) => { ... }); // line 184
```

This works at runtime due to hoisting of `const` in module scope evaluation, but the code is confusing and fragile. Move the export block after the function declaration.

---

### BUG-005: `error.stack` Leaked in Production API Response
**File:** `backend/controllers/gasSilinder.controller.js` **Line ~671**

```js
return res.status(500).json({ success: false, message: error.message, stack: error.stack });
```

Exposing stack traces in API responses reveals internal file paths, dependency versions, and code structure to attackers.

```diff
- return res.status(500).json({ success: false, message: error.message, stack: error.stack });
+ return res.status(500).json({ success: false, message: error.message });
```

---

## 🟠 HIGH PRIORITY BUGS

### BUG-006: `godown-manager` Can't Create Clients (403) But Frontend Allows It
**Files:** `backend/routes/client.routes.js`, `frontend/components/RegisterFirmScreen.jsx`

The client creation route only allows `admin` and `manager`:
```js
router.post('/create', verifyJWT, authorize('admin', 'manager'), ...)
```

But the frontend lets `godown-manager` access `/register` and fill out the form. When they submit, they will get a **403 error** because the backend rejects their role. 

**Fix:** Either add `'godown-manager'` to the client route's `authorize()`, or prevent the client save on the frontend for godown-manager role.

---

### BUG-007: `updateUser` Duplicate Check Blocks Self-Updates
**File:** `backend/controllers/auth.controller.js` **Lines 150-155**

```js
const existUser = await User.findOne({
    $or: [{ email }, { systemId }]
})
if (existUser) { throw new ApiError(400, 'email or system id aready exist') }
```

This finds the **user being updated** (because their own email/systemId matches) and throws an error. Need to exclude the target user:

```diff
- const existUser = await User.findOne({ $or: [{ email }, { systemId }] })
+ const existUser = await User.findOne({
+     _id: { $ne: id },
+     $or: [{ email }, { systemId }]
+ })
```

---

### BUG-008: `deleteUser` Frontend Uses POST Instead of DELETE
**Files:** `frontend/api/auth.js` **Line 6**, `backend/routes/auth.routes.js` **Line 10**

```js
// Frontend
export const deleteUser = (id) => api.post(`/v1/auth/${id}`);

// Backend route — POST on /:id triggers deleteUser
router.route('/:id').post(verifyJWT, authorize('admin'), deleteUser)
```

Using POST for deletion is non-standard and confusing. More importantly, the same `/:id` POST handler could accidentally be triggered by other calls. Should use DELETE method.

---

### BUG-009: Download Report HTTP Method Mismatch
**Files:** Frontend API files vs Backend routes

| API Call | Frontend Method | Backend Route Method |
|----------|----------------|---------------------|
| `downloadAMCReport` | `GET` | `POST` (`/download`) |
| `downloadCylinderReport` | `GET` | `POST` (`/download-report`) |

The frontend uses `api.get(...)` but the backend expects `router.post(...)`. These calls will return **404 Not Found**.

```diff
// frontend/api/amc.js
- export const downloadAMCReport = (params) => api.get("/v4/amc/download", { params, responseType: 'blob' });
+ export const downloadAMCReport = (params) => api.post("/v4/amc/download", params, { responseType: 'blob' });

// frontend/api/fireExtinguisher.js
- export const downloadCylinderReport = (params) => api.get("/v11/fire-extinguisher/download-report", { params, responseType: 'blob' });
+ export const downloadCylinderReport = (params) => api.post("/v11/fire-extinguisher/download-report", params, { responseType: 'blob' });
```

---

### BUG-010: User Model Missing `next()` in Pre-Save Hook
**File:** `backend/models/user.model.js` **Line 39-44**

```js
userSchema.pre('save', async function(next) {
    if(!this.isModified("password") || !this.password) return;
    this.password = await bcrypt.hash(this.password, 10)
    // ❌ missing next() call!
})
```

The `next()` parameter is declared but never called after hashing. While Mongoose may auto-call next for async hooks, explicitly calling `next()` is the expected pattern and avoids subtle hanging issues.

```diff
  this.password = await bcrypt.hash(this.password, 10)
+ next()
```

---

### BUG-011: `dotenv` Path May Be Wrong
**File:** `backend/index.js` **Line 5**

```js
dotenv.config({ path: '/.env' })
```

`/.env` refers to the **filesystem root**. Should be:

```diff
- dotenv.config({ path: '/.env' })
+ dotenv.config({ path: './.env' })
```

> **Note:** This currently works because `PORT` is being picked up, which means dotenv may be finding the file through other means (e.g., Node's working directory). However, this path is technically incorrect and will fail in different deployment environments.

---

### BUG-012: Cookie `secure: true` Blocks Login on HTTP localhost
**File:** `backend/controllers/auth.controller.js` **Lines 76-79**

```js
const options = {
    httpOnly: true,
    secure: true   // ❌ requires HTTPS
}
```

With `secure: true`, cookies will **only be sent over HTTPS**. On `http://localhost`, cookies are silently ignored by the browser, meaning refresh tokens won't work.

```diff
  const options = {
      httpOnly: true,
-     secure: true
+     secure: process.env.NODE_ENV === 'production'
  }
```

---

## 🟡 MEDIUM PRIORITY (Code Quality / Improvements)

### IMP-001: Inconsistent API Versioning
**File:** `backend/app.js`

Each resource uses a different version prefix (v1–v13), which is not standard RESTful versioning. All routes should share a single version:

```
/api/v1/auth, /api/v1/clients, /api/v1/fire-extinguisher, ...
```

Instead of current:
```
/api/v1/auth, /api/v3/client, /api/v11/fire-extinguisher, ...
```

---

### IMP-002: Dead Code — `uiSlice.js`
**File:** `frontend/store/slices/uiSlice.js`

The entire `uiSlice` (with `currentView` and `setCurrentView`) is no longer used since React Router handles navigation. It can be safely removed along with its import in `store/index.js`.

---

### IMP-003: Redundant `try-catch` Inside `asyncHandler`
**Files:** Multiple controllers (`client.controller.js`, others)

The `asyncHandler` utility already catches errors and forwards them to `next()`. Many controllers wrap their logic in an additional `try-catch` inside `asyncHandler`, which is redundant:

```js
const createClient = asyncHandler(async (req, res) => {
    try {  // ❌ redundant — asyncHandler already catches
        ...
    } catch (error) {
        throw new ApiError(401, error.message)  // re-throws anyway
    }
})
```

Remove inner try-catch blocks and let `asyncHandler` handle errors uniformly.

---

### IMP-004: Console.log Left in Production Code
**Files:** `backend/controllers/auth.controller.js` **Line 54**

```js
console.log(createdUser);  // should be removed
```

Multiple console.log/console.error calls exist throughout the codebase. Use a proper logging library (e.g., `winston` or `pino`) for structured logging.

---

### IMP-005: RegisterFirmScreen.jsx is 1184 Lines
**File:** `frontend/components/RegisterFirmScreen.jsx` (78KB)

This single component handles:
- Client search & selection
- Firm details form
- Cylinder management (CRUD, serials)
- NOC management
- AMC management
- Certificate generation
- PDF download

**Recommendation:** Split into smaller sub-components:
- `FirmDetailsForm.jsx`
- `CylinderManager.jsx`
- `NOCManager.jsx`
- `AMCManager.jsx`
- `RegistrationSummary.jsx`

---

### IMP-006: No Input Sanitization for Regex Search
**Files:** `backend/controllers/fireNOC.controller.js`, `client.controller.js`

```js
const clientNameRegex = new RegExp(req.query.firmName.trim(), "i");
```

User input is directly used as a regex pattern. Special characters like `.*+?^${}()|[]\` can cause **ReDoS attacks** or unexpected matches.

```diff
- const clientNameRegex = new RegExp(req.query.firmName.trim(), "i");
+ const escaped = req.query.firmName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
+ const clientNameRegex = new RegExp(escaped, "i");
```

---

### IMP-007: Dashboard Metrics `critical7Day` and `warning30Day` Hardcoded to 0
**File:** `frontend/store/slices/dashboardSlice.js` **Lines 47-48**

```js
critical7Day: 0,   // ❌ Always 0
warning30Day: 0    // ❌ Always 0
```

These are shown on the dashboard as stat cards but never populated with real data.

---

### IMP-008: `client` Model Uses Lowercase Export Name
**File:** `backend/models/client.model.js` **Line 51**

```js
export const client = mongoose.model('client', clientSchema)  // lowercase 'c'
```

All other models use PascalCase (`User`, `AMC`, `Counter`). This creates naming confusion when importing.

---

### IMP-009: Missing Error Boundary in React App
**File:** `frontend/App.jsx`

There is no React Error Boundary wrapping the application. If any component throws during render, the **entire app crashes** with a white screen. Add a `<ErrorBoundary>` component at the root level.

---

## 🔵 LOW PRIORITY (Typos / Cleanup)

### TYPO-001: Spelling Errors in Code
| File | Line | Current | Correct |
|------|------|---------|---------|
| `auth.middleware.js` | 11 | `Unautorized` | `Unauthorized` |
| `auth.controller.js` | 18 | `somthing went wrong` | `something went wrong` |
| `auth.controller.js` | 30 | `ditails` | `details` |
| `auth.controller.js` | 63 | `passwrod` | `password` |
| `auth.controller.js` | 102 | `passwrod` | `password` |
| `auth.controller.js` | 154 | `aready` | `already` |
| `amc.controller.js` | 136 | `fatched` | `fetched` |
| `fireNOC.controller.js` | 173 | `fatced` | `fetched` |
| `gasSilinder` (everywhere) | — | `Silinder` | `Cylinder` |
| `client.controller.js` | validator | `Firm name` | `Contact person` (for contactPerson validator message) |

### TYPO-002: Typo in Model Field Select
**File:** `auth.controller.js` **Lines 49, 74**

```js
.select("-password -refershToken")  // should be -refreshToken
```

This means `refreshToken` is **NOT excluded** from the query result — it leaks to the client.

```diff
- .select("-password -refershToken")
+ .select("-password -refreshToken")
```

> [!WARNING]
> This is more than a typo — it causes the `refreshToken` to be **included** in the API response sent to the client, which is a security concern.

---

### CLEANUP-001: Unused Imports
| File | Unused Import |
|------|---------------|
| `user.model.js` | `compare` from `bcrypt` (line 3) |
| `App.jsx` | `Wrench` from `lucide-react` (after 404 page was added) |
| `auth.controller.js` | `monoIdIsValid` could be consolidated |

### CLEANUP-002: `metadata.json` in Frontend Root
**File:** `frontend/metadata.json`

This appears to be a leftover configuration file that serves no purpose in the build.

---

## 🏗️ Architecture Recommendations

### ARCH-001: Unify API Version Prefix
Use `/api/v1/` for all resources instead of `/api/v1/` through `/api/v13/`. This will simplify the API layer on both frontend and backend.

### ARCH-002: Add Rate Limiting
The `/api/v1/auth/login` endpoint has no rate limiting. This makes the app vulnerable to brute-force attacks. Consider adding `express-rate-limit`.

### ARCH-003: Add Request Validation Middleware Consistently
Only `client` and `amc` routes use `express-validator`. Other routes (auth, fire extinguisher, NOC) rely on manual checks inside controllers. Standardize validation across all routes.

### ARCH-004: Add Database Indexes for Performance
Frequently queried fields like `gasSilinder.clientId`, `fireNOC.clientId`, and `AMC.clientId` should have explicit compound indexes for better query performance as data grows.

### ARCH-005: Consider Adding a Logout Endpoint
There is no `/api/v1/auth/logout` endpoint. The frontend clears local state on sign-out, but the server-side refresh token remains valid. Add a logout endpoint that invalidates the refresh token in the database.

---

## ✅ What's Working Well

- **Error handling pattern:** The `asyncHandler` + `ApiError` + `errorHandler` middleware chain is clean and consistent
- **Authentication flow:** JWT access/refresh token pattern with httpOnly cookies is well-implemented
- **Frontend routing:** React Router implementation with `ProtectedRoute` is solid
- **Redux store structure:** Clean separation of concerns (auth, clients, dashboard)
- **API interceptor:** Auto-refresh on 401 with proper retry logic
- **Role-based sidebar filtering:** Good UX — users only see what they can access
- **Form persistence:** `usePersistedState` hook for session-based form data recovery

---

*End of QA Report*
