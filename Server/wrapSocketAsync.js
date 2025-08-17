module.exports = function wrapSocketAsync(fn) {
  return function (socket) {
    // Ensure any promise rejection is caught and handled to avoid unhandledRejection
    Promise.resolve()
      .then(() => fn(socket))
      .catch((err) => {
        console.error('Socket handler error:', err && err.stack ? err.stack : err);
        try { socket.emit('server-error', { message: 'Internal server error' }); } catch (e) { }
        try { socket.disconnect(true); } catch (e) { }
      });
  };
};
