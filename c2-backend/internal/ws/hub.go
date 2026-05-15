package ws

import (
	"github.com/gorilla/websocket"
	"log"
	"net/http"
	"sync"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all for local dev
	},
}

type Message struct {
	Type    string `json:"type"`    // "log", "status"
	Tool    string `json:"tool,omitempty"`
	Payload string `json:"payload"`
}

type Hub struct {
	clients    map[*websocket.Conn]bool
	broadcast  chan Message
	register   chan *websocket.Conn
	unregister chan *websocket.Conn
	mu         sync.Mutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*websocket.Conn]bool),
		broadcast:  make(chan Message),
		register:   make(chan *websocket.Conn),
		unregister: make(chan *websocket.Conn),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				client.Close()
			}
			h.mu.Unlock()
		case message := <-h.broadcast:
			h.mu.Lock()
			for client := range h.clients {
				err := client.WriteJSON(message)
				if err != nil {
					log.Printf("error: %v", err)
					client.Close()
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

func (h *Hub) BroadcastLog(tool, payload string) {
	h.broadcast <- Message{Type: "log", Tool: tool, Payload: payload}
}

func (h *Hub) BroadcastStatus(tool, status string) {
	h.broadcast <- Message{Type: "status", Tool: tool, Payload: status}
}

func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	h.register <- conn
}

// WSWriter implements io.Writer to pipe logs to WebSocket
type WSWriter struct {
	Hub      *Hub
	ToolName string
}

func (w *WSWriter) Write(p []byte) (n int, err error) {
	if len(p) == 0 {
		return 0, nil
	}
	// Send raw data chunk immediately to allow xterm.js to handle ANSI codes/progress bars
	w.Hub.BroadcastLog(w.ToolName, string(p))
	return len(p), nil
}

func (w *WSWriter) Close() error {
	return nil
}
