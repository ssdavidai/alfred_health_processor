const path = require('path');

module.exports = {
  // ... existing configuration ...
  resolve: {
    fallback: {
      "zlib": require.resolve("browserify-zlib"),
      "querystring": require.resolve("querystring-es3"),
      "path": require.resolve("path-browserify"),
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "url": require.resolve("url/"),
      "buffer": require.resolve("buffer/"),
      "util": require.resolve("util/"),
      "fs": false, // fs is not available in the browser
      "net": false, // net is not available in the browser
      "http": require.resolve("stream-http"),
    }
  }
};
