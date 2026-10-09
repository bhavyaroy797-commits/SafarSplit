import { useRef, useState } from 'react';
import { Camera, Upload, Loader2 } from 'lucide-react';
import Modal from '../common/Modal';
import ReceiptReview from './ReceiptReview';
import { receiptsApi } from '../../services/api';
import useToast from '../../hooks/useToast';

export default function ScanBillModal({ open, onClose, tripId, onConfirmed }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const [phase, setPhase] = useState('pick');
  const [progress, setProgress] = useState(0);
  const [draft, setDraft] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const reset = () => {
    setPhase('pick');
    setProgress(0);
    setDraft(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const onFile = async (file) => {
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setPhase('uploading');
    setProgress(0);
    try {
      const data = await receiptsApi.scan(tripId, file, setProgress);
      setDraft(data);
      setPhase('review');
    } catch (err) {
      toast.error(err.message || 'Could not read the bill');
      reset();
    }
  };

  const confirm = async (edited) => {
    setPhase('saving');
    try {
      const payload = {
        merchant: edited.merchant,
        date: edited.date,
        title: edited.title,
        category: edited.category,
        items: edited.items.map((it) => ({
          name: it.name,
          qty: it.qty,
          unitPricePaise: it.unitPricePaise,
          lineTotalPaise: it.lineTotalPaise,
          dietClass: it.dietClass,
          jainOk: it.jainOk,
          category: it.category || null,
          confidence: it.confidence ?? null,
          needsManual: !!it.needsManual,
          tempId: it.tempId,
          shares: it.shares,
        })),
        subtotalPaise: edited.subtotalPaise,
        taxesPaise: edited.taxesPaise,
        serviceChargePaise: edited.serviceChargePaise,
        discountPaise: edited.discountPaise,
        deliveryPaise: edited.deliveryPaise,
        totalPaise: edited.totalPaise,
        mismatch: edited.mismatch,
        mismatchNote: edited.mismatchNote,
        notes: edited.notes || null,
        previewMemberTotals: edited.previewMemberTotals,
        attachmentMeta: {
          stored_name: draft.attachmentStoredName,
          original_name: draft.attachmentOriginalName,
          mime_type: draft.attachmentMime,
          size_bytes: draft.attachmentSize,
          title: 'Receipt scan',
        },
      };
      const result = await receiptsApi.confirm(tripId, null, payload);
      toast.success('Expense created from bill');
      onConfirmed?.(result);
      handleClose();
    } catch (err) {
      toast.error(err.message || 'Could not save the bill');
      setPhase('review');
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Scan bill" width="max-w-3xl">
      {phase === 'pick' && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Snap or upload a restaurant bill. We'll read items, split by diet,
            and let you review before saving.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex flex-col items-center gap-2 rounded-inner border-2 border-dashed border-line bg-canvas px-4 py-8 text-sm text-muted hover:border-brand-300 hover:text-brand-600"
            >
              <Camera className="h-6 w-6" />
              Take photo
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center gap-2 rounded-inner border-2 border-dashed border-line bg-canvas px-4 py-8 text-sm text-muted hover:border-brand-300 hover:text-brand-600"
            >
              <Upload className="h-6 w-6" />
              Upload image
            </button>
          </div>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>
      )}

      {phase === 'uploading' && (
        <div className="space-y-4 py-6 text-center">
          {previewUrl && (
            <div className="mx-auto max-w-xs overflow-hidden rounded-inner border border-line">
              <img src={previewUrl} alt="Receipt preview" className="w-full" />
            </div>
          )}
          <div className="mx-auto flex max-w-xs items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full bg-brand-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">
                {progress < 100 ? `Uploading… ${progress}%` : 'Reading bill…'}
              </p>
            </div>
          </div>
        </div>
      )}

      {phase === 'review' && draft && (
        <ReceiptReview
          draft={draft}
          previewUrl={previewUrl}
          onCancel={reset}
          onConfirm={confirm}
          saving={false}
        />
      )}

      {phase === 'saving' && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving…
        </div>
      )}
    </Modal>
  );
}