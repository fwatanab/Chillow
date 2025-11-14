import AppRoutes from './routes/AppRoutes';
import { useRestoreUser } from './hooks/useRestoreUser';

const AppInitializer = () => {
	useRestoreUser();
	return null;
};


const App = () => (
	<>
		<AppInitializer />
		<AppRoutes />
	</>
);

export default App
