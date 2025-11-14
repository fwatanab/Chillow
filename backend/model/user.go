package model

import (
	"chillow/db"
	"fmt"
	"math/rand"
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	Nickname   string    `json:"nickname"`
	Email      string    `json:"email" gorm:"type:varchar(191);uniqueIndex"`
	FriendCode string    `json:"friend_code" gorm:"type:varchar(20);uniqueIndex"`
	AvatarURL  string    `json:"avatar_url"`
	Role       string    `json:"role" gorm:"type:varchar(20);default:user"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func FindOrCreateUserByEmail(email, nickname, avatarURL string) (*User, error) {
	var user User
	if err := db.DB.Where("email = ?", email).First(&user).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			return nil, err
		}
		// なければ新規作成
		role := determineDefaultRole()
		user = User{
			Email:      email,
			Nickname:   nickname,
			AvatarURL:  avatarURL,
			FriendCode: generateUniqueFriendCode(),
			Role:       role,
		}
		if err := db.DB.Create(&user).Error; err != nil {
			return nil, err
		}
	}
	return &user, nil
}

func generateUniqueFriendCode() string {
	rand.Seed(time.Now().UnixNano())
	for {
		code := fmt.Sprintf("U%06d", rand.Intn(1000000))
		var existing User
		if err := db.DB.Where("friend_code = ?", code).First(&existing).Error; err == gorm.ErrRecordNotFound {
			return code
		}
	}
}

func determineDefaultRole() string {
	var count int64
	if err := db.DB.Model(&User{}).Count(&count).Error; err != nil {
		return "user"
	}
	if count == 0 {
		return "admin"
	}
	return "user"
}
