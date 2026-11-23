// CloudFront Function (cloudfront-js-2.0 runtime), associated with the distribution's
// default behaviour as a VIEWER REQUEST function.
//
// SPA fallback: any path without a file extension (e.g. /, /search, /products/123) is served
// from /index.html so the client-side router can handle it. Paths with an extension
// (/assets/index-abc123.js, /favicon.svg) are passed through unchanged, so a missing asset is
// still a real 404 instead of an HTML page served with a JavaScript content type.
//
// The query string is untouched: ?q=shoes&category=Apparel,Sports reaches the browser as-is.
//
// Written for this project; not deployed or executed as part of it.

function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var lastSegment = uri.substring(uri.lastIndexOf('/') + 1);

  if (lastSegment.indexOf('.') === -1) {
    request.uri = '/index.html';
  }

  return request;
}
