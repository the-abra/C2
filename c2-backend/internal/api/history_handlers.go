package api

import (
	"encoding/json"
	"net/http"
)

func (h *Handler) GetScanHistory(w http.ResponseWriter, r *http.Request) {
	history, err := h.Store.GetScanHistory()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(history)
}
