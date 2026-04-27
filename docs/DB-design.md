# LCMS Database Schema

> **Version:** 1.0  
> **Database:** PostgreSQL  
> **Tổng số bảng:** 18  
> **Quy ước:** Tất cả bảng dùng `UUID` làm PK, `TIMESTAMPTZ` cho timestamp, soft delete qua `deleted_at`

---

## Mục lục

1. [Enums](#1-enums)
2. [Users & Roles](#2-users--roles)
   - [users](#21-users)
   - [user_roles](#22-user_roles)
   - [refresh_tokens](#23-refresh_tokens)
3. [Course Structure](#3-course-structure)
   - [courses](#31-courses)
   - [lessons](#32-lessons)
   - [sub_lessons](#33-sub_lessons)
4. [Materials & SCORM](#4-materials--scorm)
   - [sub_lesson_materials](#41-sub_lesson_materials)
   - [scorm_packages](#42-scorm_packages)
5. [Question Bank](#5-question-bank)
   - [questions](#51-questions)
   - [question_media](#52-question_media)
   - [question_options](#53-question_options)
6. [Exam](#6-exam)
   - [exams](#61-exams)
   - [exam_sections](#62-exam_sections)
   - [exam_questions](#63-exam_questions)
   - [exam_question_options](#64-exam_question_options)
7. [Notifications](#7-notifications)
   - [notifications](#71-notifications)
   - [email_logs](#72-email_logs)
8. [Audit Log](#8-audit-log)
   - [review_logs](#81-review_logs)
9. [Propagation Rules](#9-propagation-rules)

---

## 1. Enums

```sql
CREATE TYPE user_role AS ENUM (
    'admin', 'teacher', 'expert', 'converter'
);

CREATE TYPE course_status AS ENUM (
    'draft', 'in_progress', 'ready_to_publish', 'published', 'unpublished'
);

CREATE TYPE lesson_status AS ENUM (
    'draft', 'in_progress', 'approved'
);

CREATE TYPE sub_lesson_status AS ENUM (
    'draft', 'in_progress', 'submitted', 'reviewing',
    'in_conversion', 'scorm_uploaded', 'scorm_reviewing', 'approved'
);

CREATE TYPE exam_status AS ENUM (
    'draft', 'submitted', 'reviewing', 'published', 'rejected', 'archived'
);

CREATE TYPE question_type AS ENUM (
    'single_choice', 'multi_choice', 'fill_blank',
    'true_false', 'matching',
    'picture_matching', 'form_dialogue', 'sentence_ordering'
);

CREATE TYPE exam_section_type AS ENUM (
    'multiple_choice', 'listening', 'image_description',
    'reading', 'sentence_ordering'
);

CREATE TYPE difficulty_level AS ENUM (
    'easy', 'medium', 'hard'
);

CREATE TYPE review_action AS ENUM (
    'submit', 'approve', 'reject', 'upload_scorm',
    'assign_converter', 'publish', 'unpublish',
    'assign_teacher', 'assign_expert'
);

CREATE TYPE notification_event AS ENUM (
    'teacher_submitted',
    'expert_rejected_sublesson',
    'expert_approved_content',
    'converter_uploaded_scorm',
    'expert_rejected_scorm',
    'expert_approved_scorm',
    'admin_published_course',
    'teacher_submitted_exam',
    'expert_rejected_exam',
    'expert_approved_exam',
    'teacher_added_to_course',
    'expert_assigned_to_course'
);
```

---

## 2. Users & Roles

### 2.1 `users`

> Tài khoản nội bộ LCMS. Không lưu `role` trực tiếp — tách ra bảng `user_roles` để hỗ trợ multi-role.

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | `gen_random_uuid()` |
| `email` | `VARCHAR(255)` | UQ, NN | Email đăng nhập, unique |
| `password_hash` | `VARCHAR(255)` | NN | bcrypt hash |
| `full_name` | `VARCHAR(255)` | NN | Họ tên đầy đủ |
| `avatar_url` | `TEXT` | | S3 URL ảnh đại diện |
| `is_active` | `BOOLEAN` | NN | Default `true`. `false` = khoá tài khoản |
| `last_login_at` | `TIMESTAMPTZ` | | Lần đăng nhập cuối |
| `created_at` | `TIMESTAMPTZ` | NN | Default `now()` |
| `updated_at` | `TIMESTAMPTZ` | NN | Auto update |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |

```sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(255) NOT NULL,
    avatar_url    TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);
```

---

### 2.2 `user_roles`

> Gán nhiều role cho 1 user. PK composite `(user_id, role)`.  
> `revoked_at IS NULL` = role đang active.

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `user_id` | `UUID` | FK → users.id, NN | PK composite |
| `role` | `user_role` | NN | PK composite |
| `assigned_by` | `UUID` | FK → users.id | Admin gán |
| `assigned_at` | `TIMESTAMPTZ` | NN | Default `now()` |
| `revoked_at` | `TIMESTAMPTZ` | | `NULL` = đang active. Có giá trị = đã thu hồi |

```sql
CREATE TABLE user_roles (
    user_id     UUID NOT NULL REFERENCES users(id),
    role        user_role NOT NULL,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at  TIMESTAMPTZ,
    PRIMARY KEY (user_id, role)
);
```

---

### 2.3 `refresh_tokens`

> JWT refresh token management. Hỗ trợ revoke khi logout.

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `user_id` | `UUID` | FK → users.id, NN | |
| `token_hash` | `VARCHAR(255)` | UQ | Hash của refresh token |
| `expires_at` | `TIMESTAMPTZ` | NN | Thời điểm hết hạn |
| `revoked_at` | `TIMESTAMPTZ` | | Logout / thu hồi token |
| `created_at` | `TIMESTAMPTZ` | NN | |

```sql
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    token_hash  VARCHAR(255) UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3. Course Structure

### 3.1 `courses`

> Khóa học — node gốc. Admin tạo, gán Expert duy nhất kiểm duyệt toàn course.

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `created_by` | `UUID` | FK → users.id, NN | Admin tạo |
| `assigned_expert_id` | `UUID` | FK → users.id, NN | 1 Expert duy nhất kiểm duyệt course này |
| `title` | `VARCHAR(500)` | NN | Tên khóa học |
| `description` | `TEXT` | | Mô tả khóa học |
| `hsk_level` | `SMALLINT` | | Cấp độ HSK 1–6 |
| `language` | `VARCHAR(10)` | NN | Default `'zh'`. Mã ngôn ngữ ISO |
| `thumbnail_url` | `TEXT` | | Ảnh đại diện (S3) |
| `status` | `course_status` | NN | draft → in_progress → ready_to_publish → published / unpublished |
| `published_at` | `TIMESTAMPTZ` | | Thời điểm Admin publish |
| `order_index` | `INTEGER` | NN | Thứ tự hiển thị. Default `0` |
| `created_at` | `TIMESTAMPTZ` | NN | |
| `updated_at` | `TIMESTAMPTZ` | NN | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |

```sql
CREATE TABLE courses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by          UUID NOT NULL REFERENCES users(id),
    assigned_expert_id  UUID NOT NULL REFERENCES users(id),
    title               VARCHAR(500) NOT NULL,
    description         TEXT,
    hsk_level           SMALLINT CHECK (hsk_level BETWEEN 1 AND 6),
    language            VARCHAR(10) NOT NULL DEFAULT 'zh',
    thumbnail_url       TEXT,
    status              course_status NOT NULL DEFAULT 'draft',
    published_at        TIMESTAMPTZ,
    order_index         INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);
```

---

### 3.2 `lessons`

> Chương / chủ đề trong Course. 1 Teacher + 1 Converter phụ trách toàn bộ lesson (bao gồm tất cả sub-lesson bên trong).

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `course_id` | `UUID` | FK → courses.id, NN | |
| `assigned_teacher_id` | `UUID` | FK → users.id | 1 Teacher phụ trách toàn bộ lesson |
| `assigned_converter_id` | `UUID` | FK → users.id | 1 Converter phụ trách toàn bộ lesson |
| `title` | `VARCHAR(500)` | NN | Tên bài học |
| `description` | `TEXT` | | |
| `status` | `lesson_status` | NN | Tính tự động từ sub_lessons. Default `'draft'` |
| `order_index` | `INTEGER` | NN | Thứ tự trong course |
| `created_at` | `TIMESTAMPTZ` | NN | |
| `updated_at` | `TIMESTAMPTZ` | NN | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |

```sql
CREATE TABLE lessons (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id               UUID NOT NULL REFERENCES courses(id),
    assigned_teacher_id     UUID REFERENCES users(id),
    assigned_converter_id   UUID REFERENCES users(id),
    title                   VARCHAR(500) NOT NULL,
    description             TEXT,
    status                  lesson_status NOT NULL DEFAULT 'draft',
    order_index             INTEGER NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at              TIMESTAMPTZ
);
```

---

### 3.3 `sub_lessons`

> Bài học nhỏ — đơn vị sản xuất nội dung. Mỗi sub-lesson có 1 luồng trạng thái từ `draft` đến `approved`.

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `lesson_id` | `UUID` | FK → lessons.id, NN | |
| `title` | `VARCHAR(500)` | NN | Tên sub-lesson |
| `description` | `TEXT` | | |
| `status` | `sub_lesson_status` | NN | Default `'draft'` |
| `order_index` | `INTEGER` | NN | Thứ tự trong lesson |
| `submitted_at` | `TIMESTAMPTZ` | | Thời điểm Teacher submit lần đầu |
| `approved_at` | `TIMESTAMPTZ` | | Thời điểm SCORM approved hoàn toàn |
| `created_at` | `TIMESTAMPTZ` | NN | |
| `updated_at` | `TIMESTAMPTZ` | NN | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |

> **Lưu ý:** `question_pool_size` và `question_draw_size` không lưu vào DB — cấu hình qua ENV.  
> `assigned_converter_id` quản lý ở cấp `lessons`, không phải từng sub-lesson.

```sql
CREATE TABLE sub_lessons (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id    UUID NOT NULL REFERENCES lessons(id),
    title        VARCHAR(500) NOT NULL,
    description  TEXT,
    status       sub_lesson_status NOT NULL DEFAULT 'draft',
    order_index  INTEGER NOT NULL DEFAULT 0,
    submitted_at TIMESTAMPTZ,
    approved_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ
);
```

---

## 4. Materials & SCORM

### 4.1 `sub_lesson_materials`

> Tài liệu thô Teacher upload. **Nhiều file trên 1 sub-lesson** (bài giảng, bài tập, từ vựng...).

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `sub_lesson_id` | `UUID` | FK → sub_lessons.id, NN | |
| `uploaded_by` | `UUID` | FK → users.id, NN | Teacher upload |
| `file_name` | `VARCHAR(500)` | NN | Tên file gốc. VD: `bai-giang-gia-dinh.pptx` |
| `file_url` | `TEXT` | NN | S3 / MinIO URL |
| `file_type` | `VARCHAR(10)` | NN | `pptx` \| `pdf` \| `docx` \| `doc` \| `xlsx` \| `xls` \| `ppt` |
| `file_size` | `BIGINT` | NN | Bytes |
| `order_index` | `INTEGER` | NN | Thứ tự file trong sub-lesson |
| `created_at` | `TIMESTAMPTZ` | NN | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete — không xoá file S3 ngay |

```sql
CREATE TABLE sub_lesson_materials (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_lesson_id  UUID NOT NULL REFERENCES sub_lessons(id),
    uploaded_by    UUID NOT NULL REFERENCES users(id),
    file_name      VARCHAR(500) NOT NULL,
    file_url       TEXT NOT NULL,
    file_type      VARCHAR(10) NOT NULL,
    file_size      BIGINT NOT NULL,
    order_index    INTEGER NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ
);
```

---

### 4.2 `scorm_packages`

> SCORM .zip do Converter upload. Lưu lịch sử version — chỉ 1 `is_active = true` tại một thời điểm.

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `sub_lesson_id` | `UUID` | FK → sub_lessons.id, NN | |
| `uploaded_by` | `UUID` | FK → users.id, NN | Converter upload |
| `version` | `INTEGER` | NN | Tăng dần mỗi lần upload lại. V1, V2... |
| `is_active` | `BOOLEAN` | NN | `true` = version đang dùng. Chỉ 1 active / sub_lesson |
| `zip_url` | `TEXT` | NN | S3 URL file .zip gốc |
| `extracted_path` | `TEXT` | | S3 prefix sau khi unzip để serve iframe preview |
| `entry_point` | `VARCHAR(500)` | | File HTML khởi động. VD: `index.html` |
| `file_size` | `BIGINT` | | Bytes |
| `scorm_version` | `VARCHAR(20)` | NN | Default `'SCORM 2004'` |
| `created_at` | `TIMESTAMPTZ` | NN | |

```sql
CREATE TABLE scorm_packages (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_lesson_id  UUID NOT NULL REFERENCES sub_lessons(id),
    uploaded_by    UUID NOT NULL REFERENCES users(id),
    version        INTEGER NOT NULL DEFAULT 1,
    is_active      BOOLEAN NOT NULL DEFAULT false,
    zip_url        TEXT NOT NULL,
    extracted_path TEXT,
    entry_point    VARCHAR(500),
    file_size      BIGINT,
    scorm_version  VARCHAR(20) NOT NULL DEFAULT 'SCORM 2004',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 5. Question Bank

### 5.1 `questions`

> Ngân hàng câu hỏi gắn theo Sub-Lesson. Hỗ trợ 8 loại câu hỏi bao gồm các dạng đặc thù của HSK 1-3.  
> Media (ảnh/audio) tách ra bảng `question_media` để hỗ trợ nhiều file trên 1 câu hỏi.

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `sub_lesson_id` | `UUID` | FK → sub_lessons.id, NN | |
| `created_by` | `UUID` | FK → users.id, NN | Teacher tạo |
| `question_type` | `question_type` | NN | Xem enum |
| `content` | `TEXT` | NN | Nội dung câu hỏi text. Có thể rỗng nếu chỉ có audio |
| `explanation` | `TEXT` | | Giải thích đáp án đúng (hiển thị sau khi trả lời) |
| `difficulty` | `difficulty_level` | | `easy` \| `medium` \| `hard` |
| `score` | `NUMERIC(5,2)` | NN | Điểm câu hỏi. Default `1.00` |
| `order_index` | `INTEGER` | NN | Thứ tự trong pool |
| `created_at` | `TIMESTAMPTZ` | NN | |
| `updated_at` | `TIMESTAMPTZ` | NN | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |

**Mapping loại câu hỏi → HSK:**

| question_type | Dạng HSK | Mô tả |
|---|---|---|
| `single_choice` | Tất cả | Chọn 1 đáp án đúng |
| `multi_choice` | HSK 3+ | Chọn nhiều đáp án đúng |
| `fill_blank` | Tất cả | Điền từ vào chỗ trống |
| `true_false` | HSK 1-2 | Nghe + xem ảnh → đúng/sai |
| `matching` | HSK 2-3 | Nối cột A với cột B |
| `picture_matching` | HSK 1-2 | Nghe audio → chọn 1 trong 5 ảnh |
| `form_dialogue` | HSK 1-2 | Ghép câu hỏi ↔ câu trả lời |
| `sentence_ordering` | HSK 3 | Sắp xếp từ thành câu đúng |

```sql
CREATE TABLE questions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_lesson_id  UUID NOT NULL REFERENCES sub_lessons(id),
    created_by     UUID NOT NULL REFERENCES users(id),
    question_type  question_type NOT NULL,
    content        TEXT NOT NULL DEFAULT '',
    explanation    TEXT,
    difficulty     difficulty_level,
    score          NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    order_index    INTEGER NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ
);
```

---

### 5.2 `question_media`

> Media đính kèm câu hỏi. **Nhiều ảnh / audio trên 1 câu hỏi.**  
> `display_role` xác định vị trí hiển thị trên UI.

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `question_id` | `UUID` | FK → questions.id, NN | |
| `media_type` | `VARCHAR(10)` | NN | `image` \| `audio` |
| `display_role` | `VARCHAR(50)` | NN | `question_image` \| `question_audio` \| `option_image` |
| `url` | `TEXT` | NN | S3 URL file media |
| `order_index` | `INTEGER` | NN | Thứ tự nếu nhiều media cùng loại |
| `created_at` | `TIMESTAMPTZ` | NN | |

**Giải thích `display_role`:**

| display_role | Ý nghĩa |
|---|---|
| `question_image` | Ảnh minh hoạ cho câu hỏi (true/false + ảnh) |
| `question_audio` | Audio câu hỏi (listening, picture_matching) |
| `option_image` | Ảnh dùng làm đáp án (picture_matching — 5 ảnh) |

```sql
CREATE TABLE question_media (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id  UUID NOT NULL REFERENCES questions(id),
    media_type   VARCHAR(10) NOT NULL CHECK (media_type IN ('image', 'audio')),
    display_role VARCHAR(50) NOT NULL,
    url          TEXT NOT NULL,
    order_index  INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 5.3 `question_options`

> Đáp án cho câu hỏi. Hỗ trợ cả text và ảnh.  
> `media_id` dùng khi đáp án là ảnh (picture_matching).  
> `match_key` dùng cho matching, form_dialogue, sentence_ordering.

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `question_id` | `UUID` | FK → questions.id, NN | |
| `media_id` | `UUID` | FK → question_media.id | `NULL` nếu đáp án text. Dùng cho `picture_matching` |
| `content` | `TEXT` | | Nội dung đáp án text. `NULL` nếu đáp án là ảnh |
| `is_correct` | `BOOLEAN` | NN | Đáp án đúng / sai |
| `match_key` | `VARCHAR(100)` | | Key ghép cặp hoặc vị trí đúng (matching, form_dialogue, sentence_ordering) |
| `order_index` | `INTEGER` | NN | Thứ tự hiển thị |

```sql
CREATE TABLE question_options (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id),
    media_id    UUID REFERENCES question_media(id),
    content     TEXT,
    is_correct  BOOLEAN NOT NULL DEFAULT false,
    match_key   VARCHAR(100),
    order_index INTEGER NOT NULL DEFAULT 0
);
```

---

## 6. Exam

### 6.1 `exams`

> Bài thi gắn theo Sub-Lesson. Có luồng phê duyệt riêng với Expert.  
> `draw_size` — số câu random từ Question Bank khi học viên thi (cấu hình per exam).

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `sub_lesson_id` | `UUID` | FK → sub_lessons.id, NN | |
| `created_by` | `UUID` | FK → users.id, NN | Teacher tạo |
| `title` | `VARCHAR(500)` | NN | Tên bài thi |
| `description` | `TEXT` | | |
| `duration_minutes` | `INTEGER` | | Thời gian làm bài (phút) |
| `pass_score` | `NUMERIC(5,2)` | | Điểm đạt %. VD: `70.00` |
| `draw_size` | `INTEGER` | NN | Số câu random từ Question Bank khi thi |
| `status` | `exam_status` | NN | Default `'draft'` |
| `published_at` | `TIMESTAMPTZ` | | Tự động set khi Expert approve |
| `created_at` | `TIMESTAMPTZ` | NN | |
| `updated_at` | `TIMESTAMPTZ` | NN | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |

```sql
CREATE TABLE exams (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_lesson_id    UUID NOT NULL REFERENCES sub_lessons(id),
    created_by       UUID NOT NULL REFERENCES users(id),
    title            VARCHAR(500) NOT NULL,
    description      TEXT,
    duration_minutes INTEGER,
    pass_score       NUMERIC(5,2),
    draw_size        INTEGER NOT NULL DEFAULT 10,
    status           exam_status NOT NULL DEFAULT 'draft',
    published_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ
);
```

---

### 6.2 `exam_sections`

> Phần thi trong đề — mỗi section một dạng (nghe, tranh, đọc...).

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `exam_id` | `UUID` | FK → exams.id, NN | |
| `section_type` | `exam_section_type` | NN | Loại phần thi |
| `title` | `VARCHAR(500)` | NN | VD: `Phần 1 — Nghe hiểu` |
| `instruction` | `TEXT` | | Hướng dẫn làm phần thi |
| `audio_url` | `TEXT` | | S3 URL — dùng cho `listening` section |
| `image_url` | `TEXT` | | S3 URL — dùng cho `image_description` section |
| `reading_passage` | `TEXT` | | Đoạn văn — dùng cho `reading` section |
| `order_index` | `INTEGER` | NN | Thứ tự phần thi |

```sql
CREATE TABLE exam_sections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id         UUID NOT NULL REFERENCES exams(id),
    section_type    exam_section_type NOT NULL,
    title           VARCHAR(500) NOT NULL,
    instruction     TEXT,
    audio_url       TEXT,
    image_url       TEXT,
    reading_passage TEXT,
    order_index     INTEGER NOT NULL DEFAULT 0
);
```

---

### 6.3 `exam_questions`

> Câu hỏi trong từng section của đề thi.

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `section_id` | `UUID` | FK → exam_sections.id, NN | |
| `content` | `TEXT` | NN | Nội dung câu hỏi |
| `question_type` | `question_type` | NN | Reuse enum từ question bank |
| `image_url` | `TEXT` | | Ảnh riêng từng câu (nếu có) |
| `score` | `NUMERIC(5,2)` | NN | Điểm câu. Default `1.00` |
| `explanation` | `TEXT` | | Giải thích đáp án |
| `order_index` | `INTEGER` | NN | |

```sql
CREATE TABLE exam_questions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id    UUID NOT NULL REFERENCES exam_sections(id),
    content       TEXT NOT NULL,
    question_type question_type NOT NULL,
    image_url     TEXT,
    score         NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    explanation   TEXT,
    order_index   INTEGER NOT NULL DEFAULT 0
);
```

---

### 6.4 `exam_question_options`

> Đáp án cho câu hỏi trong đề thi.

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `exam_question_id` | `UUID` | FK → exam_questions.id, NN | |
| `content` | `TEXT` | | Nội dung lựa chọn text |
| `image_url` | `TEXT` | | Ảnh đáp án (dạng image description) |
| `is_correct` | `BOOLEAN` | NN | |
| `order_index` | `INTEGER` | NN | |

```sql
CREATE TABLE exam_question_options (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_question_id UUID NOT NULL REFERENCES exam_questions(id),
    content          TEXT,
    image_url        TEXT,
    is_correct       BOOLEAN NOT NULL DEFAULT false,
    order_index      INTEGER NOT NULL DEFAULT 0
);
```

---

## 7. Notifications

### 7.1 `notifications`

> Thông báo in-app cho từng user. Trigger từ 12 sự kiện trong workflow.

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `recipient_id` | `UUID` | FK → users.id, NN | Người nhận |
| `event_type` | `notification_event` | NN | 12 loại sự kiện theo spec mục 7.1 |
| `entity_type` | `VARCHAR(50)` | NN | `sub_lesson` \| `exam` \| `course` \| `lesson` |
| `entity_id` | `UUID` | NN | ID của entity liên quan |
| `message` | `TEXT` | NN | Nội dung thông báo hiển thị |
| `is_read` | `BOOLEAN` | NN | Default `false` |
| `read_at` | `TIMESTAMPTZ` | | Thời điểm đánh dấu đã đọc |
| `created_at` | `TIMESTAMPTZ` | NN | |

```sql
CREATE TABLE notifications (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id),
    event_type   notification_event NOT NULL,
    entity_type  VARCHAR(50) NOT NULL,
    entity_id    UUID NOT NULL,
    message      TEXT NOT NULL,
    is_read      BOOLEAN NOT NULL DEFAULT false,
    read_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 7.2 `email_logs`

> Track trạng thái gửi email. Hỗ trợ retry khi `status = 'failed'`.

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `notification_id` | `UUID` | FK → notifications.id | |
| `to_email` | `VARCHAR(255)` | NN | Địa chỉ nhận |
| `subject` | `VARCHAR(500)` | NN | Tiêu đề email |
| `status` | `VARCHAR(20)` | NN | `pending` \| `sent` \| `failed` |
| `sent_at` | `TIMESTAMPTZ` | | Thời điểm gửi thành công |
| `error_message` | `TEXT` | | Lý do thất bại nếu `failed` |
| `created_at` | `TIMESTAMPTZ` | NN | |

```sql
CREATE TABLE email_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES notifications(id),
    to_email        VARCHAR(255) NOT NULL,
    subject         VARCHAR(500) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    sent_at         TIMESTAMPTZ,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 8. Audit Log

### 8.1 `review_logs`

> Audit trail toàn bộ thay đổi status trong hệ thống.  
> Lưu đầy đủ: ai, lúc nào, action, from/to status, comment, và snapshot nội dung.  
> **Không bao giờ xóa dòng trong bảng này.**

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `actor_id` | `UUID` | FK → users.id, NN | Người thực hiện action |
| `entity_type` | `VARCHAR(50)` | NN | `sub_lesson` \| `exam` \| `course` \| `lesson` |
| `entity_id` | `UUID` | NN | ID của entity bị thay đổi |
| `action` | `review_action` | NN | Loại action |
| `from_status` | `VARCHAR(50)` | | Trạng thái trước khi thay đổi |
| `to_status` | `VARCHAR(50)` | | Trạng thái sau khi thay đổi |
| `comment` | `TEXT` | | Ghi chú / lý do reject. **Bắt buộc khi `action = 'reject'`** |
| `snapshot` | `JSONB` | | Snapshot nội dung entity tại thời điểm action |
| `created_at` | `TIMESTAMPTZ` | NN | **Index column này** |

```sql
CREATE TABLE review_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID NOT NULL REFERENCES users(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id   UUID NOT NULL,
    action      review_action NOT NULL,
    from_status VARCHAR(50),
    to_status   VARCHAR(50),
    comment     TEXT,
    snapshot    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_logs_created_at ON review_logs(created_at);
CREATE INDEX idx_review_logs_entity ON review_logs(entity_type, entity_id);
```

---

## 9. Propagation Rules

> Quy tắc tính trạng thái tự động theo chiều từ dưới lên (bottom-up).  
> Tất cả propagation thực hiện trong **cùng 1 transaction** khi cập nhật status của sub-lesson.

### Sub-Lesson → Lesson

| Điều kiện | Lesson status |
|---|---|
| ≥ 1 sub-lesson chuyển sang `in_progress` | `in_progress` |
| Tất cả sub-lesson = `approved` | `approved` |
| Bất kỳ sub-lesson nào bị reject → quay về trạng thái trước `approved` | `in_progress` |

### Lesson → Course

| Điều kiện | Course status |
|---|---|
| ≥ 1 lesson chuyển sang `in_progress` | `in_progress` |
| Tất cả lesson = `approved` | `ready_to_publish` |
| Bất kỳ lesson nào bị kéo về `in_progress` | `in_progress` |
| Admin bấm Publish (thủ công, chỉ khi `ready_to_publish`) | `published` |
| Admin bấm Unpublish (thủ công) | `unpublished` |

### Recommended Indexes

```sql
-- Tìm sub-lesson theo lesson
CREATE INDEX idx_sub_lessons_lesson_id ON sub_lessons(lesson_id);

-- Tìm lesson theo course
CREATE INDEX idx_lessons_course_id ON lessons(course_id);

-- Tìm materials theo sub-lesson
CREATE INDEX idx_materials_sub_lesson_id ON sub_lesson_materials(sub_lesson_id);

-- Tìm câu hỏi theo sub-lesson
CREATE INDEX idx_questions_sub_lesson_id ON questions(sub_lesson_id);

-- Tìm media theo câu hỏi
CREATE INDEX idx_question_media_question_id ON question_media(question_id);

-- Tìm notification chưa đọc theo user
CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_id, is_read)
    WHERE is_read = false;

-- Tìm active SCORM package
CREATE UNIQUE INDEX idx_scorm_active ON scorm_packages(sub_lesson_id)
    WHERE is_active = true;
```