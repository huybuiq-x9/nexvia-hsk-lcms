import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import SubLessonDetailPage from './pages/SubLessonDetailPage';
import CourseFormPage from './pages/CourseFormPage';
import QuestionBankPage from './pages/QuestionBankPage';
import NotificationsPage from './pages/NotificationsPage';
import DashboardLayout from './components/layouts/DashboardLayout';

function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500">{t('app.loading')}</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  if (isLoading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/courses/create" element={<CourseFormPage />} />
        <Route path="/courses/edit/:courseId" element={<CourseFormPage />} />
        <Route path="/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="/sub-lessons/:subLessonId" element={<SubLessonDetailPage />} />
        <Route path="/question-bank" element={<QuestionBankPage />} />
        {isAdmin && <Route path="/users" element={<UsersPage />} />}
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
