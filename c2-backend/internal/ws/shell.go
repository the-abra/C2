package ws

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
)

// ServeShell upgrades the connection to WebSocket and runs an interactive bash shell in a PTY
func ServeShell(w http.ResponseWriter, r *http.Request) {
	fmt.Println("[*] ServeShell: Incoming connection request received!")
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Printf("[-] ServeShell: Error upgrading WS: %v\n", err)
		return
	}
	defer conn.Close()
	fmt.Println("[+] ServeShell: WebSocket handshake completed successfully!")

	cmd := exec.Command("bash")
	// Set nice environment for fully functional interactive shell
	cmd.Env = append(os.Environ(), "TERM=xterm-256color")

	f, err := pty.Start(cmd)
	if err != nil {
		fmt.Printf("Failed to start PTY: %v\n", err)
		return
	}
	defer f.Close()

	defer func() {
		_ = cmd.Process.Kill()
		_ = cmd.Wait()
	}()

	// PTY stdout -> WebSocket
	go func() {
		buf := make([]byte, 2048)
		for {
			n, err := f.Read(buf)
			if err != nil {
				fmt.Printf("[-] ServeShell PTY stdout reader exited: %v\n", err)
				return
			}
			if n > 0 {
				if err := conn.WriteMessage(websocket.BinaryMessage, buf[:n]); err != nil {
					fmt.Printf("[-] ServeShell conn.WriteMessage failed: %v\n", err)
					return
				}
			}
		}
	}()

	// WebSocket -> PTY stdin (blocks until connection closes or process exits)
	for {
		mt, message, err := conn.ReadMessage()
		if err != nil {
			fmt.Printf("[-] ServeShell conn.ReadMessage failed: %v\n", err)
			return
		}
		if mt == websocket.TextMessage || mt == websocket.BinaryMessage {
			if _, err := f.Write(message); err != nil {
				fmt.Printf("[-] ServeShell PTY stdin writer failed: %v\n", err)
				return
			}
		}
	}
}
