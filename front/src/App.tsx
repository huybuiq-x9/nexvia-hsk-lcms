import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { BreadcrumbProvider } from './contexts/BreadcrumbContext';
import DashboardLayout from './components/layouts/DashboardLayout';

import { LoginPage, ForgotPasswordPage, ResetPasswordPage } from './pages/auth';
import { default as DashboardPage } from './pages/dashboard';
import { default as CoursesPage, CourseDetailPage, CourseFormPage } from './pages/courses';
import { default as LessonsPage, LessonDetailPage } from './pages/lessons';
import { default as SubLessonsPage, SubLessonDetailPage } from './pages/sub-lessons';
import { default as UsersPage } from './pages/users';
import { default as NotificationsPage } from './pages/notifications';
import { default as QuestionBankPage } from './pages/question-bank';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/" replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('access_token');
  if (token) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <BreadcrumbProvider>
            <Routes>
              <Route path="/" element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
              <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
              <Route path="/home" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

              <Route path="/courses" element={<ProtectedRoute><CoursesPage /></ProtectedRoute>} />
              <Route path="/courses/create" element={<ProtectedRoute><CourseFormPage /></ProtectedRoute>} />
              <Route path="/courses/:courseId" element={<ProtectedRoute><CourseDetailPage /></ProtectedRoute>} />

              <Route path="/lessons" element={<ProtectedRoute><LessonsPage /></ProtectedRoute>} />
              <Route path="/lessons/:lessonId" element={<ProtectedRoute><LessonDetailPage /></ProtectedRoute>} />

              <Route path="/sub-lessons" element={<ProtectedRoute><SubLessonsPage /></ProtectedRoute>} />
              <Route path="/sub-lessons/:subLessonId" element={<ProtectedRoute><SubLessonDetailPage /></ProtectedRoute>} />

              <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/question-bank" element={<ProtectedRoute><QuestionBankPage /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </BreadcrumbProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
