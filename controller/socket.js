"use strict";

module.exports = function(io) {
  console.log('socket.js gets runned');
  var rooms = new Set();
  const {getRoomName} = require('./utility');
  io.on('connection', function(socket) {
    socket.on('assign me a room', function(ids){
      // assign the socket to the specifc room
      socket.join(getRoomName(ids));
      rooms.add(getRoomName(ids));
    })
  })

  class Progress {
    constructor(roomName) {
      this.percentage = 0;
      this.roomName = roomName;
    }

    incr(num, msg, nope) {
      this.percentage = Math.min(this.percentage + num, 100);
      this.msg = msg;
      io.sockets.in(this.roomName).emit('progress', {percentage: this.percentage, msg: this.msg, noshow: nope || this.msg == undefined});
    }
  }

  return {rooms, Progress};
}
