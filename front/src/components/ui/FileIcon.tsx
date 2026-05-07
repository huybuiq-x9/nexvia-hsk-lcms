import {
  FileText,
  Presentation,
  FileSpreadsheet,
  File,
} from 'lucide-react';

interface FileIconProps {
  extension: string;
  size?: number;
  className?: string;
}

export function FileIcon({ extension, size = 18, className = '' }: FileIconProps) {
  const ext = extension.toLowerCase();

  if (ext === 'pdf') {
    return <FileText size={size} className={`text-red-500 ${className}`} />;
  }
  if (ext === 'pptx' || ext === 'ppt') {
    return <Presentation size={size} className={`text-orange-500 ${className}`} />;
  }
  if (ext === 'docx' || ext === 'doc') {
    return <FileText size={size} className={`text-blue-500 ${className}`} />;
  }
  if (ext === 'xlsx' || ext === 'xls') {
    return <FileSpreadsheet size={size} className={`text-green-600 ${className}`} />;
  }
  return <File size={size} className={`text-slate-500 ${className}`} />;
}
