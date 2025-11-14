package ws

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

// BuildRoomID returns canonical room id (smaller id first).
func BuildRoomID(userA, userB uint) string {
	if userA < userB {
		return fmt.Sprintf("%d-%d", userA, userB)
	}
	return fmt.Sprintf("%d-%d", userB, userA)
}

func parseRoomID(roomID string) (uint, uint, error) {
	parts := strings.Split(roomID, "-")
	if len(parts) != 2 {
		return 0, 0, errors.New("invalid room id")
	}
	a, err := strconv.ParseUint(parts[0], 10, 64)
	if err != nil {
		return 0, 0, err
	}
	b, err := strconv.ParseUint(parts[1], 10, 64)
	if err != nil {
		return 0, 0, err
	}
	return uint(a), uint(b), nil
}

func isUserInRoom(roomID string, userID uint) bool {
	u1, u2, err := parseRoomID(roomID)
	if err != nil {
		return false
	}
	return u1 == userID || u2 == userID
}

func counterpartyFromRoom(roomID string, userID uint) (uint, error) {
	u1, u2, err := parseRoomID(roomID)
	if err != nil {
		return 0, err
	}
	if u1 == userID {
		return u2, nil
	}
	if u2 == userID {
		return u1, nil
	}
	return 0, errors.New("user not in room")
}
