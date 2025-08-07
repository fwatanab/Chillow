import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from '../pages/Login';
import Home from '../pages/Home';
import Mypage from '../pages/Mypage';
import ChatRoom from '../components/ChatRoom';
import FriendList from '../components/FriendList';
import FriendRequests from '../components/FriendRequests';
import PrivateRoute from './PrivateRoute';

// 仮データ（開発中は空オブジェクトでもOK。必要に応じてState管理に移行）
const dummyFriend = {
  id: 1,
  user_id: 1,
  friend_id: 2,
  user_nickname: "Sample Friend",
  avatar_url: "",
  created_at: new Date().toISOString(),
};

const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
      <Route path="/mypage" element={<PrivateRoute><Mypage /></PrivateRoute>} />
      <Route path="/chat/:id" element={
        <PrivateRoute>
          <ChatRoom friend={dummyFriend} />
        </PrivateRoute>
      } />
      <Route path="/friends" element={
        <PrivateRoute>
          <FriendList onSelectFriend={(f) => console.log(f)} />
        </PrivateRoute>
      } />
      <Route path="/friend-requests" element={
        <PrivateRoute>
          <FriendRequests />
        </PrivateRoute>
      } />
    </Routes>
  </BrowserRouter>
);

export default AppRoutes;



// import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import Login from '../pages/Login';
// import Home from '../pages/Home';
// import Mypage from '../pages/Mypage';
// import ChatRoom from '../components/ChatRoom';
// import FriendList from '../components/FriendList';
// import FriendRequests from '../components/FriendRequests';
// import PrivateRoute from './PrivateRoute';
// 
// const AppRoutes = () => (
// 	<BrowserRouter>
// 		<Routes>
// 			<Route path="/login" element={<Login />} />
// 			<Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
// 			<Route path="/mypage" element={<PrivateRoute><Mypage /></PrivateRoute>} />
// 			<Route path="/chat/:id" element={<PrivateRoute><ChatRoom /></PrivateRoute>} />
// 			<Route path="/friends" element={<PrivateRoute><FriendList /></PrivateRoute>} />
// 			<Route path="/friend-requests" element={<PrivateRoute><FriendRequests /></PrivateRoute>} />
// 		</Routes>
// 	</BrowserRouter>
// );
// 
// export default AppRoutes;
