# Question Bank — Thiết kế kỹ thuật

> **Version:** 1.0  
> **Ngày:** 2026-05-15  
> **Phạm vi:** Database schema, S3 storage path, JSON content format, module backend, component frontend

---

## Mục lục

1. [Tổng quan dạng câu hỏi](#1-tổng-quan-dạng-câu-hỏi)
2. [S3 Storage — Cấu trúc path](#2-s3-storage--cấu-trúc-path)
3. [ContentBlock — Định dạng JSON nội dung](#3-contentblock--định-dạng-json-nội-dung)
4. [Database Schema](#4-database-schema)
5. [JSON mẫu từng dạng câu hỏi](#5-json-mẫu-từng-dạng-câu-hỏi)
6. [Enums cần cập nhật](#6-enums-cần-cập-nhật)
7. [Module Backend](#7-module-backend)
8. [Component Frontend](#8-component-frontend)
9. [Phân quyền](#9-phân-quyền)

---

## 1. Tổng quan dạng câu hỏi

| Code | Tên đầy đủ | Mô tả | Cấu trúc đáp án |
|---|---|---|---|
| `TF` | Đúng / Sai | Chọn True hoặc False | 2 choice cố định |
| `SC` | Single Choice | Trắc nghiệm 1 đáp án | N choice, 1 `is_correct` |
| `MC` | Multi Choice | Trắc nghiệm nhiều đáp án | N choice, nhiều `is_correct` |
| `FIT` | Fill In Text | Điền 1 ô trống (câu hỏi có sẵn ngữ cảnh, 1 chỗ `___`) | 1 blank |
| `FITS` | Fill In Text (multi) | Điền nhiều ô (câu hỏi có `{{1}}`, `{{2}}`...) | N blanks |
| `FIB` | Fill In Blank | Điền câu trả lời tự do, không có ngữ cảnh trong câu | 1 blank |
| `SQ` | Sequence | Xếp các mục theo đúng thứ tự | N choices có thứ tự đúng |
| `MAT` | Matching | Kéo và thả: nối source → target | N cặp source/target |
| `PAIR_MATCH` | Pair Match | Vẽ đường nối 2 cột trái/phải | N cặp left/right |

### Phân biệt FIT / FITS / FIB

- **FIT**: Câu hỏi là một câu có sẵn ngữ cảnh, chứa đúng **1 chỗ trống** dạng `___`.  
  Ví dụ: `"Hà Nội là thủ đô của ___"`
- **FITS**: Câu hỏi chứa **nhiều chỗ trống** dạng `{{1}}`, `{{2}}`...  
  Ví dụ: `"{{1}} là thủ đô của {{2}}"`
- **FIB**: Câu hỏi **không có ngữ cảnh trong câu** (kiểu "Cho biết X là gì?"), người học điền câu trả lời vào ô trống hoàn toàn tự do.

---

## 2. S3 Storage — Cấu trúc path

Dùng chung bucket với Documents và SCORM. Mỗi loại media có prefix riêng để dễ quản lý và phân quyền bucket policy.

```
{bucket}/
├── Documents/
│   └── {sub_lesson_id}/
│       └── {filename}                          ← tài liệu nguồn hiện tại
│
├── scorm/
│   └── {scorm_package_id}/
│       └── ...                                 ← SCORM package hiện tại
│
└── questions/
    └── {question_id}/
        ├── stem/
        │   ├── {uuid}.jpg                      ← ảnh trong câu hỏi
        │   └── {uuid}.mp3                      ← audio trong câu hỏi
        ├── explanation/
        │   └── {uuid}.jpg                      ← ảnh trong phần giải thích
        └── choices/
            └── {choice_id}/
                ├── {uuid}.jpg                  ← ảnh trong lựa chọn
                └── {uuid}.mp3                  ← audio trong lựa chọn
```

**Quy tắc đặt tên file:**

| Quy tắc | Chi tiết |
|---|---|
| Tên file | UUID v4 + extension gốc. Ví dụ: `3f2a1b4c-...-.mp3` |
| Extension giữ nguyên | `.jpg`, `.png`, `.webp`, `.mp3`, `.m4a`, `.ogg` |
| Không lưu tên gốc vào path | Tên gốc lưu vào DB field `original_filename`, không đưa vào S3 key |
| Xoá câu hỏi → xoá toàn prefix | Khi xoá question, xoá đệ quy `questions/{question_id}/` |

**Content-Type quy định:**

| Loại | MIME types được chấp nhận |
|---|---|
| Ảnh | `image/jpeg`, `image/png`, `image/webp` |
| Audio | `audio/mpeg` (mp3), `audio/mp4` (m4a), `audio/ogg` |

---

## 3. ContentBlock — Định dạng JSON nội dung

`ContentBlock` là đơn vị nội dung dùng chung cho câu hỏi, lựa chọn, và giải thích. Lưu dưới dạng `JSONB` trong PostgreSQL.

### 3.1 Định nghĩa TypeScript

```typescript
type MediaType = "text" | "image" | "audio" | "text_image" | "text_audio";

interface ContentBlock {
  type: MediaType;
  text?: string;           // có khi type = "text" | "text_image" | "text_audio"
  media_key?: string;      // S3 key — có khi type = "image" | "audio" | "text_image" | "text_audio"
  media_url?: string;      // presigned URL — chỉ có trong response, KHÔNG lưu DB
  original_filename?: string; // tên file gốc khi upload
}
```

> **Lưu ý quan trọng:** `media_url` là presigned URL sinh ra lúc response, **không lưu vào DB**. DB chỉ lưu `media_key`.

### 3.2 Các kiểu ContentBlock

| `type` | `text` | `media_key` | Mô tả |
|---|---|---|---|
| `"text"` | ✅ | ❌ | Chỉ văn bản |
| `"image"` | ❌ | ✅ | Chỉ ảnh |
| `"audio"` | ❌ | ✅ | Chỉ âm thanh |
| `"text_image"` | ✅ | ✅ | Văn bản kèm ảnh |
| `"text_audio"` | ✅ | ✅ | Văn bản kèm audio |

### 3.3 Ví dụ

```json
// Chỉ text
{ "type": "text", "text": "Hà Nội là thủ đô của ___" }

// Chỉ ảnh
{ "type": "image", "media_key": "questions/abc.../stem/3f2a1b4c.jpg", "original_filename": "question_img.jpg" }

// Chỉ audio
{ "type": "audio", "media_key": "questions/abc.../choices/def.../3f2a1b4c.mp3", "original_filename": "audio.mp3" }

// Text + ảnh
{ "type": "text_image", "text": "Đây là hình ảnh gì?", "media_key": "questions/abc.../stem/3f2a1b4c.jpg", "original_filename": "img.png" }

// Text + audio (phổ biến trong bài nghe)
{ "type": "text_audio", "text": "Nghe và chọn đáp án đúng:", "media_key": "questions/abc.../stem/3f2a1b4c.mp3", "original_filename": "listening.mp3" }
```

---

## 4. Database Schema

### 4.1 Enums (SQL)

```sql
-- Thay thế toàn bộ question_type cũ
CREATE TYPE question_type AS ENUM (
    'tf',           -- True/False
    'sc',           -- Single Choice
    'mc',           -- Multi Choice
    'fit',          -- Fill In Text (1 blank)
    'fits',         -- Fill In Text (multi blank)
    'fib',          -- Fill In Blank (free form)
    'sq',           -- Sequence
    'mat',          -- Matching (drag & drop)
    'pair_match'    -- Pair Match (vẽ đường nối)
);

CREATE TYPE question_status AS ENUM (
    'draft',        -- Teacher đang soạn
    'published',    -- Đã duyệt, có thể dùng
    'archived'      -- Lưu trữ, không dùng nữa
);

CREATE TYPE content_media_type AS ENUM (
    'text', 'image', 'audio', 'text_image', 'text_audio'
);
```

### 4.2 Bảng `questions`

> Bảng chính lưu câu hỏi. Câu hỏi có thể tồn tại độc lập (ngân hàng chung) hoặc gắn với một `sub_lesson`.

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | `gen_random_uuid()` |
| `sub_lesson_id` | `UUID` | FK → sub_lessons.id, nullable | Gắn sub-lesson (null = ngân hàng chung) |
| `created_by` | `UUID` | FK → users.id, NN | Teacher tạo câu hỏi |
| `question_type` | `question_type` | NN | Dạng câu hỏi |
| `difficulty` | `difficulty_level` | NN | `easy` / `medium` / `hard` |
| `tags` | `TEXT[]` | | Nhãn tìm kiếm. Ví dụ: `{HSK2, vocabulary}` |
| `stem` | `JSONB` | NN | ContentBlock — nội dung câu hỏi chính |
| `explanation` | `JSONB` | nullable | ContentBlock — giải thích đáp án đúng |
| `status` | `question_status` | NN | Default `'draft'` |
| `order_index` | `INTEGER` | NN | Thứ tự trong sub-lesson. Default `0` |
| `created_at` | `TIMESTAMPTZ` | NN | |
| `updated_at` | `TIMESTAMPTZ` | NN | |
| `deleted_at` | `TIMESTAMPTZ` | | Soft delete |

```sql
CREATE TABLE questions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sub_lesson_id   UUID REFERENCES sub_lessons(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id),
    question_type   question_type NOT NULL,
    difficulty      difficulty_level NOT NULL DEFAULT 'medium',
    tags            TEXT[] NOT NULL DEFAULT '{}',
    stem            JSONB NOT NULL,
    explanation     JSONB,
    status          question_status NOT NULL DEFAULT 'draft',
    order_index     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_questions_sub_lesson ON questions(sub_lesson_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_questions_type       ON questions(question_type)  WHERE deleted_at IS NULL;
CREATE INDEX idx_questions_status     ON questions(status)         WHERE deleted_at IS NULL;
CREATE INDEX idx_questions_tags       ON questions USING GIN(tags);
CREATE INDEX idx_questions_stem       ON questions USING GIN(stem);
```

### 4.3 Bảng `question_choices`

> Dùng cho: **TF, SC, MC, SQ, MAT, PAIR_MATCH**

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `question_id` | `UUID` | FK → questions.id, NN | |
| `content` | `JSONB` | NN | ContentBlock — nội dung lựa chọn |
| `is_correct` | `BOOLEAN` | nullable | Dùng cho TF/SC/MC. `null` cho SQ/MAT/PAIR_MATCH |
| `order_index` | `INTEGER` | NN | Thứ tự hiển thị (bị xáo trộn khi render) |
| `correct_order` | `INTEGER` | nullable | Thứ tự đúng — dùng cho **SQ** |
| `group` | `VARCHAR(20)` | nullable | `"source"/"target"` (MAT), `"left"/"right"` (PAIR_MATCH) |
| `match_id` | `UUID` | FK → question_choices.id, nullable | Trỏ tới choice đối diện đúng — **MAT, PAIR_MATCH** |

```sql
CREATE TABLE question_choices (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    content      JSONB NOT NULL,
    is_correct   BOOLEAN,
    order_index  INTEGER NOT NULL DEFAULT 0,
    correct_order INTEGER,
    group_name   VARCHAR(20),
    match_id     UUID REFERENCES question_choices(id) ON DELETE SET NULL
);

CREATE INDEX idx_choices_question ON question_choices(question_id);
```

### 4.4 Bảng `question_blanks`

> Dùng cho: **FIT, FITS, FIB**

| Column | Type | Constraint | Mô tả |
|---|---|---|---|
| `id` | `UUID` | PK | |
| `question_id` | `UUID` | FK → questions.id, NN | |
| `blank_index` | `SMALLINT` | NN | Thứ tự ô trống. Bắt đầu từ `1` |
| `accepted_answers` | `TEXT[]` | NN | Danh sách đáp án được chấp nhận (hỗ trợ đồng nghĩa/biến thể) |
| `case_sensitive` | `BOOLEAN` | NN | Default `false` |

```sql
CREATE TABLE question_blanks (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id      UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    blank_index      SMALLINT NOT NULL,
    accepted_answers TEXT[] NOT NULL DEFAULT '{}',
    case_sensitive   BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (question_id, blank_index)
);

CREATE INDEX idx_blanks_question ON question_blanks(question_id);
```

### Tổng quan quan hệ

```
sub_lessons ──(1:N)──► questions
                            │
                    ┌───────┴───────┐
                    │               │
            question_choices   question_blanks
            (TF/SC/MC/SQ/      (FIT/FITS/FIB)
             MAT/PAIR_MATCH)
```

---

## 5. JSON mẫu từng dạng câu hỏi

> Cấu trúc đầy đủ khi gọi `GET /api/v1/questions/{id}` — bao gồm `media_url` đã được resolve.

### 5.1 TF — Đúng / Sai

```json
{
  "id": "...",
  "question_type": "tf",
  "difficulty": "easy",
  "stem": {
    "type": "text",
    "text": "Hà Nội là thủ đô của Việt Nam."
  },
  "explanation": {
    "type": "text",
    "text": "Đúng. Hà Nội là thủ đô của Việt Nam từ năm 1010."
  },
  "choices": [
    { "id": "...", "content": { "type": "text", "text": "Đúng" },  "is_correct": true,  "order_index": 0 },
    { "id": "...", "content": { "type": "text", "text": "Sai" },   "is_correct": false, "order_index": 1 }
  ]
}
```

### 5.2 SC — Single Choice

```json
{
  "question_type": "sc",
  "stem": {
    "type": "text_audio",
    "text": "Nghe và chọn đáp án đúng:",
    "media_key": "questions/abc.../stem/uuid.mp3",
    "media_url": "https://...(presigned)...",
    "original_filename": "listening_q1.mp3"
  },
  "choices": [
    { "content": { "type": "text", "text": "北京" }, "is_correct": false, "order_index": 0 },
    { "content": { "type": "text", "text": "上海" }, "is_correct": true,  "order_index": 1 },
    { "content": { "type": "text", "text": "广州" }, "is_correct": false, "order_index": 2 },
    { "content": { "type": "text", "text": "深圳" }, "is_correct": false, "order_index": 3 }
  ]
}
```

### 5.3 MC — Multi Choice

```json
{
  "question_type": "mc",
  "stem": { "type": "text", "text": "Chọn tất cả các thành phố thuộc tỉnh Quảng Ninh:" },
  "choices": [
    { "content": { "type": "text", "text": "Hạ Long" },   "is_correct": true,  "order_index": 0 },
    { "content": { "type": "text", "text": "Cẩm Phả" },   "is_correct": true,  "order_index": 1 },
    { "content": { "type": "text", "text": "Hải Phòng" },  "is_correct": false, "order_index": 2 },
    { "content": { "type": "text", "text": "Uông Bí" },    "is_correct": true,  "order_index": 3 }
  ]
}
```

### 5.4 FIT — Điền 1 chỗ trống

> Câu hỏi có ngữ cảnh, dùng `___` đánh dấu chỗ trống.

```json
{
  "question_type": "fit",
  "stem": {
    "type": "text",
    "text": "Hà Nội là ___ của Việt Nam."
  },
  "blanks": [
    {
      "blank_index": 1,
      "accepted_answers": ["thủ đô", "thủ đô nước", "thủ đô của nước"],
      "case_sensitive": false
    }
  ]
}
```

### 5.5 FITS — Điền nhiều chỗ trống

> Dùng `{{1}}`, `{{2}}`... làm placeholder trong `stem.text`.

```json
{
  "question_type": "fits",
  "stem": {
    "type": "text",
    "text": "{{1}} là thủ đô của {{2}}, nằm ở vùng {{3}} của đất nước."
  },
  "blanks": [
    { "blank_index": 1, "accepted_answers": ["Hà Nội"],       "case_sensitive": false },
    { "blank_index": 2, "accepted_answers": ["Việt Nam"],      "case_sensitive": false },
    { "blank_index": 3, "accepted_answers": ["miền Bắc", "phía Bắc"], "case_sensitive": false }
  ]
}
```

### 5.6 FIB — Điền vào ô trống tự do

> Câu hỏi không có ngữ cảnh trong câu — người học tự điền câu trả lời.

```json
{
  "question_type": "fib",
  "stem": {
    "type": "text_image",
    "text": "Đây là thành phố nào của Việt Nam?",
    "media_key": "questions/abc.../stem/uuid.jpg",
    "media_url": "https://...(presigned)...",
    "original_filename": "city_photo.jpg"
  },
  "blanks": [
    {
      "blank_index": 1,
      "accepted_answers": ["Hà Nội", "Ha Noi", "Hanoi"],
      "case_sensitive": false
    }
  ]
}
```

### 5.7 SQ — Sequence (Xếp thứ tự)

> `order_index` = thứ tự hiển thị ngẫu nhiên. `correct_order` = thứ tự đúng.

```json
{
  "question_type": "sq",
  "stem": { "type": "text", "text": "Sắp xếp các bước nấu cơm theo đúng thứ tự:" },
  "choices": [
    { "content": { "type": "text", "text": "Vo gạo" },          "correct_order": 1, "order_index": 3 },
    { "content": { "type": "text", "text": "Đong gạo" },         "correct_order": 0, "order_index": 1 },
    { "content": { "type": "text", "text": "Bật nồi cơm điện" },"correct_order": 3, "order_index": 0 },
    { "content": { "type": "text", "text": "Thêm nước" },        "correct_order": 2, "order_index": 2 }
  ]
}
```

### 5.8 MAT — Matching (Kéo và thả)

> `group_name = "source"` là cột bên trái, `"target"` là cột phải.  
> `match_id` trên source trỏ tới `id` của target đúng.

```json
{
  "question_type": "mat",
  "stem": { "type": "text", "text": "Nối thủ đô với quốc gia tương ứng:" },
  "choices": [
    { "id": "src-1", "content": { "type": "text", "text": "Tokyo" },     "group_name": "source", "match_id": "tgt-1", "order_index": 0 },
    { "id": "src-2", "content": { "type": "text", "text": "Paris" },     "group_name": "source", "match_id": "tgt-2", "order_index": 1 },
    { "id": "src-3", "content": { "type": "text", "text": "Berlin" },    "group_name": "source", "match_id": "tgt-3", "order_index": 2 },
    { "id": "tgt-1", "content": { "type": "text", "text": "Nhật Bản" },  "group_name": "target", "order_index": 0 },
    { "id": "tgt-2", "content": { "type": "text", "text": "Pháp" },      "group_name": "target", "order_index": 1 },
    { "id": "tgt-3", "content": { "type": "text", "text": "Đức" },       "group_name": "target", "order_index": 2 }
  ]
}
```

### 5.9 PAIR_MATCH — Vẽ đường nối

> Tương tự MAT nhưng render khác: hiển thị 2 cột song song, người dùng vẽ đường nối.  
> `group_name = "left"` / `"right"`. `match_id` trên left trỏ tới right đúng.

```json
{
  "question_type": "pair_match",
  "stem": {
    "type": "text_image",
    "text": "Nối hình ảnh với từ tiếng Trung tương ứng:",
    "media_key": "questions/abc.../stem/uuid.jpg",
    "media_url": "https://...(presigned)..."
  },
  "choices": [
    { "id": "l-1", "content": { "type": "image", "media_key": "questions/.../choices/l-1/uuid.jpg", "media_url": "..." }, "group_name": "left", "match_id": "r-1", "order_index": 0 },
    { "id": "l-2", "content": { "type": "image", "media_key": "questions/.../choices/l-2/uuid.jpg", "media_url": "..." }, "group_name": "left", "match_id": "r-2", "order_index": 1 },
    { "id": "r-1", "content": { "type": "text",  "text": "猫" }, "group_name": "right", "order_index": 0 },
    { "id": "r-2", "content": { "type": "text",  "text": "狗" }, "group_name": "right", "order_index": 1 }
  ]
}
```

---

## 6. Enums cần cập nhật

### `backend/app/shared/enums.py`

Xoá `QuestionType` cũ, thay bằng:

```python
class QuestionType(str, enum.Enum):
    TF         = "tf"
    SC         = "sc"
    MC         = "mc"
    FIT        = "fit"
    FITS       = "fits"
    FIB        = "fib"
    SQ         = "sq"
    MAT        = "mat"
    PAIR_MATCH = "pair_match"

class QuestionStatus(str, enum.Enum):
    DRAFT     = "draft"
    PUBLISHED = "published"
    ARCHIVED  = "archived"

class ContentMediaType(str, enum.Enum):
    TEXT       = "text"
    IMAGE      = "image"
    AUDIO      = "audio"
    TEXT_IMAGE = "text_image"
    TEXT_AUDIO = "text_audio"
```

---

## 7. Module Backend

### Cấu trúc thư mục

```
backend/app/modules/questions/
├── __init__.py
├── model.py          — SQLAlchemy models: Question, QuestionChoice, QuestionBlank
├── schema.py         — Pydantic request/response schemas
├── service.py        — CRUD + validation per question_type
└── router.py         — REST endpoints
```

### API Endpoints

| Method | Path | Mô tả | Roles |
|---|---|---|---|
| `POST` | `/api/v1/questions/` | Tạo câu hỏi mới | teacher |
| `GET` | `/api/v1/questions/` | Danh sách (filter: type, difficulty, tag, sub_lesson_id, status) | teacher, expert, admin |
| `GET` | `/api/v1/questions/{id}` | Chi tiết + presigned URLs | teacher, expert, admin |
| `PUT` | `/api/v1/questions/{id}` | Cập nhật nội dung | teacher (owner) |
| `DELETE` | `/api/v1/questions/{id}` | Xoá mềm | teacher (owner), admin |
| `POST` | `/api/v1/questions/{id}/media` | Upload ảnh/audio cho stem hoặc choice | teacher (owner) |
| `DELETE` | `/api/v1/questions/{id}/media` | Xoá media (theo `media_key`) | teacher (owner) |
| `POST` | `/api/v1/questions/{id}/publish` | Expert duyệt → `published` | expert |
| `POST` | `/api/v1/questions/{id}/reject` | Expert từ chối | expert |

### Upload media flow

```
1. Teacher gọi POST /questions/{id}/media
   Body: { target: "stem" | "explanation" | "choice", choice_id?: uuid, file: multipart }

2. Backend:
   a. Validate MIME type (chỉ chấp nhận ảnh/audio)
   b. Sinh UUID cho tên file
   c. Build S3 key theo path convention:
      - stem:        questions/{question_id}/stem/{uuid}.{ext}
      - explanation: questions/{question_id}/explanation/{uuid}.{ext}
      - choice:      questions/{question_id}/choices/{choice_id}/{uuid}.{ext}
   d. Upload lên S3
   e. Update JSONB field tương ứng trong DB (set media_key, original_filename)
   f. Return { media_key, media_url (presigned) }
```

---

## 8. Component Frontend

### Cấu trúc thư mục

```
front/src/
├── pages/question-bank/
│   ├── QuestionBankPage.tsx        — Danh sách câu hỏi + filter/search
│   ├── QuestionFormPage.tsx        — Tạo / chỉnh sửa câu hỏi
│   ├── QuestionPreviewPage.tsx     — Xem trước câu hỏi như người học
│   └── index.ts
│
└── components/question-editor/
    ├── ContentBlockEditor.tsx      — Input dùng chung: text/image/audio switcher
    ├── editors/
    │   ├── TrueFalseEditor.tsx     — TF
    │   ├── ChoiceEditor.tsx        — SC + MC (dùng chung, prop: multiple)
    │   ├── FillTextEditor.tsx      — FIT (stem có ___, 1 blank input)
    │   ├── FillTextMultiEditor.tsx — FITS (stem có {{n}}, n blank inputs)
    │   ├── FillBlankEditor.tsx     — FIB (stem bình thường + 1 blank input)
    │   ├── SequenceEditor.tsx      — SQ (drag-to-reorder)
    │   ├── MatchingEditor.tsx      — MAT (drag source → target slot)
    │   └── PairMatchEditor.tsx     — PAIR_MATCH (canvas vẽ đường nối)
    └── previews/
        ├── TrueFalsePreview.tsx
        ├── ChoicePreview.tsx
        ├── FillPreview.tsx
        ├── SequencePreview.tsx
        ├── MatchingPreview.tsx
        └── PairMatchPreview.tsx
```

### `ContentBlockEditor` — Props

```typescript
interface ContentBlockEditorProps {
  value: ContentBlock;
  onChange: (block: ContentBlock) => void;
  allowedTypes?: MediaType[];   // mặc định: tất cả 5 loại
  questionId: string;           // để build upload path
  target: "stem" | "explanation" | "choice";
  choiceId?: string;
}
```

---

## 9. Phân quyền

### Gắn câu hỏi vào sub-lesson workflow

Câu hỏi là một phần của **giai đoạn tạo nội dung** (cùng với upload documents). Trạng thái `status` của câu hỏi phụ thuộc vào `sub_lesson` chứa nó:

```
Sub-lesson: in_progress
  └── Teacher: tạo/sửa câu hỏi (status = draft)
  └── Teacher: upload documents

Sub-lesson: submit for review  →  reviewing
  └── Expert xem xét documents + câu hỏi
  └── Expert approve/reject từng câu hỏi

Expert approve câu hỏi  →  question.status = published
Expert reject  câu hỏi  →  question.status = draft  (Teacher sửa lại)
```

### Quy tắc phân quyền

| Hành động | Admin | Expert | Teacher | Converter |
|---|---|---|---|---|
| Xem danh sách câu hỏi | ✅ | ✅ | ✅ (chỉ câu hỏi mình tạo) | ❌ |
| Tạo câu hỏi | ❌ | ❌ | ✅ | ❌ |
| Sửa câu hỏi | ❌ | ❌ | ✅ (owner, status=draft) | ❌ |
| Xoá câu hỏi | ✅ | ❌ | ✅ (owner, status=draft) | ❌ |
| Upload media | ❌ | ❌ | ✅ (owner) | ❌ |
| Duyệt / từ chối | ❌ | ✅ | ❌ | ❌ |
| Xem câu hỏi đã published | ✅ | ✅ | ✅ | ❌ |
