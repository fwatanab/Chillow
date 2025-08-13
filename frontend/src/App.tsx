import { RecoilRoot } from 'recoil';
import AppRoutes from './routes/AppRoutes';
import { useRestoreUser } from './hooks/useRestoreUser';

const AppInitializer = () => {
	useRestoreUser();
	return null;
};


const App = () => {
	return (
		<RecoilRoot>
			<AppInitializer />
			<AppRoutes />
		</RecoilRoot>
	);
};

export default App

