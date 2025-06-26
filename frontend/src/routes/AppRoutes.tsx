import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from '../pages/Login';
import Home from '../pages/Home';
import Mypage from '../pages/Mypage';
import ChatRoom from '../components/ChatRoom';
import PrivateRoute from './PrivateRoute';

const AppRoutes = () => (
	<BrowserRouter>
		<Routes>
			<Route path="/login" element={<Login />} />
			<Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
			<Route path="/mypage" element={<PrivateRoute><Mypage /></PrivateRoute>} />
			<Route path="/chat/:id" element={<PrivateRoute><ChatRoom /></PrivateRoute>} />
		</Routes>
	</BrowserRouter>
);

export default AppRoutes;
