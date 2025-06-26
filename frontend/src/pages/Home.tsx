import ChatList from "../components/ChatList";

const Home = () => {
	console.log("✅ Home loaded")

	return (
		<div className="home-page">
			<header className="home-header">
				<h1>ホーム</h1>
			</header>
			<main className="home-main">
				<ChatList />
			</main>
		</div>
	);
};

export default Home;

