# Phase 3 Context: Admin Panel + Completeness

**Created:** February 7, 2026
**Phase:** 3 - Admin Panel + Completeness

---

## Goal

Businesses can manage their chatbot through a self-service admin panel, including training data management, conversation oversight, and widget customization.

---

## Implementation Decisions

### Authentication: Supabase Auth

**Decision:** Use Supabase Auth for admin panel authentication.

**Rationale:**
- Unified user management (same as widget tenant owners)
- Row-level security ties directly to auth.users
- Built-in providers (Google, GitHub, email)
- Session management via Supabase SSR packages
- Reduced infrastructure (no separate auth service)

**Implementation:**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => 
          cookieStore.set(name, value, options)) }
      }
    }
  )
}
```

### UI Framework: Shadcn/ui

**Decision:** Use Shadcn/ui component library.

**Rationale:**
- Copy-paste source code (full control, no hidden abstractions)
- Tailwind-native (matches Phase 1 tech choices)
- Built on Radix UI (accessible primitives)
- Active community, regular updates
- Easy to customize per brand requirements

**Components to use:**
- DataTable (documents management)
- Dialog (confirmations, forms)
- Toast (notifications)
- Card (layout)
- Form (React Hook Form + Zod validation)
- Select (dropdowns)
- Tabs (navigation)

---

## Requirements Covered

| ID | Requirement | Implementation Approach |
|----|-------------|------------------------|
| ADMIN-01 | Training data source management | DataTable with CRUD operations on documents table |
| ADMIN-02 | Conversation history | Threaded message view with search/filter |
| ADMIN-03 | Widget customization | Form with live preview, save to settings table |
| ADMIN-04 | Embed code generation | Dynamic script tag generation with tenant config |

---

## Technical Constraints

### From Previous Phases

- **Frontend:** Next.js 14 with React 18 (App Router)
- **Styling:** Tailwind CSS
- **Backend:** FastAPI with Supabase
- **Database:** Supabase PostgreSQL with RLS

### From Project Research

- **Admin Patterns:** Established SaaS conventions (left nav, header, cards)
- **Widget Customization:** Colors, position, welcome message stored per tenant

### Admin Panel Structure

```
/admin
  /dashboard        # Overview (docs count, conversations, API usage)
  /sources         # Documents management (ADMIN-01)
  /conversations   # Chat history (ADMIN-02)
  /settings        # Widget customization (ADMIN-03)
  /embed           # Embed code + API keys (ADMIN-04)
```

---

## Open Questions (for Research)

1. How to implement real-time conversation updates in admin panel?
2. What's the optimal document upload flow (drag-drop vs file picker)?
3. Should conversation search use full-text or filter by date/session?

---

## References

- ROADMAP.md: Phase 3 specifications
- research/SUMMARY.md: Admin panel recommendations
- Phase 1 RESEARCH.md: Frontend stack patterns
- Phase 2 RESEARCH.md: Database schema for documents/conversations
