import { useDispatch } from 'react-redux';
import { pushToast } from '../features/ui/uiSlice';

export default function useToast() {
  const dispatch = useDispatch();
  return {
    info: (message) => dispatch(pushToast({ type: 'info', message })),
    success: (message) => dispatch(pushToast({ type: 'success', message })),
    error: (message) => dispatch(pushToast({ type: 'error', message })),
    warn: (message) => dispatch(pushToast({ type: 'warn', message })),
  };
}