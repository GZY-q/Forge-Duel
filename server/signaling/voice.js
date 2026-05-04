export function setupVoiceSignaling(io, roomManager) {
  io.on("connection", (socket) => {
    socket.on("voice:offer", (data) => {
      const { targetId, sdp } = data || {};
      if (!targetId || !sdp) return;
      const senderRoom = roomManager.playerRooms.get(socket.id);
      const targetRoom = roomManager.playerRooms.get(targetId);
      if (!senderRoom || senderRoom !== targetRoom) return;
      io.to(targetId).emit("voice:offer", {
        fromId: socket.id,
        sdp
      });
    });

    socket.on("voice:answer", (data) => {
      const { targetId, sdp } = data || {};
      if (!targetId || !sdp) return;
      const senderRoom = roomManager.playerRooms.get(socket.id);
      const targetRoom = roomManager.playerRooms.get(targetId);
      if (!senderRoom || senderRoom !== targetRoom) return;
      io.to(targetId).emit("voice:answer", {
        fromId: socket.id,
        sdp
      });
    });

    socket.on("voice:ice-candidate", (data) => {
      const { targetId, candidate } = data || {};
      if (!targetId || !candidate) return;
      const senderRoom = roomManager.playerRooms.get(socket.id);
      const targetRoom = roomManager.playerRooms.get(targetId);
      if (!senderRoom || senderRoom !== targetRoom) return;
      io.to(targetId).emit("voice:ice-candidate", {
        fromId: socket.id,
        candidate
      });
    });

    socket.on("voice:speaking", (data) => {
      const { isSpeaking } = data || {};
      const rooms = [...socket.rooms].filter((r) => r !== socket.id);
      for (const room of rooms) {
        socket.to(room).emit("voice:speaking", {
          playerId: socket.id,
          isSpeaking: !!isSpeaking
        });
      }
    });
  });
}