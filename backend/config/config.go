package config

import (
	"os"
)

type	Config struct {
	JWTSecret			string
	GoogleClientID		string
	GoogleClientSecret	string
	GoogleRedirectURI	string

	DBHost			string
	DBPort			string
	DBUser			string
	DBPassword		string
	DBName			string
}

func	LoadConfig() *Config {
	cfg := &Config{
		JWTSecret:			os.Getenv("JWT_SECRET"),
		GoogleClientID:		os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret:	os.Getenv("GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURI:	os.Getenv("GOOGLE_REDIRECT_URI"),

		DBHost:		os.Getenv("DB_HOST"),
		DBPort:		os.Getenv("DB_PORT"),
		DBUser:		os.Getenv("DB_USER"),
		DBPassword:	os.Getenv("DB_PASSWORD"),
		DBName:		os.Getenv("DB_NAME"),
	}

	return cfg
}

