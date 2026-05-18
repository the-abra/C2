package api

import (
	"github.com/abra/c2-backend/internal/api/handlers"
	"github.com/abra/c2-backend/internal/ws"
	"github.com/gin-gonic/gin"
)

func SetupRouter(h *handlers.APIHandlers, hub *ws.Hub) *gin.Engine {
	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	api := r.Group("/api")
	{
		api.GET("/status", h.GetStatus)
		api.GET("/tools", h.GetTools)
		api.POST("/run", h.RunTool)
		api.POST("/kill", h.KillScan)
		api.GET("/discoveries", h.GetDiscoveries)
		api.GET("/sessions", h.GetSessions)
		api.POST("/sessions", h.CreateSession)
		api.DELETE("/sessions", h.DeleteSession)
		api.GET("/history", h.GetHistory)
		api.GET("/notes", h.GetNotes)
		api.POST("/notes", h.SaveNote)
		api.GET("/scenarios", h.GetScenarios)
		api.POST("/scenarios", h.CreateScenario)
		api.DELETE("/scenarios", h.DeleteScenario)
		api.POST("/scenarios/run", h.RunScenario)
		api.GET("/automation", h.GetAutomation)
		api.POST("/automation/toggle", h.ToggleAutomation)
		api.GET("/report", h.GetReport)
		api.GET("/system/stats", h.GetSystemStats)
	}

	r.GET("/ws", func(c *gin.Context) {
		ws.ServeWs(hub, c.Writer, c.Request)
	})
	r.GET("/ws/", func(c *gin.Context) {
		ws.ServeWs(hub, c.Writer, c.Request)
	})

	r.GET("/shell", func(c *gin.Context) {
		ws.ServeShell(c.Writer, c.Request)
	})
	r.GET("/shell/", func(c *gin.Context) {
		ws.ServeShell(c.Writer, c.Request)
	})

	return r
}
