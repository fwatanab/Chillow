import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from '../pages/Login';
import Home from '../pages/Home';
import Mypage from '../pages/Mypage';
import FriendManage from '../pages/FriendManage';
import PrivateRoute from './PrivateRoute';
import AdminDashboard from '../pages/AdminDashboard';

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute allowRoles={['user']}><Home /></PrivateRoute>} />
      <Route path="/chat/:friendId" element={<PrivateRoute allowRoles={['user']}><Home /></PrivateRoute>} />
      <Route path="/mypage" element={<PrivateRoute allowRoles={['user']}><Mypage /></PrivateRoute>} />
      <Route
        path="/friends/manage"
        element={
          <PrivateRoute allowRoles={['user']}>
            <FriendManage />
          </PrivateRoute>
        }
      />
      <Route path="/admin" element={<PrivateRoute allowRoles={['admin']}><AdminDashboard /></PrivateRoute>} />
    </Routes>
  </BrowserRouter>
);

export default AppRoutes;
