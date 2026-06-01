# Ingenious Academy — Final Build Plan

Mobile-first private coaching platform. No public signup. Admin-managed students.

## Decisions locked in
1. **Super Admin**: First-run setup screen. App detects "no admin exists" → shows setup page to create the first admin account. Once one admin exists, setup route redirects to login.
2. **Standards**: Stored in a `standards` table (seeded with 4th–10th) so new standards can be added by admin without code changes.
3. **PDFs**: External URLs only (Google Drive shareable links). Auto-convert Drive `/view` URLs to `/preview` for embedding.

---

## Backend (Lovable Cloud)

### Schema (migration)
- `standards` (id, name, display_order) — seeded 4th–10th
- `profiles` (id PK → auth.users, name, email, phone, parent_phone, standard_id FK, is_active, created_at)
- `app_role` enum: `admin`, `student`
- `user_roles` (id, user_id, role) + `has_role(uuid, app_role)` security definer
- `subjects` (id, subject_name, standard_id FK, description)
- `chapters` (id, chapter_name, chapter_number, subject_id FK, description)
- `lectures` (id, lecture_title, lecture_number, youtube_url, chapter_id FK, description)
- `notes` (id, title, pdf_url, chapter_id FK, description)
- `announcements` (id, title, message, created_at)
- `tests` (id, title, chapter_id FK, total_marks)
- `questions` (id, test_id FK, question_text, options jsonb, correct_option int, marks)
- `results` (id, student_id, test_id, score, percentage, attempt_date, answers jsonb)

### RLS
- Admin full CRUD via `has_role(auth.uid(),'admin')`.
- Students: SELECT on standards/subjects/chapters/lectures/notes/announcements/tests; SELECT questions WITHOUT `correct_option` (exposed via server fn only).
- `results`: students INSERT/SELECT own rows; admins SELECT all.
- `profiles`: students SELECT/UPDATE own; admins all.

### Server functions (createServerFn)
- `checkSetupNeeded()` — returns whether any admin exists (public).
- `createSuperAdmin(email, password, name)` — only runs if no admin exists; creates auth user + admin role via `supabaseAdmin`.
- `createStudent`, `updateStudent`, `disableStudent`, `deleteStudent`, `resetStudentPassword` — admin only.
- `getTestForStudent(testId)` — returns questions without correct_option.
- `submitTest(testId, answers)` — grades server-side, writes `results`.

---

## Frontend

### Routes
```
/setup                          (first-run super admin creation)
/login
/forgot-password
/reset-password
/_authenticated/                (role-aware redirect)
/_authenticated/_student/dashboard
/_authenticated/_student/lectures
/_authenticated/_student/lectures/$lectureId
/_authenticated/_student/notes
/_authenticated/_student/tests
/_authenticated/_student/tests/$testId
/_authenticated/_student/results
/_authenticated/_student/announcements
/_authenticated/_admin/dashboard
/_authenticated/_admin/students
/_authenticated/_admin/standards
/_authenticated/_admin/subjects
/_authenticated/_admin/chapters
/_authenticated/_admin/lectures
/_authenticated/_admin/notes
/_authenticated/_admin/tests
/_authenticated/_admin/announcements
/_authenticated/_admin/results
/_authenticated/_admin/settings
```

### Access control
- Root `/`: if not authed → `/login`; if authed → role-based dashboard.
- `_admin` layout: redirects students away.
- `_student` layout: redirects admins to admin dashboard.
- `/login` checks setup state first; if no admin exists → redirect to `/setup`.

### UI
- Mobile-first, sidebar collapses to sheet drawer on mobile.
- Blue primary + white surfaces; shadcn cards; clean typography.
- YouTube: `<iframe src="https://youtube.com/embed/{id}">`.
- PDF: convert Google Drive URL → `/preview` and embed in `<iframe>`; also show "Open in Drive" + "Download" buttons.
- Student dashboard: welcome message + 5 nav cards + recent announcements.
- Search bar on student lectures page filters subjects/chapters/lectures by title.

### Test taking
- Student starts test → server fn returns questions sans answers → answers in local state → submit → server grades and stores result → results page.

---

## Seed data (migration)
- Standards 4th–10th
- Sample: 10th Standard → Mathematics → Real Numbers → "Introduction to Real Numbers" (placeholder YouTube URL)
- One welcome announcement
- One sample test with 2 MCQs

---

Starting the build now.
