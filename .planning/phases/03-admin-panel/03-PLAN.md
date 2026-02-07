---
phase: 03-admin-panel
plans: 6
waves: 6
type: execute
parallel_plans: []
sequential_plans: [1, 2, 3, 4, 5, 6]
depends_on: [1, 2]
---

<objective>
Build a comprehensive self-service admin panel enabling businesses to manage their AI chatbot including training data management, conversation oversight, widget customization, and embed code generation.

Purpose: Phase 3 completes the core product by delivering the admin interface that customers use to configure and monitor their chatbots. This transforms the technical capability from Phase 1-2 into a usable product.
Output: 6 executable plans across 6 waves covering authentication, document management, conversation history, widget customization, embed code, and polish/verification.
</objective>

<execution_context>
{file:~/.config/opencode/gsd/workflows/execute-plan.md}
{file:~/.config/opencode/gsd/templates/summary.md}
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/02-rag-pipeline/02-FINAL-SUMMARY.md
@.planning/phases/03-admin-panel/03-RESEARCH.md
@.planning/phases/03-admin-panel/CONTEXT.md

# Cross-Phase Dependencies:
# - Phase 1: Supabase Auth integration, backend API contracts
# - Phase 2: Documents table, conversations table, RAG ingestion endpoints

# Tech Stack (from RESEARCH.md):
# - Next.js 14 (App Router) + React 18
# - Shadcn/ui + Tailwind CSS
# - @supabase/supabase-js + @supabase/ssr (SSR authentication)
# - @tanstack/react-table (DataTable)
# - react-hook-form + zod (form validation)
# - date-fns (date formatting)
# - sonner (toast notifications)
</context>

<wave_structure>

## Wave 1: Foundation
**Plans:** 03-01
**Focus:** Authentication, Layout, Navigation
**Duration:** ~3 hours
**Status:** Ready for execution

## Wave 2: Sources Management  
**Plans:** 03-02
**Focus:** Document CRUD operations (ADMIN-01)
**Duration:** ~4 hours
**Status:** Ready for execution (depends on Wave 1)

## Wave 3: Conversations
**Plans:** 03-03
**Focus:** Conversation list and thread view (ADMIN-02)
**Duration:** ~4 hours
**Status:** Ready for execution (depends on Wave 1)

## Wave 4: Widget Settings
**Plans:** 03-04
**Focus:** Customization form and live preview (ADMIN-03)
**Duration:** ~4 hours
**Status:** Ready for execution (depends on Wave 1)

## Wave 5: Embed Code
**Plans:** 03-05
**Focus:** API key management and embed script (ADMIN-04)
**Duration:** ~3 hours
**Status:** Ready for execution (depends on Waves 1, 4)

## Wave 6: Polish & Verification
**Plans:** 03-06
**Focus:** Dashboard, UX polish, full verification
**Duration:** ~4 hours
**Status:** Ready for execution (depends on all prior waves)

</wave_structure>

<phase_requirements>

## ADMIN Requirements Coverage

| ID | Requirement | Plan | Status |
|----|-------------|------|--------|
| ADMIN-01 | Training data source management | 03-02 | Ready |
| ADMIN-02 | Conversation history with thread view | 03-03 | Ready |
| ADMIN-03 | Widget customization (colors, position, welcome message) | 03-04 | Ready |
| ADMIN-04 | Embed code generation with API key | 03-05 | Ready |

## Success Criteria Mapping

| Criteria | Verification Method | Plan |
|----------|---------------------|------|
| Source Management Functions | Add/delete/view documents with status | 03-02 |
| Conversation History Visible | List, search, filter, thread view | 03-03 |
| Customization Persists | Form saves, preview updates | 03-04 |
| Embed Code Generated | Copy script, widget loads | 03-05 |

</phase_requirements>

<dependency_graph>

## Plan Dependencies

