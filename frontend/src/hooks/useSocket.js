import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  connectSocket,
  disconnectSocket,
  joinTripRoom,
  leaveTripRoom,
} from '../services/socket';
import {
  upsertFromSocket,
  removeFromSocket,
  voteFromSocket,
} from '../features/itinerary/itinerarySlice';
import {
  upsertExpenseFromSocket,
  removeExpenseFromSocket,
  setSettleUpFromSocket,
} from '../features/expenses/expensesSlice';
import { pushToast } from '../features/ui/uiSlice';

/**
 * Subscribes to live trip events. Pass a tripId to join a room; pass null
 * to just keep the connection open without joining anything.
 */
export default function useSocket(tripId) {
  const dispatch = useDispatch();

  useEffect(() => {
    const s = connectSocket();

    const onItineraryCreated = (item) =>
      dispatch(upsertFromSocket(item));
    const onItineraryUpdated = (item) =>
      dispatch(upsertFromSocket(item));
    const onItineraryDeleted = (payload) =>
      dispatch(removeFromSocket(payload.itemId));
    const onVoteUpdated = (payload) =>
      dispatch(voteFromSocket(payload));

    const onExpenseCreated = (e) => dispatch(upsertExpenseFromSocket(e));
    const onExpenseDeleted = (p) =>
      dispatch(removeExpenseFromSocket(p.expenseId));
    const onSettleUp = (p) => dispatch(setSettleUpFromSocket(p));

    const onMemberJoined = (p) =>
      dispatch(
        pushToast({
          type: 'info',
          message: `${p.name || 'Someone'} joined the trip`,
        })
      );

    s.on('itinerary:created', onItineraryCreated);
    s.on('itinerary:updated', onItineraryUpdated);
    s.on('itinerary:deleted', onItineraryDeleted);
    s.on('vote:updated', onVoteUpdated);
    s.on('expense:created', onExpenseCreated);
    s.on('expense:deleted', onExpenseDeleted);
    s.on('settleup:updated', onSettleUp);
    s.on('member:joined', onMemberJoined);

    let joined = null;
    if (tripId) {
      joinTripRoom(tripId).then((ack) => {
        if (!ack.ok) {
          dispatch(
            pushToast({
              type: 'warn',
              message: 'Live updates unavailable for this trip',
            })
          );
        }
      });
      joined = tripId;
    }

    return () => {
      s.off('itinerary:created', onItineraryCreated);
      s.off('itinerary:updated', onItineraryUpdated);
      s.off('itinerary:deleted', onItineraryDeleted);
      s.off('vote:updated', onVoteUpdated);
      s.off('expense:created', onExpenseCreated);
      s.off('expense:deleted', onExpenseDeleted);
      s.off('settleup:updated', onSettleUp);
      s.off('member:joined', onMemberJoined);
      if (joined) leaveTripRoom(joined);
    };
  }, [tripId, dispatch]);

  // Global cleanup on unmount of the whole app: best-effort.
  useEffect(() => {
    return () => disconnectSocket();
  }, []);
}