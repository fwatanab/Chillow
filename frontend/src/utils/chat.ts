export const buildRoomId = (userA: number, userB: number): string => {
	return userA < userB ? `${userA}-${userB}` : `${userB}-${userA}`;
};
