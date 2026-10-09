import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, RotateCcw } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import QuickReplies from './QuickReplies';
import ExpensePreviewCard from './ExpensePreviewCard';
import MicButton from './MicButton';
import { assistantApi } from '../../services/api';
import useToast from '../../hooks/useToast';
import { formatINR } from '../../utils/format';

export default function AssistantChat({ tripId, onExpenseCreated }) {
  const toast = useToast();
  const [conversationId, setConversationId] = useState(null);
  const [turns, setTurns] = useState([
    {
      role: 'assistant',
      text: 'Hi! Bolo — "Rahul ne 500 diye dinner", "Kitna baaki hai?", or "Settle up".',
      quickReplies: ['Rahul ne 500 diye', 'Kitna baaki hai?', 'Settle up'],
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(null);
  const [pendingMode, setPendingMode] = useState('single');
  const [confirming, setConfirming] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, pendingDraft]);

  const sendText = async (text) => {
    if (!text.trim()) return;
    setBusy(true);
    setTurns((t) => [...t, { role: 'user', text }]);
    setInput('');
    try {
      const res = await assistantApi.send(tripId, {
        text,
        conversationId: conversationId || undefined,
      });
      setConversationId(res.conversationId);
      const reply = res.reply || {};
      const assistantTurn = {
        role: 'assistant',
        text: reply.text || '…',
        quickReplies: reply.quickReplies || [],
      };
      setTurns((t) => [...t, assistantTurn]);

      if (reply.kind === 'preview' && reply.draft) {
        setPendingDraft(reply.draft);
        setPendingMode('single');
      } else if (reply.kind === 'multi_preview' && reply.draft) {
        setPendingDraft(reply.draft);
        setPendingMode('multi');
      } else {
        setPendingDraft(null);
      }
    } catch (err) {
      toast.error(err.message || 'Assistant is unavailable right now');
      setTurns((t) => [
        ...t,
        { role: 'assistant', text: 'Sorry, I could not reach the server. Try again.' },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onQuickReply = (opt) => sendText(opt);

  const confirmDraft = async () => {
    if (!pendingDraft || !conversationId) return;
    setConfirming(true);
    try {
      if (pendingMode === 'multi') {
        const res = await assistantApi.confirmAll(tripId, {
          conversationId,
          draftPayload: pendingDraft,
        });
        toast.success(`${res.expenses.length} expenses added`);
      } else {
        const res = await assistantApi.confirm(tripId, {
          conversationId,
          draftPayload: pendingDraft,
        });
        toast.success(`Added ₹${(res.expense.amount_paise / 100).toFixed(0)}`);
      }
      setPendingDraft(null);
      onExpenseCreated?.();
      setTurns((t) => [
        ...t,
        { role: 'assistant', text: 'Done! Hisaab updated. Kuch aur?' },
      ]);
    } catch (err) {
      toast.error(err.message || 'Could not save the expense');
    } finally {
      setConfirming(false);
    }
  };

  const undoDraft = async () => {
    setPendingDraft(null);
    setTurns((t) => [
      ...t,
      { role: 'assistant', text: 'Okay, cancelled.' },
    ]);
  };

  const reset = () => {
    setConversationId(null);
    setPendingDraft(null);
    setTurns([
      {
        role: 'assistant',
        text: 'Fresh start. Bolo kya add karna hai?',
        quickReplies: ['Rahul ne 500 diye', 'Kitna baaki hai?'],
      },
    ]);
  };

  return (
    <Card className="flex h-[520px] flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold text-ink">SafarSplit Assistant</div>
            <div className="text-[11px] text-muted">English · हिंग्लिश · typos okay</div>
          </div>
        </div>
        <button
          onClick={reset}
          className="rounded-full p-2 text-muted hover:bg-canvas hover:text-ink"
          aria-label="Reset"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto rounded-inner bg-canvas p-3"
      >
        {turns.map((t, i) => (
          <div
            key={i}
            className={t.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            <div
              className={`max-w-[80%] rounded-inner px-3 py-2 text-sm ${
                t.role === 'user'
                  ? 'bg-brand-500 text-white'
                  : 'border border-line bg-white text-ink'
              }`}
            >
              {t.text}
              {t.role === 'assistant' && t.quickReplies?.length ? (
                <QuickReplies
                  options={t.quickReplies}
                  onPick={onQuickReply}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {pendingDraft ? (
        <div className="mt-3">
          <ExpensePreviewCard
            draft={pendingDraft}
            mode={pendingMode}
            onConfirm={confirmDraft}
            onUndo={undoDraft}
            saving={confirming}
          />
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendText(input);
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          className="input flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Type — "Priya ne 1200 diye dinner ke liye"'
          disabled={busy}
        />
        <MicButton onTranscript={sendText} />
        <Button
          type="submit"
          loading={busy}
          leftIcon={<Send className="h-4 w-4" />}
          className="px-4"
        >
          Send
        </Button>
      </form>
    </Card>
  );
}