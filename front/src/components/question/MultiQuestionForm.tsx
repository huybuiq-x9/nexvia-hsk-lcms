import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import QuestionForm from './QuestionForm';
import type { ApiQuestionResponse } from '../../types/question';

interface CardState {
  id: string;
  savedQuestion: ApiQuestionResponse | null;
}

interface Props {
  subLessonId?: string;
  onAllSaved?: () => void;
  onCancel?: () => void;
}

let nextCardId = 1;

export default function MultiQuestionForm({ subLessonId, onAllSaved, onCancel }: Props) {
  const [cards, setCards] = useState<CardState[]>([{ id: `card-${nextCardId++}`, savedQuestion: null }]);

  function addCard() {
    setCards(prev => [...prev, { id: `card-${nextCardId++}`, savedQuestion: null }]);
  }

  function removeCard(id: string) {
    setCards(prev => prev.filter(c => c.id !== id));
  }

  function markSaved(id: string, q: ApiQuestionResponse) {
    setCards(prev => prev.map(c => c.id === id ? { ...c, savedQuestion: q } : c));
  }

  const allSaved = cards.length > 0 && cards.every(c => c.savedQuestion !== null);

  return (
    <div className="flex flex-col gap-4">
      {cards.map((card, idx) => (
        <div key={card.id} className="relative">
          <QuestionForm
            subLessonId={subLessonId}
            onSaved={q => markSaved(card.id, q)}
            cardMode
            cardIndex={idx}
          />
          {cards.length > 1 && (
            <button
              type="button"
              onClick={() => removeCard(card.id)}
              className="absolute top-2.5 right-10 text-slate-400 hover:text-red-500 p-1"
              title="Xóa câu hỏi này"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addCard}
        className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
      >
        <Plus size={16} /> Thêm câu hỏi
      </button>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          {cards.filter(c => c.savedQuestion).length}/{cards.length} câu hỏi đã lưu
        </p>
        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
              Đóng
            </button>
          )}
          {allSaved && onAllSaved && (
            <button type="button" onClick={onAllSaved} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
              Hoàn tất
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