```
Wave 1 (03-01): Foundation
├── Depends: None
├── Creates: AdminAuthService, AppSidebar, middleware.ts
└── Required by: All subsequent plans

Wave 2 (03-02): Sources Management
├── Depends: Wave 1
├── Creates: SourcesManagementService
└── Enables: Document CRUD for training data

Wave 3 (03-03): Conversations
├── Depends: Wave 1
├── Creates: ConversationHistoryService
└── Enables: Conversation oversight

Wave 4 (03-04): Widget Settings
├── Depends: Wave 1
├── Creates: WidgetCustomizationService
└── Enables: Widget appearance customization

Wave 5 (03-05): Embed Code
├── Depends: Wave 1, Wave 4
├── Creates: EmbedCodeService
└── Enables: Customer widget deployment

Wave 6 (03-06): Polish & Verification
├── Depends: All prior waves
├── Creates: DashboardOverviewService
└── Goal: Final verification of all features
```

## Critical Path

```
03-01 (Auth) → 03-02 (Sources) → 03-06 (Verification)
              → 03-03 (Conversations) → 03-06 (Verification)  
              → 03-04 (Settings) → 03-05 (Embed) → 03-06 (Verification)

Longest path: 03-01 → 03-04 → 03-05 → 03-06 (4 waves)
```

</dependency_graph>

<interfaces>

## Interfaces Provided

| Plan | Interface | Type | Methods | Purpose |
|------|-----------|------|---------|---------|
| 03-01 | AdminAuthService | service | createClient, getUser, signOut | Admin authentication |
| 03-02 | SourcesManagementService | service | getDocuments, createDocument, deleteDocument, triggerReindex | Document management |
| 03-03 | ConversationHistoryService | service | getConversations, getConversation, searchConversations, filterByDate | Conversation oversight |
| 03-04 | WidgetCustomizationService | service | getSettings, updateSettings, validateSettings | Widget appearance |
| 03-05 | EmbedCodeService | service | getApiKey, generateEmbedCode, regenerateApiKey | Embed deployment |
| 03-06 | DashboardOverviewService | service | getDocumentCount, getConversationCount, getRecentActivity | Admin overview |

## Interfaces Consumed

| From Phase | Interface | Used In | Purpose |
|------------|-----------|---------|---------|
| Phase 1 | SupabaseConnection | 03-01, 03-02, 03-03 | Database access |
| Phase 1 | WidgetLoader | 03-04, 03-05 | Widget preview |
| Phase 2 | RAGIngestionPipeline | 03-02 | Document ingestion |
| Phase 2 | DocumentService | 03-02 | Document CRUD |
| Phase 2 | ConversationStorage | 03-03 | Conversation access |

</interfaces>

<must_haves>

## Phase-Level Must-Haves

### Truths (Observable Behaviors)

1. **Admin Authentication**: Authenticated users access admin panel, unauthenticated users redirected to login
2. **Document Management**: Admin sees, adds, deletes training documents with status indicators
3. **Conversation Oversight**: Admin views, searches, filters conversations with full thread details
4. **Widget Customization**: Admin changes colors, position, welcome message with instant preview
5. **Embed Generation**: Admin generates copy-paste widget code with embedded API key
6. **Dashboard Overview**: Admin sees aggregate statistics and quick actions

### Artifacts (Required Files)

| Artifact | Plan | Provides |
|----------|------|----------|
| app/login/page.tsx | 03-01 | Admin authentication page |
| app/admin/layout.tsx | 03-01 | Admin layout with sidebar |
| components/app-sidebar.tsx | 03-01 | Navigation sidebar |
| middleware.ts | 03-01 | Auth session protection |
| app/admin/sources/page.tsx | 03-02 | Document management UI |
| app/admin/sources/columns.tsx | 03-02 | Document DataTable columns |
| app/admin/conversations/page.tsx | 03-03 | Conversation list UI |
| app/admin/conversations/[id]/page.tsx | 03-03 | Conversation thread view |
| app/admin/settings/page.tsx | 03-04 | Widget customization UI |
| app/admin/embed/page.tsx | 03-05 | Embed code generation UI |
| app/admin/dashboard/page.tsx | 03-06 | Admin overview dashboard |

