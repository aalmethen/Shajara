# Shajara (شَجَرَة) — Technical Specification

> Family Tree Platform for Arab Families

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Database Schema](#5-database-schema)
6. [API Reference](#6-api-reference)
7. [Authentication & Authorization](#7-authentication--authorization)
8. [Frontend Architecture](#8-frontend-architecture)
9. [Core Algorithms](#9-core-algorithms)
10. [Configuration](#10-configuration)
11. [Development Setup](#11-development-setup)

---

## 1. Overview

**Shajara** is a full-stack web application for building and visualizing family trees, designed specifically for Arab families. It features a **universal person graph** (persons exist globally, trees are views), Arabic-first UI (RTL), traditional nasab (النسب) generation, male lineage mode for Arab genealogy, polygamy support, cross-tree linking, global person search, public tree sharing, and relationship discovery between any two family members.

### Key Features

| Feature | Description |
|---------|-------------|
| Tree Visualization | D3.js-powered interactive SVG tree with pan, zoom, collapse/expand |
| Male Lineage Mode | Traditional Arab genealogy — only expands descendants through males |
| Full Tree Mode | Expands descendants through both parents |
| Nasab Generation | Automatic Arabic lineage naming (e.g., "أحمد بن محمد بن عبدالله الفندي") |
| Polygamy Support | Multiple wives per person, ordered by `marriage_order` |
| Relationship Finder | BFS path-finding + LCA algorithm with Arabic kinship labels |
| Universal Person Graph | Persons exist globally; trees are computed views from a root person |
| Cross-Tree Linking | Link parents/spouses across trees — families can merge through shared ancestors |
| Global Person Search | Search persons across all trees by name |
| Export | Download tree data as JSON or CSV (with UTF-8 BOM for Excel) |
| Bulk Import | Upload persons via CSV/JSON with automatic parent name resolution |
| Public Sharing | Trees accessible via unique slug without authentication |
| Audit Logging | All CUD operations logged with old/new values |
| Collaborative | Multi-user access with admin/viewer roles |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Client (React)                     │
│  Vite 7 · React 19 · React Router 7 · Tailwind CSS 4   │
│  D3.js · Axios                                          │
├─────────────────────────────────────────────────────────┤
│                   Vite Dev Proxy /api →                  │
├─────────────────────────────────────────────────────────┤
│                   Server (Express.js)                    │
│  JWT Auth · Helmet · Morgan · express-validator          │
├─────────────────────────────────────────────────────────┤
│                  PostgreSQL 16 (Docker)                  │
│  uuid-ossp · Enum types · Recursive CTEs · PL/pgSQL     │
│  Graph traversal functions · Universal person graph      │
└─────────────────────────────────────────────────────────┘
```

- **Monorepo** with npm workspaces (`server/` + `client/`)
- **Development**: Vite dev server on `:5173` proxies `/api` to Express on `:3001`
- **Database**: PostgreSQL 16 via Docker Compose, UUID primary keys
- **Auth**: Stateless JWT (7-day expiry), stored in `localStorage`

---

## 3. Tech Stack

### Server

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.21.0 | HTTP server |
| pg | ^8.13.0 | PostgreSQL client |
| jsonwebtoken | ^9.0.2 | JWT generation/verification |
| bcryptjs | ^2.4.3 | Password hashing (cost 10) |
| helmet | ^7.1.0 | Security headers |
| morgan | ^1.10.0 | HTTP request logging |
| express-validator | ^7.2.0 | Input validation |
| uuid | ^10.0.0 | UUID generation |
| dotenv | ^16.4.5 | Environment variables |
| nodemon | ^3.1.4 | Dev auto-reload |

### Client

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.0 | UI framework |
| react-dom | ^19.2.0 | DOM renderer |
| react-router-dom | ^7.13.0 | Client routing |
| d3 | ^7.9.0 | Tree layout & zoom/pan |
| axios | ^1.13.4 | HTTP client |
| tailwindcss | ^4.1.18 | Utility CSS |
| @tailwindcss/vite | ^4.1.18 | Tailwind Vite plugin |
| vite | ^7.2.4 | Build tool / dev server |
| @vitejs/plugin-react | ^5.1.1 | React Fast Refresh |

---

## 4. Project Structure

```
shajara/
├── .env.example                          # Environment template
├── docker-compose.yml                    # PostgreSQL container
├── package.json                          # Root workspace config
│
├── server/
│   ├── index.js                          # Express entry point
│   ├── package.json
│   ├── .env                              # Server environment
│   │
│   ├── db/
│   │   ├── pool.js                       # pg Pool singleton
│   │   ├── migrate.js                    # Migration runner
│   │   ├── seed.js                       # Sample data seeder
│   │   ├── seed-fendi.js                 # Extended sample data (185 persons)
│   │   └── migrations/
│   │       ├── 001_create_users.sql
│   │       ├── 002_create_family_trees.sql
│   │       ├── 003_create_persons.sql
│   │       ├── 004_create_spouses.sql
│   │       ├── 005_create_tree_members.sql
│   │       ├── 006_create_audit_log.sql
│   │       ├── 007_universal_person_graph.sql   # Graph traversal PG functions
│   │       └── 008_migrate_existing_data.sql    # Data migration (drop family_tree_id)
│   │
│   ├── middleware/
│   │   ├── auth.js                       # requireAuth, optionalAuth
│   │   └── treeAccess.js                 # requireTreeAdmin, requireTreeAccess, requirePersonEditAccess
│   │
│   ├── routes/
│   │   ├── auth.js                       # POST /register, /login, GET /me
│   │   ├── trees.js                      # CRUD /api/trees
│   │   ├── persons.js                    # CRUD /api/trees/:treeId/persons
│   │   ├── spouses.js                    # CRUD /api/trees/:treeId/spouses
│   │   ├── members.js                    # CRUD /api/trees/:treeId/members
│   │   ├── export.js                     # GET  /api/trees/:treeId/export
│   │   ├── import.js                     # POST /api/trees/:treeId/import
│   │   ├── relationship.js              # GET  /api/trees/:treeId/relationship
│   │   └── search.js                    # GET  /api/persons/search (global search)
│   │
│   └── utils/
│       ├── auditLog.js                   # Audit trail logging (nullable tree)
│       ├── graphTraversal.js             # Graph traversal (getTreeGraph, canUserEditPerson)
│       └── relationship.js               # BFS, LCA, Arabic labeling
│
└── client/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    │
    └── src/
        ├── main.jsx                      # React entry point
        ├── App.jsx                       # Router + AuthProvider
        ├── index.css                     # Tailwind + custom theme
        │
        ├── api/
        │   └── client.js                # Axios instance + API modules
        │
        ├── contexts/
        │   └── AuthContext.jsx           # Auth state + login/register/logout
        │
        ├── hooks/
        │   └── useTreeData.js            # Tree data management hook
        │
        ├── pages/
        │   ├── Home.jsx                  # Landing page
        │   ├── Login.jsx                 # Login form
        │   ├── Register.jsx              # Registration form
        │   ├── Dashboard.jsx             # User's trees list (protected)
        │   └── TreeView.jsx              # Main tree view (public/admin)
        │
        ├── components/
        │   ├── Layout.jsx                # Page wrapper
        │   ├── Navbar.jsx                # Navigation bar
        │   │
        │   ├── tree/
        │   │   ├── TreeCanvas.jsx        # D3 SVG tree visualization
        │   │   ├── TreeControls.jsx      # Lineage mode, root, depth, search
        │   │   ├── PersonNode.jsx        # HTML person node (unused, legacy)
        │   │   ├── PersonDetailPanel.jsx # Side panel for selected person
        │   │   ├── AddPersonModal.jsx    # Add person form
        │   │   ├── AddSpouseModal.jsx    # Add spouse relationship form
        │   │   ├── EditPersonModal.jsx   # Edit person form
        │   │   ├── ImportModal.jsx       # Bulk import interface
        │   │   ├── RelationshipModal.jsx # Relationship finder
        │   │   └── LinkPersonModal.jsx   # Global person search & link
        │   │
        │   └── ui/
        │       ├── Button.jsx            # Variants: primary, secondary, danger, ghost
        │       ├── Input.jsx             # Form input with label/error
        │       ├── Modal.jsx             # Dialog modal with backdrop
        │       └── Select.jsx            # Dropdown select
        │
        └── utils/
            ├── treeLayout.js             # D3 hierarchy builder + fit-to-screen
            ├── nasab.js                  # Arabic lineage string generator
            └── importParser.js           # CSV/JSON import parsing
```

---

## 5. Database Schema

### Architecture: Universal Person Graph

Persons exist **globally** — not scoped to a single tree. A "tree" is a **computed view** defined by:
- `root_person_id` — the starting person
- `traversal_mode` — `'descendants'`, `'ancestors'`, or `'both'`
- `depth_limit` — maximum traversal depth

PostgreSQL functions (`get_tree_person_ids`, `get_tree_person_ids_with_spouses`) perform recursive graph traversal to compute which persons belong to a tree view.

### Entity Relationship Diagram

```
users ──┬── family_trees ──── tree_members
        │        │
        │   (root_person_id)
        │        │
        │        ▼
        └── persons ──── spouses
              │
              └── audit_log (nullable tree ref)
```

### 5.1 `users`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, default `uuid_generate_v4()` |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL |
| `password_hash` | VARCHAR(255) | NOT NULL |
| `name` | VARCHAR(255) | NOT NULL |
| `created_at` | TIMESTAMPTZ | default `NOW()` |

### 5.2 `family_trees`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, default `uuid_generate_v4()` |
| `name` | VARCHAR(255) | NOT NULL |
| `description` | TEXT | |
| `root_person_id` | UUID | FK → persons(id) ON DELETE SET NULL |
| `slug` | VARCHAR(255) | UNIQUE, NOT NULL |
| `traversal_mode` | VARCHAR(20) | default `'descendants'` — `'descendants'`, `'ancestors'`, `'both'` |
| `depth_limit` | INTEGER | default `20` |
| `created_by` | UUID | FK → users(id) ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | default `NOW()` |
| `updated_at` | TIMESTAMPTZ | default `NOW()` |

> **Note**: A tree is a **computed view** — its members are determined by graph traversal from `root_person_id` using `traversal_mode` and `depth_limit`. The `get_tree_person_ids()` PG function performs this traversal.

### 5.3 `persons`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, default `uuid_generate_v4()` |
| `first_name` | VARCHAR(255) | NOT NULL |
| `family_name` | VARCHAR(255) | |
| `gender` | `gender_enum` | NOT NULL — `'male'` or `'female'` |
| `father_id` | UUID | FK → persons(id) ON DELETE SET NULL |
| `mother_id` | UUID | FK → persons(id) ON DELETE SET NULL |
| `birth_date` | VARCHAR(50) | Flexible format (year, full date, Hijri) |
| `death_date` | VARCHAR(50) | Same flexible format |
| `status` | `person_status_enum` | default `'alive'` — `'alive'` or `'deceased'` |
| `bio` | TEXT | |
| `photo_url` | VARCHAR(500) | |
| `home_tree_id` | UUID | FK → family_trees(id) ON DELETE SET NULL — provenance tracking |
| `created_by` | UUID | FK → users(id) ON DELETE SET NULL |
| `verified` | BOOLEAN | default `false` |
| `created_at` | TIMESTAMPTZ | default `NOW()` |
| `updated_at` | TIMESTAMPTZ | default `NOW()` |

> **Note**: Persons are **global** — not scoped to a single tree. `home_tree_id` tracks which tree originally created the person (for provenance and access control only). Tree membership is computed via graph traversal from `father_id`/`mother_id` chains.

**Indexes**: `idx_persons_father_mother`, `idx_persons_home_tree`, `idx_persons_created_by`

### 5.4 `spouses`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, default `uuid_generate_v4()` |
| `person_a_id` | UUID | FK → persons(id) ON DELETE CASCADE, NOT NULL |
| `person_b_id` | UUID | FK → persons(id) ON DELETE CASCADE, NOT NULL |
| `marriage_date` | VARCHAR(50) | |
| `divorce_date` | VARCHAR(50) | |
| `marriage_order` | INTEGER | default `1` (supports polygamy ordering) |
| `status` | `marriage_status_enum` | default `'married'` — `'married'`, `'divorced'`, `'widowed'` |
| `created_by` | UUID | FK → users(id) ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | default `NOW()` |

> **Note**: Spouses are **global** — not scoped to a tree. Spouse relationships are included in tree views via the `get_tree_person_ids_with_spouses()` function.

**Indexes**: `idx_spouses_person_a`, `idx_spouses_person_b`

### 5.5 `tree_members`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, default `uuid_generate_v4()` |
| `user_id` | UUID | FK → users(id) ON DELETE CASCADE, NOT NULL |
| `family_tree_id` | UUID | FK → family_trees(id) ON DELETE CASCADE, NOT NULL |
| `role` | `member_role_enum` | default `'viewer'` — `'admin'` or `'viewer'` |
| `linked_person_id` | UUID | FK → persons(id) ON DELETE SET NULL |
| `created_at` | TIMESTAMPTZ | default `NOW()` |

**Constraints**: `UNIQUE(user_id, family_tree_id)`

> `linked_person_id` maps a user to their identity within the tree, enabling "How am I related to this person?" feature.

### 5.6 `audit_log`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, default `uuid_generate_v4()` |
| `family_tree_id` | UUID | FK → family_trees(id) ON DELETE CASCADE, NULLABLE |
| `action` | `audit_action_enum` | NOT NULL — `'add'`, `'edit'`, `'delete'` |
| `entity_type` | VARCHAR(50) | NOT NULL — `'person'` or `'spouse'` |
| `entity_id` | UUID | NOT NULL |
| `changed_by` | UUID | FK → users(id) ON DELETE SET NULL |
| `old_value` | JSONB | Previous state (for edit/delete) |
| `new_value` | JSONB | New state (for add/edit) |
| `created_at` | TIMESTAMPTZ | default `NOW()` |

**Indexes**: `idx_audit_family_tree`

### 5.7 `migrations`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | SERIAL | PK |
| `name` | VARCHAR(255) | UNIQUE, NOT NULL |
| `executed_at` | TIMESTAMPTZ | default `NOW()` |

> Auto-created by the migration runner. Tracks which SQL files have been applied.

### 5.8 PostgreSQL Functions

#### `get_tree_person_ids(p_root_id, p_mode, p_depth)`
Recursive CTE that traverses the person graph from a root person.
- **descendants** mode: follows children (persons whose `father_id` or `mother_id` = current)
- **ancestors** mode: follows `father_id`/`mother_id` upward
- **both** mode: two separate CTEs combined
- Returns `TABLE(person_id UUID, depth INTEGER)`
- Uses `UNION ALL` + `DISTINCT ON` for cycle safety

#### `get_tree_person_ids_with_spouses(p_root_id, p_mode, p_depth)`
Wraps `get_tree_person_ids` and adds spouses of all reachable persons.
- Spouses who are NOT already in the base set are added at their partner's depth
- Returns same `TABLE(person_id UUID, depth INTEGER)`

### 5.9 `graphTraversal.js` Utility

| Function | Description |
|----------|-------------|
| `getTreeGraph(rootId, mode, depth)` | Calls PG function, fetches full persons + spouses, returns `{ persons, spouses, hasMore }` |
| `isPersonReachable(personId, rootId, mode, depth)` | Boolean check if a person is within a tree's view |
| `getPersonTrees(personId)` | Returns all trees where this person is reachable |
| `canUserEditPerson(userId, personId)` | Checks: creator OR home tree admin OR admin of any reachable tree |

### Custom Enum Types

```sql
CREATE TYPE gender_enum          AS ENUM ('male', 'female');
CREATE TYPE person_status_enum   AS ENUM ('alive', 'deceased');
CREATE TYPE marriage_status_enum AS ENUM ('married', 'divorced', 'widowed');
CREATE TYPE member_role_enum     AS ENUM ('admin', 'viewer');
CREATE TYPE audit_action_enum    AS ENUM ('add', 'edit', 'delete');
```

---

## 6. API Reference

Base URL: `/api`

### 6.1 Authentication — `/api/auth`

#### `POST /api/auth/register`
Create a new user account.

| | Details |
|---|---|
| Auth | None |
| Validation | `email` (valid email), `password` (min 6 chars), `name` (required) |
| Request | `{ email, password, name }` |
| Response 201 | `{ user: { id, email, name, created_at }, token }` |
| Errors | 400 duplicate email, 400 validation |

#### `POST /api/auth/login`
Authenticate an existing user.

| | Details |
|---|---|
| Auth | None |
| Validation | `email` (valid email), `password` (required) |
| Request | `{ email, password }` |
| Response 200 | `{ user: { id, email, name }, token }` |
| Errors | 401 invalid credentials |

#### `GET /api/auth/me`
Get the currently authenticated user.

| | Details |
|---|---|
| Auth | Required |
| Response 200 | `{ user: { id, email, name, created_at } }` |
| Errors | 401 invalid/expired token, 404 user not found |

---

### 6.2 Trees — `/api/trees`

#### `POST /api/trees`
Create a new family tree. Auto-creates an admin membership for the creator.

| | Details |
|---|---|
| Auth | Required |
| Validation | `name` (required) |
| Request | `{ name, description?, slug? }` |
| Response 201 | `{ tree }` |
| Notes | If `slug` is omitted, auto-generates from name + UUID suffix |

#### `GET /api/trees`
List all trees the current user is a member of.

| | Details |
|---|---|
| Auth | Required |
| Response 200 | `{ trees: [{ ...tree, role, person_count }] }` |

#### `GET /api/trees/:slug`
Get a tree by its public slug. Returns all persons, spouses, and admin/linked status.

| | Details |
|---|---|
| Auth | Optional |
| Query | `?depth=N` — override depth_limit (max 50) |
| Response 200 | `{ tree, persons[], spouses[], isAdmin, linkedPersonId, hasMore }` |
| Notes | `hasMore` indicates persons exist beyond the depth limit. `isAdmin` / `linkedPersonId` are null/false if not authenticated. Persons are computed via graph traversal from `root_person_id`. |

#### `PUT /api/trees/:id`
Update tree metadata.

| | Details |
|---|---|
| Auth | Required (Admin) |
| Request | `{ name?, description?, slug?, root_person_id?, traversal_mode?, depth_limit? }` |
| Response 200 | `{ tree }` |

#### `DELETE /api/trees/:id`
Delete a tree and all associated data (cascading).

| | Details |
|---|---|
| Auth | Required (Admin) |
| Response 200 | `{ message }` |
| Notes | Clears `root_person_id` before deleting to handle circular FK |

---

### 6.3 Persons — `/api/trees/:treeId/persons`

#### `POST /`
Add a person to the tree.

| | Details |
|---|---|
| Auth | Required (Admin) |
| Validation | `first_name` (required), `gender` ('male'/'female') |
| Request | `{ first_name, gender, family_name?, father_id?, mother_id?, birth_date?, death_date?, status?, bio? }` |
| Response 201 | `{ person }` |
| Side effects | Creates audit log entry |

#### `GET /`
List all persons in the tree.

| | Details |
|---|---|
| Auth | Optional |
| Response 200 | `{ persons[] }` — includes `spouse_relations` JSON aggregate |

#### `GET /:id`
Get detailed person info with related data.

| | Details |
|---|---|
| Auth | Optional |
| Response 200 | `{ person, spouses[], children[], father, mother }` |

#### `PUT /:id`
Update a person's data.

| | Details |
|---|---|
| Auth | Required (Admin) |
| Request | `{ first_name?, family_name?, gender?, father_id?, mother_id?, birth_date?, death_date?, status?, bio? }` |
| Response 200 | `{ person }` |
| Side effects | Creates audit log with old + new values |

#### `DELETE /:id`
Delete a person. Nullifies parent references in children, clears root_person_id if applicable.

| | Details |
|---|---|
| Auth | Required (Admin) |
| Response 200 | `{ message }` |
| Side effects | Cascades to spouse records, creates audit log |

#### `GET /:id/ancestors`
Get the patrilineal ancestor chain using recursive CTE.

| | Details |
|---|---|
| Auth | Optional |
| Response 200 | `{ ancestors: [{ id, first_name, family_name, gender, father_id, mother_id, depth }] }` |

#### `GET /:id/descendants`
Get all descendants, optionally filtered by lineage mode.

| | Details |
|---|---|
| Auth | Optional |
| Query | `?mode=male|full` (default: `male`) |
| Response 200 | `{ descendants[] }` |
| Notes | `male` mode only follows male descendants. `full` mode follows both parents. |

#### `GET /:id/nasab`
Generate the Arabic nasab string for a person.

| | Details |
|---|---|
| Auth | Optional |
| Response 200 | `{ nasab: "أحمد بن محمد بن عبدالله", ancestors[] }` |

---

### 6.4 Spouses — `/api/trees/:treeId/spouses`

#### `POST /`
Create a spouse relationship between two persons.

| | Details |
|---|---|
| Auth | Required (Admin) |
| Validation | `person_a_id` (UUID), `person_b_id` (UUID) |
| Request | `{ person_a_id, person_b_id, marriage_date?, divorce_date?, marriage_order?, status? }` |
| Response 201 | `{ spouse }` |
| Side effects | Audit log |

#### `PUT /:id`
Update a spouse relationship.

| | Details |
|---|---|
| Auth | Required (Admin) |
| Request | `{ marriage_date?, divorce_date?, marriage_order?, status? }` |
| Response 200 | `{ spouse }` |

#### `DELETE /:id`
Remove a spouse relationship.

| | Details |
|---|---|
| Auth | Required (Admin) |
| Response 200 | `{ message }` |

---

### 6.5 Members — `/api/trees/:treeId/members`

#### `POST /`
Add a user as a member of the tree (by email).

| | Details |
|---|---|
| Auth | Required (Admin) |
| Validation | `email` (valid email) |
| Request | `{ email, role?, linked_person_id? }` |
| Response 201 | `{ member }` |
| Errors | 404 user not registered, 400 already a member |

#### `GET /`
List all members of the tree.

| | Details |
|---|---|
| Auth | Required (Admin) |
| Response 200 | `{ members: [{ ...member, email, user_name, linked_person_name }] }` |

#### `PUT /:id`
Update a member's role or linked person.

| | Details |
|---|---|
| Auth | Required (Admin) |
| Request | `{ role?, linked_person_id? }` |
| Response 200 | `{ member }` |

#### `DELETE /:id`
Remove a member from the tree.

| | Details |
|---|---|
| Auth | Required (Admin) |
| Response 200 | `{ message }` |

---

### 6.6 Export — `/api/trees/:treeId/export`

#### `GET /?format=json|csv`
Download tree data as a file.

| | Details |
|---|---|
| Auth | Required (Admin) |
| Query | `format` — `json` (default) or `csv` |
| Response | File download with `Content-Disposition: attachment` |

**JSON format:**
```json
{
  "meta": { "tree_name", "exported_at", "version", "person_count", "spouse_count" },
  "tree": { "id", "name", "description", "slug", "root_person_id" },
  "persons": [{ ...person, "_father_name", "_mother_name" }],
  "spouses": [{ ...spouse, "_person_a_name", "_person_b_name" }]
}
```

**CSV format:**
- Columns: `id, first_name, family_name, gender, father_id, father_name, mother_id, mother_name, birth_date, death_date, status, bio`
- UTF-8 BOM prefix (`\uFEFF`) for Excel Arabic support
- Fields with special characters are double-quoted

---

### 6.7 Import — `/api/trees/:treeId/import`

#### `POST /`
Bulk import persons and spouses into a tree.

| | Details |
|---|---|
| Auth | Required (Admin) |
| Body limit | 5 MB |
| Request | `{ persons: [...], spouses?: [...] }` |
| Response 200 | `{ imported: { persons: N, spouses: N }, warnings: [...] }` |

**Person object fields:**
- Required: `first_name`, `gender` (`male`/`female`/`ذكر`/`أنثى`)
- Optional: `family_name`, `father_id` or `father_name`, `mother_id` or `mother_name`, `birth_date`, `death_date`, `status`, `bio`

**Spouse object fields:**
- Required: `person_a_id` or `person_a_name`, `person_b_id` or `person_b_name`
- Optional: `marriage_date`, `divorce_date`, `marriage_order`, `status`

**Import algorithm:**
1. Load existing persons into lookup map (keyed by `first_name` and `first_name + family_name`)
2. Topological sort: insert persons with no parent references first
3. Resolve `father_name` / `mother_name` → UUID using lookup map with gender preference
4. Insert person, add to lookup map for subsequent resolution
5. Second pass: resolve spouse names → UUIDs, insert spouse records
6. Entire operation wrapped in PostgreSQL transaction (ROLLBACK on error)

---

### 6.8 Relationship — `/api/trees/:treeId/relationship`

#### `GET /?from=UUID&to=UUID`
Find the relationship between two persons.

| | Details |
|---|---|
| Auth | Optional (public trees) |
| Query | `from` (UUID), `to` (UUID) |
| Response 200 | `{ relationship: { label, description, path[], commonAncestor } }` |

**Response example:**
```json
{
  "relationship": {
    "label": "ابن عمه",
    "description": "أحمد ومحمد أبناء عمومة — يتشاركان الجد إبراهيم",
    "path": [
      { "person": { "id", "first_name", "family_name", "gender" }, "edge": null },
      { "person": { ... }, "edge": "parent" },
      { "person": { ... }, "edge": "parent" },
      { "person": { ... }, "edge": "child" },
      { "person": { ... }, "edge": "child" }
    ],
    "commonAncestor": { "id", "first_name", "family_name" }
  }
}
```

---

### 6.9 Global Person Search — `/api/persons`

#### `GET /api/persons/search?q=...&limit=20`
Search persons across all trees by name.

| | Details |
|---|---|
| Auth | Required |
| Query | `q` (search term, min 1 char), `limit` (max 50, default 20) |
| Response 200 | `{ persons: [{ id, first_name, family_name, gender, status, birth_date, death_date, home_tree_id, home_tree_name, home_tree_slug }] }` |
| Notes | Searches `first_name` and `family_name` via `ILIKE`. Used by LinkPersonModal for cross-tree linking. |

---

## 7. Authentication & Authorization

### JWT Token Flow

```
Client                        Server
  │                              │
  │  POST /api/auth/login        │
  │  { email, password }    ───► │ bcrypt.compare() → jwt.sign()
  │                              │
  │  ◄─── { user, token }       │
  │                              │
  │  localStorage.setItem(       │
  │    'shajara_token', token)   │
  │                              │
  │  GET /api/trees              │
  │  Authorization: Bearer xxx ─►│ jwt.verify() → req.user
  │                              │
```

### Token Specification

| Property | Value |
|----------|-------|
| Algorithm | HS256 |
| Expiry | 7 days |
| Payload | `{ userId, email, iat, exp }` |
| Secret | `JWT_SECRET` env variable |
| Storage | `localStorage` as `shajara_token` |

### Middleware

| Middleware | Behavior |
|------------|----------|
| `requireAuth` | Extracts Bearer token, verifies JWT, attaches `req.user = { id, email }`. Returns 401 if invalid. |
| `optionalAuth` | Same as above but continues with `req.user = null` if no token. Used for public endpoints. |
| `requireTreeAdmin` | Queries `tree_members` for `role = 'admin'`. Returns 403 if not admin. Requires `requireAuth` first. |
| `requireTreeAccess` | Allows access if tree has a slug (public) or user is a member. Returns 403 for private trees without membership. |
| `requirePersonEditAccess` | Checks if user can edit a person via `canUserEditPerson()`: creator, home tree admin, or admin of any reachable tree. |

### Client-Side Auth

The `AuthContext` provides:
- `user`, `token`, `loading`, `isAuthenticated`
- `login(email, password)`, `register(name, email, password)`, `logout()`
- Auto-validates token on mount via `GET /api/auth/me`
- `ProtectedRoute` component redirects to `/login` if not authenticated

### Axios Interceptors

- **Request**: Attaches `Authorization: Bearer <token>` from localStorage
- **Response**: On 401, clears auth state and redirects to `/login`

---

## 8. Frontend Architecture

### 8.1 Routing

| Path | Component | Auth | Description |
|------|-----------|------|-------------|
| `/` | `Home` | Public | Landing page with tree slug input |
| `/login` | `Login` | Public | Login form |
| `/register` | `Register` | Public | Registration form |
| `/dashboard` | `Dashboard` | Protected | User's trees list |
| `/tree/:slug` | `TreeView` | Public | Tree visualization |
| `*` | Redirect to `/` | — | Catch-all |

### 8.2 State Management

No external state library. State is managed via:

- **`AuthContext`** — Global auth state via React Context
- **`useTreeData` hook** — Tree-scoped state (persons, spouses, admin status, UI state)
- **Component-local `useState`** — Modals, forms, search, export menu

### 8.3 `useTreeData` Hook

Central data management hook for the tree view. Fetches all data from `GET /api/trees/:slug`.

**State:**

| State | Type | Description |
|-------|------|-------------|
| `tree` | Object | Tree metadata |
| `persons` | Array | All persons in tree |
| `spouses` | Array | All spouse relationships |
| `isAdmin` | Boolean | Current user is admin |
| `loading` | Boolean | Initial load in progress |
| `error` | String | Error message |
| `selectedPerson` | Object | Currently selected person |
| `lineageMode` | `'male'` / `'full'` | Tree display mode |
| `rootPersonId` | UUID | Current root person for tree |
| `maxDepth` | Number | Maximum generations to display (default: 10) |
| `linkedPersonId` | UUID | User's linked person in tree |
| `hasMore` | Boolean | More persons exist beyond depth limit |

**Methods:**

| Method | Description |
|--------|-------------|
| `addPerson(data)` | POST + append to local state |
| `updatePerson(id, data)` | PUT + update local state |
| `deletePerson(id)` | DELETE + remove from local state |
| `addSpouse(data)` | POST + append to local state |
| `deleteSpouse(id)` | DELETE + remove from local state |
| `setRootPerson(id)` | Change tree root |
| `toggleLineageMode()` | Toggle male ↔ full |
| `setMaxDepth(n)` | Change generation depth |
| `refetch()` | Re-fetch all data from server |

### 8.4 Component Hierarchy

```
App
├── AuthProvider
│   └── AppRoutes
│       ├── Home
│       ├── Login
│       ├── Register
│       ├── ProtectedRoute → Dashboard
│       └── TreeView
│           ├── TreeCanvas (SVG tree)
│           │   ├── SvgPersonNode (per person)
│           │   └── SvgSpouseNode (per spouse)
│           ├── TreeControls (side panel)
│           ├── PersonDetailPanel (selected person)
│           ├── AddPersonModal
│           ├── AddSpouseModal
│           ├── EditPersonModal
│           ├── ImportModal
│           ├── RelationshipModal
│           └── LinkPersonModal (global person search)
```

### 8.5 Key Components

#### `TreeCanvas`
D3-powered SVG tree visualization.
- Builds hierarchy via `buildHierarchy()` from `treeLayout.js`
- D3 zoom/pan on the SVG element (scale extent: 0.05–4x)
- Auto fit-to-screen on load and data change
- Auto pan-to-node when a person is selected
- Collapse/expand nodes via circular +/− buttons
- Spouse nodes positioned to the left with dashed connectors
- Mother group labels ("من فاطمة") when a person has children by multiple wives
- Curved Bezier links between parent and child nodes

#### `TreeControls`
Control panel with:
- **Lineage mode toggle**: نسب الذكور (male) / شجرة كاملة (full)
- **Root person selector**: Dropdown of all male persons + females without fathers
- **Depth slider**: Range 1–15 generations
- **Search**: Type-ahead search by first name or family name (top 8 results)
- **Compare button**: Opens RelationshipModal for comparing any two persons

#### `PersonDetailPanel`
Slide-in side panel showing:
- Nasab (Arabic lineage string)
- Bio, birth/death dates, status
- Father and mother links
- Spouse list
- Children list
- Admin actions: Add child, Add spouse, Edit, Delete, View from here
- Relationship buttons: "كيف أنا مرتبط بهذا الشخص؟" (when linkedPersonId exists), "مقارنة مع شخص آخر"

#### `ImportModal`
Bulk import interface with:
- CSV / JSON tab selector
- Drag-and-drop file upload zone
- "Download template" link (generates Arabic CSV with BOM)
- Preview table after parsing (name, gender, father, mother, status)
- Validation error display
- Import button → API call → success/warning display

#### `RelationshipModal`
Relationship finder with:
- Two searchable person selectors (with type-ahead filter)
- Auto-search when both persons are pre-selected
- Result display: large gold Arabic label, description text, common ancestor
- Visual path: vertical chain of person boxes with edge labels (↑ أب/أم, ↓ ابن/بنت, ⟷ زوج/ة)

### 8.6 API Client (`client.js`)

Axios instance configured at `/api` base URL.

```js
authAPI    = { register, login, me }
treesAPI   = { create, list, getBySlug, update, delete, exportJSON, exportCSV, importData, relationship }
personsAPI = { create, list, get, update, delete, search }
spousesAPI = { create, update, delete }
membersAPI = { create, list, update, delete }
```

### 8.7 Theme / Styling

Tailwind CSS v4 with custom theme defined in `index.css`:

| Token | Value | Usage |
|-------|-------|-------|
| `navy-900` | `#0f172a` | Page background |
| `navy-800` | `#1e293b` | Card/panel background |
| `navy-700` | `#334155` | Borders, input backgrounds |
| `navy-600` | `#475569` | Lighter borders |
| `gold-500` | `#d4a843` | Primary accent |
| `gold-400` | `#e0b85c` | Hover accent |
| `gold-600` | `#c9952a` | Active accent |
| `gold-700` | `#a67c1e` | Dark accent |
| `charcoal` | `#1a1a2e` | Alternative dark |

**Fonts:**
- `Noto Kufi Arabic` — Body text (sans-serif)
- `Amiri` — Nasab/calligraphic text (serif)

**Global settings:**
- `direction: rtl` on body
- Custom scrollbar styling for dark theme
- Tree node hover effect: `filter: brightness(1.2)`

---

## 9. Core Algorithms

### 9.1 Tree Layout (`treeLayout.js`)

**`buildHierarchy(persons, spouses, rootId, mode, maxDepth, collapsedNodes)`**

1. Creates a `personMap` (Map: id → person) and `spouseMap` (Map: personId → [{spouse, relationship}])
2. Recursively builds a tree starting from `rootId`
3. **Male lineage mode**: Only expands children where `father_id = person.id` (males only; females are leaf nodes)
4. **Full mode**: Expands children where `father_id = person.id OR mother_id = person.id`
5. Groups children by the "other parent" for display labels (e.g., "من فاطمة")
6. Respects `collapsedNodes` Set — collapsed nodes retain `_hasChildren: true` but no `children` array
7. Converts to D3 hierarchy via `d3.hierarchy()`
8. Applies `d3.tree()` layout with `nodeSize([220, 180])` and custom separation function

**`fitToScreen(hierarchy, width, height)`**

Calculates a `d3.zoomIdentity` transform to center the tree within the container, with 100px padding and max scale 1.5.

### 9.2 Nasab Generator (`nasab.js`)

**`generateNasab(person, allPersons)`**

Traverses the `father_id` chain upward (max 20 levels) to build the Arabic lineage string:

```
أحمد بن محمد بن عبدالله الفندي
      ↑        ↑              ↑
    "بن"    "بن"      family_name
```

- Males: connector = "بن" (son of)
- Females: connector = "بنت" (daughter of) for first level, then "بن"
- Appends `family_name` from the first ancestor that has one

### 9.3 Import Parser (`importParser.js`)

**`parseCSV(text)`**

1. Strips UTF-8 BOM
2. Splits into rows, extracts header row
3. Maps Arabic headers to English: `الاسم_الأول` → `first_name`, `الجنس` → `gender`, etc.
4. Normalizes values: `ذكر` → `male`, `أنثى` → `female`, `حي` → `alive`, `متوفى` → `deceased`
5. Validates required fields (first_name, gender)
6. Returns `{ persons: [], errors: [] }`

**`generateTemplate()`**

Returns a CSV string with BOM and Arabic headers + one example row.

### 9.4 Relationship Finder (`server/utils/relationship.js`)

**Core pipeline:**

```
persons + spouses
       │
       ▼
buildFamilyGraph()  →  adjacency list (parent/child/spouse edges)
       │
       ▼
findPath()          →  BFS shortest path from A to B
       │
       ├── spouse edge? → labelSpouseRelationship()
       │
       └── blood? → findLCA() → labelRelationship()
                         │
                         ▼
                  { label, description, path, commonAncestor }
```

**`buildFamilyGraph(persons, spouses)`**

Creates bidirectional adjacency list:
- `parent → child` edges (with subtype: son/daughter)
- `child → parent` edges (with subtype: father/mother)
- `spouse ↔ spouse` edges

**`findPath(graph, fromId, toId)`**

Standard BFS shortest path. Returns array of `{ id, edge: { type, subtype } }`. Time complexity: O(V+E).

**`findLCA(personAId, personBId, personMap)`**

1. `getAllAncestors(personA)` — BFS upward through both father and mother lines (max 30 depth)
2. `getAllAncestors(personB)` — same
3. Find common ancestor with minimum total depth (depthA + depthB)
4. Returns `{ lcaId, depthA, depthB, viaA, viaB }`

**`labelRelationship(personAId, personBId, personMap, lca)`**

Arabic kinship label based on (depthA, depthB) from LCA:

| depthA | depthB | Label (male B) | Label (female B) |
|--------|--------|----------------|-------------------|
| 0 | 1 | ابنه | ابنته |
| 0 | 2 | حفيده | حفيدته |
| 1 | 0 | أبوه | أمه |
| 2 | 0 | جده | جدته |
| 1 | 1 | أخوه الشقيق / من الأب / من الأم | أخته ... |
| 1 | 2 | عمه / خاله | عمته / خالته |
| 2 | 1 | ابن أخيه | بنت أخيه |
| 2 | 2 | ابن عمه / ابن خاله | بنت عمه / بنت خاله |
| N | N | أبناء عمومة درجة N-1 | — |
| N | M | أبناء عمومة بفارق \|N-M\| | — |

**Gender-aware**: Uses target person's gender for term selection.
**Paternal vs. maternal**: Checks if the LCA path goes through father or mother to distinguish عم/خال (paternal/maternal uncle).
**Spouse handling**: Direct spouse → "زوجها"/"زوجته". Through-marriage → "عن طريق المصاهرة".

---

## 10. Configuration

### 10.1 Environment Variables

File: `server/.env`

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://shajara_user:shajara_pass@localhost:5432/shajara` | PostgreSQL connection string |
| `JWT_SECRET` | (none — required) | Secret for JWT signing |
| `PORT` | `3001` | Express server port |

### 10.2 Docker Compose

PostgreSQL 16 Alpine container:
- Port: `5432`
- Database: `shajara`
- User: `shajara_user`
- Password: `shajara_pass`
- Volume: `pgdata` for persistence

### 10.3 Vite Configuration

- React plugin with Fast Refresh
- Tailwind CSS v4 Vite plugin
- Dev server on port `5173`
- Proxy: `/api` → `http://localhost:3001`

### 10.4 NPM Scripts

| Script | Location | Command |
|--------|----------|---------|
| `npm run dev` | Root | Runs server + client concurrently |
| `npm run dev:server` | Root | `nodemon server/index.js` |
| `npm run dev:client` | Root | `vite` |
| `npm run migrate` | Root | `node server/db/migrate.js` |
| `npm run seed` | Root | `node server/db/seed.js` |
| `npm run build` | Client | `vite build` |

---

## 11. Development Setup

### Prerequisites
- Node.js 18+
- Docker (for PostgreSQL)

### Steps

```bash
# 1. Clone and install
cd shajara
npm install

# 2. Start PostgreSQL
docker compose up -d

# 3. Configure environment
cp .env.example server/.env
# Edit server/.env — set JWT_SECRET

# 4. Run migrations
npm run migrate

# 5. (Optional) Seed sample data
npm run seed

# 6. Start development servers
npm run dev
# → Server: http://localhost:3001
# → Client: http://localhost:5173
```

### Test accounts (after seeding)

| Email | Password | Role |
|-------|----------|------|
| `admin@shajara.app` | `admin123` | Admin of al-fendi tree |

### Sample tree

After seeding, visit `http://localhost:5173/tree/al-fendi` to view the al-Fendi family tree with 185 persons and 27 spouse relationships.
