package router

import (
	"chillow/config"
	"chillow/controller"
	"chillow/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()
	r.Static("/uploads", config.Cfg.UploadDir)

	// CORS 設定
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{config.Cfg.FrontendURL}, // フロントのURLを明示的に指定
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// ヘルスチェック
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	// API
	api := r.Group("/api")
	{
		// 認証系
		auth := api.Group("/auth")
		{
			auth.POST("/google", controller.GoogleLoginHandler)
			auth.POST("/logout", controller.LogoutHandler)
		}

		// ユーザー情報
		users := api.Group("/users")
		users.Use(middleware.AuthMiddleware()) // 🔐 JWTミドルウェア
		{
			users.GET("/me", controller.GetUserHandler)
			users.PATCH("/me", controller.PatchUserHandler)
			users.GET("/search", controller.SearchUserByCodeHandler)
		}

		// フレンド申請・承認・一覧など
		friendRequests := api.Group("/friend-requests")
		friendRequests.Use(middleware.AuthMiddleware(), middleware.ForbidRoles("admin")) // 🔐 JWTミドルウェア
		{
			friendRequests.POST("", controller.SendFriendRequestHandler)
			friendRequests.GET("", controller.GetFriendRequestsHandler)
			friendRequests.PATCH("/:id", controller.RespondToFriendRequestHandler)
		}

		// フレンド一覧・削除
		friends := api.Group("/friends")
		friends.Use(middleware.AuthMiddleware(), middleware.ForbidRoles("admin")) // 🔐 JWTミドルウェア
		{
			friends.GET("", controller.GetFriendsHandler)
			friends.DELETE("/:id", controller.DeleteFriendHandler)
		}

		// メッセージ関連
		messages := api.Group("/messages")
		messages.Use(middleware.AuthMiddleware(), middleware.ForbidRoles("admin")) // 🔐 JWTミドルウェア
		{
			messages.GET("/:friend_id", controller.GetMessagesHandler)
			messages.POST("", controller.PostMessageHandler)
			messages.POST("/media", controller.UploadMessageMediaHandler)
			messages.POST("/:id/read", controller.MarkMessageAsReadHandler)
			messages.PATCH("/:id", controller.UpdateMessageHandler)
			messages.DELETE("/:id", controller.DeleteMessageHandler)
			messages.POST("/:id/report", controller.ReportMessageHandler)
		}

		// 管理者専用
		admin := api.Group("/admin")
		admin.Use(middleware.AuthMiddleware(), middleware.RequireRoles("admin"))
		{
			admin.GET("/health", controller.AdminHealthHandler)
			admin.POST("/users/:id/ban", controller.AdminBanUserHandler)
			admin.POST("/users/:id/unban", controller.AdminUnbanUserHandler)
			admin.GET("/reports", controller.AdminListReportsHandler)
			admin.POST("/reports/:id/resolve", controller.AdminResolveReportHandler)
			admin.GET("/banned-users", controller.AdminListBannedUsersHandler)
		}

		// 		// 通知関連（未読件数など）
		// 		api.GET("/unread-counts", controller.GetUnreadCountsHandler)
	}

	// WebSocket
	r.GET("/ws", controller.WSHandler)

	return r
}
