package router

import (
	"github.com/gin-gonic/gin"
	"chillow/controller"
	"chillow/middleware"
	"github.com/gin-contrib/cors"
)

func	SetupRouter() *gin.Engine {
	r := gin.Default()

	// CORS対応
	r.Use(cors.Default())

	// ヘルスチェック
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	api := r.Group("/api")
	{
		// 認証系
		auth := api.Group("/auth")
		{
			auth.POST("/google", controller.GoogleLoginHandler)
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
		{
			friendRequests.POST("", controller.SendFriendRequestHandler)
			friendRequests.GET("", controller.GetFriendRequestsHandler)
			friendRequests.PATCH("/:id", controller.RespondToFriendRequestHandler)
		}

		// フレンド一覧・削除
		friends := api.Group("/friends")
		{
			friends.GET("", controller.GetFriendsHandler)
			friends.DELETE("/:id", controller.DeleteFriendHandler)
		}

		// メッセージ関連
		messages := api.Group("/messages")
		{
			messages.GET("/:friend_id", controller.GetMessagesHandler)
			messages.POST("", controller.PostMessageHandler)
			messages.POST("/:id/read", controller.MarkMessageAsReadHandler)
		}

// 		// 通知関連（未読件数など）
// 		api.GET("/unread-counts", controller.GetUnreadCountsHandler)
	}

	return r
}

