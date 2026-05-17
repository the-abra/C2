package ws

import (
	"github.com/creack/pty"
	"github.com/gorilla/websocket"
	"log"
	"net/http"
	"os"
	"os/exec"
)

func (h *Hub) HandleShell(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer conn.Close()

	// Start a shell
	c := exec.Command("bash")
	c.Env = append(os.Environ(), "TERM=xterm-256color")

	f, err := pty.Start(c)
	if err != nil {
		log.Println(err)
		return
	}
	defer f.Close()

	// Copy from PTY to WS
	go func() {
		buf := make([]byte, 1024)
		for {
			n, err := f.Read(buf)
			if err != nil {
				return
			}
			if err := conn.WriteMessage(websocket.BinaryMessage, buf[:n]); err != nil {
				return
			}
		}
	}()

	// Copy from WS to PTY
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}
		if _, err := f.Write(message); err != nil {
			break
		}
	}
}
