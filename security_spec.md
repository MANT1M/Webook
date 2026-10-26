# Security Specification for Library Application Statistics

## 1. Data Invariants
- `app_stats/global` maintains public aggregate counters (`totalVisits`, `uniqueVisitors`, `lastUpdated`).
- The document ID for app stats must be valid (`isValidId(statsId)` or exactly `global`).
- Counter fields (`totalVisits`, `uniqueVisitors`) must be numbers and cannot decrease on update (`incoming().totalVisits >= existing().totalVisits`).
- Deletion of statistics is strictly forbidden (`allow delete: if false;`).
- Collection listing is forbidden (`allow list: if false;`), only direct document fetch (`get`) is permitted.
- No PII is stored in `app_stats`.

## 2. The "Dirty Dozen" Threat Payloads & Guardrails
1. **Ghost Field Injection**: Attempting to add an unauthorized field like `isAdmin: true` or `secret: "hack"` -> Blocked by `hasOnly(['totalVisits', 'uniqueVisitors', 'lastUpdated'])`.
2. **Negative Visits**: Setting `totalVisits: -5` -> Blocked by validation helper checking `totalVisits >= 0`.
3. **Type Poisoning**: Setting `totalVisits: "one million"` (string instead of number) -> Blocked by `data.totalVisits is number`.
4. **Counter Decrement**: Decreasing `totalVisits` from 100 to 5 -> Blocked by `incoming().totalVisits >= existing().totalVisits`.
5. **Path / ID Injection**: Attempting path traversal or massive ID `app_stats/very_long_garbage_key...` -> Blocked by `isValidId(statsId)`.
6. **Malicious Delete**: Attempting to delete `app_stats/global` -> Blocked by `allow delete: if false;`.
7. **Listing Attack**: Calling `getDocs(collection(db, 'app_stats'))` to enumerate documents -> Blocked by `allow list: if false;`.
8. **Catch-All Bypass**: Attempting to access non-existent collections `/passwords/123` -> Blocked by catch-all default deny.
9. **Oversized String in lastUpdated**: Injecting a 2MB payload into `lastUpdated` -> Blocked by `data.lastUpdated.size() <= 64`.
10. **Array Injection in numeric fields**: Passing `[1, 2, 3]` as `totalVisits` -> Blocked by type validation.
11. **Null Payload**: Passing `{}` during create without required fields -> Blocked by `hasAll(['totalVisits'])`.
12. **Unauthorized Metadata Overwrite**: Attempting to set system fields -> Blocked by `affectedKeys().hasOnly(...)`.