### Key Links (Critical Connections)

| From | To | Via | Pattern |
|------|-----|-----|---------|
| middleware.ts | /login | redirect | redirect.*/login |
| app/admin/layout.tsx | AppSidebar | SidebarProvider | SidebarProvider.*AppSidebar |
| Sources page | /api/rag/documents | CRUD | POST.*api/rag |
| Conversations page | /api/conversations | Search | ilike.*OR.*gte.*lte |
| Settings page | widget_settings | UPSERT | from.*widget_settings |
| Embed page | api_keys table | CRUD | from.*api_keys |
| All pages | ErrorBoundary | Graceful error handling | ErrorBoundary.*children |

</must_haves>

<files_summary>

## Files Modified Summary

### Wave 1 (Foundation)
**Modified Files:** 7 files
- lib/supabase/client.ts, lib/supabase/server.ts
- middleware.ts
- app/login/page.tsx
- app/admin/layout.tsx, app/admin/page.tsx
- components/app-sidebar.tsx

### Wave 2 (Sources Management)
**Modified Files:** 6 files
- app/admin/sources/page.tsx, app/admin/sources/columns.tsx
- app/admin/sources/add-document-dialog.tsx
- components/ui/data-table.tsx
- types/documents.ts

### Wave 3 (Conversations)
**Modified Files:** 5 files
- app/admin/conversations/page.tsx, app/admin/conversations/columns.tsx
- app/admin/conversations/[id]/page.tsx
- types/conversations.ts
- components/conversation-thread.tsx

### Wave 4 (Widget Settings)
**Modified Files:** 6 files
- app/admin/settings/page.tsx, app/admin/settings/widget-form.tsx
- app/admin/settings/widget-preview.tsx
- components/ui/color-picker.tsx
- types/widget-settings.ts
- lib/widget-settings.ts

### Wave 5 (Embed Code)
**Modified Files:** 5 files
- app/admin/embed/page.tsx, app/admin/embed/embed-code.tsx
- app/admin/embed/api-key-manager.tsx
- types/api-keys.ts
- lib/api-keys.ts

### Wave 6 (Polish & Verification)
**Modified Files:** 6 files
- app/admin/dashboard/page.tsx
- components/ui/skeleton.tsx, components/ui/alert.tsx
- components/error-boundary.tsx
- All prior admin files (refinements)

**Total Files Modified:** 35 files across 6 waves

</files_summary>

<execution_strategy>

## Execution Strategy

### Parallelization Opportunities

1. **Wave 1-5 are sequential** due to authentication dependency
2. **No parallel execution** within this phase (all features depend on auth)
3. **Total estimated time**: ~22 hours of Claude execution time

### Autonomy

- **All plans autonomous**: 6/6 plans require no human checkpoints
- **User setup required**: None (all configuration via environment variables)

### Risk Mitigation

| Risk | Mitigation | Plan |
|------|------------|------|
| API integration failures | Mock services for testing | 03-02, 03-03 |
| Widget preview complexity | Mock preview as fallback | 03-04 |
| API key security | Hash storage, show once | 03-05 |
| Mobile responsiveness | Progressive enhancement | 03-06 |

</execution_strategy>

<verification_criteria>

## Phase Verification

### ADMIN-01: Training Data Source Management

**Verification Steps:**
1. Navigate to /admin/sources
2. Document list displays with columns: title, type, status, chunks, date
3. Status badges show correct colors (processing=secondary, ready=default, failed=destructive)
4. "Add Document" button opens dialog with 3 input types
5. URL ingestion validates format and ingests
6. PDF upload validates file type and size
7. Text input validates minimum length
8. Delete action removes document with confirmation
9. Re-index action updates document status

**Pass Criteria:** Admin can fully manage training documents

### ADMIN-02: Conversation History

**Verification Steps:**
1. Navigate to /admin/conversations
2. Conversation list displays with columns: session, messages, date
3. Search input filters conversations by keyword
4. Date range picker filters by date
5. Click conversation navigates to thread view
6. Messages display with user/assistant distinction
7. Source citations shown for assistant messages
8. Back button returns to list

