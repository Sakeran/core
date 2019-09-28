'use strict';

/**
 * Helper methods for output during input-events
 */
class EventUtil {
  /**
   * Generate a function for writing output to a socket
   * @param {net.Socket} socket
   * @return {function (string)}
   */
  static genWrite(socket) {
    // NOTE: It is no longer necessary to parse anything with the addition
    // of TransportDecorators.
    return string => socket.write(string);
  }

  /**
   * Generate a function for writing output to a socket with a newline
   * @param {net.Socket} socket
   * @return {function (string)}
   */
  static genSay(socket) {
    // NOTE: It is no longer necessary to parse anything with the addition
    // of TransportDecorators.
    return string => socket.write(string + '\r\n');
  }
}

module.exports = EventUtil;
