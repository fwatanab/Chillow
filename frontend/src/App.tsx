import { RecoilRoot } from 'recoil';
import AppRoutes from './routes/AppRoutes';
import { useRestoreUser } from './hooks/useRestoreUser';

const AppInitializer = () => {
	useRestoreUser();
	return <AppRoutes />;
};


const App = () => {
	return (
		<RecoilRoot>
			<AppInitializer />
		</RecoilRoot>
	);
};

export default App