**Pass Criteria:** Admin can fully review conversations

### ADMIN-03: Widget Customization

**Verification Steps:**
1. Navigate to /admin/settings
2. Form fields display: color, position, welcome message, button text, header title
3. Color picker updates preview immediately
4. Position selector updates preview immediately
5. Welcome message updates preview immediately
6. Save button persists settings
7. Refresh page and verify settings persist
8. Preview shows accurate widget appearance

**Pass Criteria:** Admin can fully customize widget appearance

### ADMIN-04: Embed Code Generation

**Verification Steps:**
1. Navigate to /admin/embed
2. API key displayed with prefix
3. Show/hide toggle works
4. Copy button copies key
5. Regenerate button creates new key with warning
6. Embed script displays with all data attributes
7. Copy button copies embed script
8. Installation instructions present

**Pass Criteria:** Admin can generate deployable widget code

### Overall Phase Verification

**Pass Criteria:**
- [ ] All 4 ADMIN requirements verified above
- [ ] Dashboard shows aggregate statistics
- [ ] All pages have loading states (skeletons)
- [ ] Error boundaries prevent app crash
- [ ] Mobile responsive on all pages
- [ ] Toast notifications for user feedback
- [ ] Authentication required on all routes
- [ ] Logout functionality works

</verification_criteria>

<success_criteria>

## Phase Success Criteria

### Complete (All Required)

1. **ADMIN-01**: Admin manages training data sources ✅
   - Add/delete/view documents
   - Status indicators visible
   - Changes reflect in chat within 2 minutes

2. **ADMIN-02**: Admin views conversation history ✅
   - List with timestamps
   - Search/filter by date and keyword
   - Thread view with messages

3. **ADMIN-03**: Admin customizes widget ✅
   - Primary color changes
   - Position (bottom-left/right) changes
   - Welcome message changes
   - Instant preview
   - Changes save immediately

4. **ADMIN-04**: Admin generates embed code ✅
   - Script tag with correct API key
   - Copy to clipboard
   - Widget loads with configured appearance

5. **Dashboard**: Admin sees overview ✅
   - Document count
   - Conversation count
   - Quick actions to all sections

6. **Quality**: Admin panel meets standards ✅
   - Loading states on all pages
   - Error handling with boundaries
   - Mobile responsive
   - Accessible (WCAG AA)
   - Consistent UX with toasts

### Total: 6/6 success criteria met

</success_criteria>

<output>

## Plans Created

| Plan | File | Wave | Focus | Tasks |
|------|------|------|-------|-------|
| 03-01 | 03-01-PLAN.md | 1 | Foundation | 6 tasks |
| 03-02 | 03-02-PLAN.md | 2 | Sources Management | 6 tasks |
| 03-03 | 03-03-PLAN.md | 3 | Conversations | 6 tasks |
| 03-04 | 03-04-PLAN.md | 4 | Widget Settings | 7 tasks |
| 03-05 | 03-05-PLAN.md | 5 | Embed Code | 6 tasks |
| 03-06 | 03-06-PLAN.md | 6 | Polish & Verification | 7 tasks |

## Next Steps

Execute Phase 3 plans in order:

```
/gsd-execute-phase 3 --wave 1   # Foundation
/gsd-execute-phase 3 --wave 2   # Sources Management
/gsd-execute-phase 3 --wave 3   # Conversations
/gsd-execute-phase 3 --wave 4   # Widget Settings
/gsd-execute-phase 3 --wave 5   # Embed Code
/gsd-execute-phase 3 --wave 6   # Polish & Verification
```

Or execute all waves sequentially:

```
/gsd-execute-phase 3
```

## After Phase 3 Completion

1. Create 03-FINAL-SUMMARY.md documenting all deliverables
2. Update ROADMAP.md marking Phase 3 complete
3. Update STATE.md with accumulated context
4. Begin Phase 4 planning: Production Hardening + Scale

</output>
