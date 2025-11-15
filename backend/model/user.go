package model

import (
	"chillow/config"
	"chillow/db"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID           uint       `json:"id" gorm:"primaryKey"`
	Nickname     string     `json:"nickname"`
	Email        string     `json:"email" gorm:"type:varchar(191);uniqueIndex"`
	FriendCode   string     `json:"friend_code" gorm:"type:varchar(20);uniqueIndex"`
	AvatarURL    string     `json:"avatar_url"`
	Role         string     `json:"role" gorm:"type:varchar(20);default:user"`
	IsBanned     bool       `json:"is_banned"`
	BannedAt     *time.Time `json:"banned_at,omitempty"`
	BanReason    *string    `json:"ban_reason,omitempty"`
	BanExpiresAt *time.Time `json:"ban_expires_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

func FindOrCreateUserByEmail(email, nickname, avatarURL string) (*User, error) {
	var user User
	if err := db.DB.Where("email = ?", email).First(&user).Error; err != nil {
		if err != gorm.ErrRecordNotFound {
			return nil, err
		}
		// なければ新規作成
		role := determineDefaultRole(email)
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

func determineDefaultRole(email string) string {
	if config.Cfg != nil {
		needle := strings.ToLower(strings.TrimSpace(email))
		for _, candidate := range config.Cfg.AdminEmails {
			if strings.ToLower(strings.TrimSpace(candidate)) == needle && needle != "" {
				return "admin"
			}
		}
	}
	return "user"
}

func (u *User) ClearBan() {
	u.IsBanned = false
	u.BannedAt = nil
	u.BanReason = nil
	u.BanExpiresAt = nil
}

func (u *User) ShouldLiftBan(now time.Time) bool {
	return u.IsBanned && u.BanExpiresAt != nil && now.After(*u.BanExpiresAt)
}
