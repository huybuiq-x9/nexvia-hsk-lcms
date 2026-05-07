// Legacy barrel — re-export all split types so existing import paths stay unchanged
// All types have been moved to:
//   types/auth.ts    — API_ROLE, user, auth, role types
//   types/course.ts  — Course, Lesson, SubLesson, System types
//   types/document.ts — Document types
export * from './auth';
export * from './course';
export * from './document';
