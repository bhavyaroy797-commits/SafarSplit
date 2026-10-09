import { useSelector, useDispatch } from 'react-redux';
import {
  loginUser,
  registerUser,
  fetchMe,
  updateMe,
  logout,
} from '../features/auth/authSlice';

export default function useAuth() {
  const dispatch = useDispatch();
  const { user, token, status, error, bootstrapped } = useSelector(
    (s) => s.auth
  );

  const isAuthed = !!token && !!user;

  return {
    user,
    token,
    status,
    error,
    isAuthed,
    bootstrapped,
    login: (payload) => dispatch(loginUser(payload)).unwrap(),
    register: (payload) => dispatch(registerUser(payload)).unwrap(),
    refreshMe: () => dispatch(fetchMe()).unwrap(),
    updateProfile: (payload) => dispatch(updateMe(payload)).unwrap(),
    signOut: () => dispatch(logout()),
  };
}