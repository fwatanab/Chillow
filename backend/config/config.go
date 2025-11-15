package config

import (
	"os"
	"strings"
)

type Config struct {
	JWTSecret          string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURI  string
	FrontendURL        string
	BackendURL         string
	CookieDomain       string
	CookieSecure       bool

	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string

	AttachmentStorage string
	UploadDir         string
	S3Bucket          string
	S3Region          string
	S3Endpoint        string
	S3AccessKey       string
	S3SecretKey       string
	S3UsePathStyle    bool
}

var Cfg *Config // グローバルにアクセス可能な設定

func LoadConfig() {
	// 環境変数から構成を読み取る
	Cfg = &Config{
		JWTSecret:          os.Getenv("JWT_SECRET"),
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURI:  os.Getenv("GOOGLE_REDIRECT_URI"),
		FrontendURL:        getEnv("FRONTEND_URL", "http://localhost:5173"),
		BackendURL:         getEnv("BACKEND_URL", "http://localhost:8080"),
		CookieDomain:       getEnv("COOKIE_DOMAIN", "localhost"),
		CookieSecure:       parseBool(getEnv("COOKIE_SECURE", "false")),

		DBHost:     os.Getenv("DB_HOST"),
		DBPort:     os.Getenv("DB_PORT"),
		DBUser:     os.Getenv("DB_USER"),
		DBPassword: os.Getenv("DB_PASSWORD"),
		DBName:     os.Getenv("DB_NAME"),

		AttachmentStorage: getEnv("ATTACHMENT_STORAGE", "local"),
		UploadDir:         getEnv("UPLOAD_DIR", "./uploads"),
		S3Bucket:          os.Getenv("S3_BUCKET"),
		S3Region:          getEnv("S3_REGION", "ap-northeast-1"),
		S3Endpoint:        os.Getenv("S3_ENDPOINT"),
		S3AccessKey:       os.Getenv("S3_ACCESS_KEY"),
		S3SecretKey:       os.Getenv("S3_SECRET_KEY"),
		S3UsePathStyle:    parseBool(getEnv("S3_USE_PATH_STYLE", "false")),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func parseBool(val string) bool {
	switch strings.ToLower(val) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}
