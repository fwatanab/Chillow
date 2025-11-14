package auth

import (
	"errors"
	"time"

	"chillow/config"
	"chillow/model"

	"github.com/golang-jwt/jwt/v5"
)

const (
	accessTokenTTL        = 30 * time.Minute
	AccessTokenCookieName = "chillow_access_token"
)

type AccessTokenClaims struct {
	UserID uint
	Role   string
}

func GenerateAccessToken(user *model.User) (string, time.Time, error) {
	expiresAt := time.Now().Add(accessTokenTTL)
	claims := jwt.MapClaims{
		"user_id": user.ID,
		"role":    user.Role,
		"exp":     expiresAt.Unix(),
		"iat":     time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(config.Cfg.JWTSecret))
	return signed, expiresAt, err
}

func ParseAccessToken(tokenStr string) (*AccessTokenClaims, error) {
	if tokenStr == "" {
		return nil, errors.New("empty token")
	}
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(config.Cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid claims")
	}
	idFloat, ok := claims["user_id"].(float64)
	if !ok {
		return nil, errors.New("user_id not found")
	}
	role, _ := claims["role"].(string)
	return &AccessTokenClaims{
		UserID: uint(idFloat),
		Role:   role,
	}, nil
}
