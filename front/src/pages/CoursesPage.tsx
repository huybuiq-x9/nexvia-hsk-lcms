import { BookOpen } from 'lucide-react';

export default function CoursesPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
        <BookOpen size={28} className="text-blue-500" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800 mb-1">Quản lý khóa học</h2>
      <p className="text-sm text-slate-500 max-w-sm">
        Trang quản lý khóa học đang được phát triển. Vui lòng quay lại sau.
      </p>
    </div>
  );
}
