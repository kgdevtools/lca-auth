/*!
 * Stockfish Worker Wrapper
 * This file wraps stockfish.js so it can be used as a Web Worker
 * by your StockfishService. Place this in /public/engine/
 */

// We import the actual stockfish.js engine
self.importScripts("/engine/stockfish.js");

// stockfish.js (the Chess.com build) exposes a global `Stockfish` factory function.
// We call it with a config that wires its output back to the main thread via postMessage.

var engineReady = false;
var messageQueue = [];
var engine = null;

function initEngine() {
  // The Chess.com stockfish.js build exports a factory via the global `Stockfish`
  // (or via module.exports in Node). In a worker context it attaches to `self`.
  var factory =
    typeof Stockfish !== "undefined"
      ? Stockfish
      : typeof self.Stockfish !== "undefined"
        ? self.Stockfish
        : null;

  if (!factory) {
    // Fallback: stockfish.js may have self-initialized using the hash trick.
    // In that case, wire up the message handler directly.
    self.onmessage = function (e) {
      // The engine has already set up its own onmessage via the hash trick.
      // We don't need to do anything here.
    };
    return;
  }

  factory({
    // Called for every line of output from the engine (info, bestmove, uciok, etc.)
    print: function (line) {
      postMessage(line);
    },
    // Also capture printErr in case the engine emits on stderr
    printErr: function (line) {
      postMessage(line);
    },
    // Tell the engine where to find the .wasm file
    locateFile: function (path) {
      return "/engine/" + path;
    },
    onRuntimeInitialized: function () {
      engineReady = true;
      // Flush any commands that arrived before the engine was ready
      while (messageQueue.length > 0) {
        engine.ccall("command", null, ["string"], [messageQueue.shift()], {
          async: true,
        });
      }
    },
  })
    .then(function (instance) {
      engine = instance;
      // Wire up incoming messages from StockfishService
      self.onmessage = function (e) {
        var cmd = e.data;
        if (!engineReady) {
          messageQueue.push(cmd);
          return;
        }
        engine.ccall("command", null, ["string"], [cmd], {
          async: /^go\b/.test(cmd),
        });
      };
    })
    .catch(function (err) {
      postMessage("error: " + err);
    });
}

initEngine();
