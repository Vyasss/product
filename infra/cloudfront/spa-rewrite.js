// CloudFront Function (cloudfront-js-2.0 runtime), associated with the distribution's
// default behaviour as a VIEWER REQUEST function.
//
// SPA fallback: any path without a file extension (e.g. /, /cart, /checkout) is served from
// /index.html so the client-side router can handle it. Paths with an extension
// (/assets/index-abc123.js, /favicon.svg) are passed through unchanged, so a missing asset is
// still a real 404 instead of an HTML page served with a JavaScript content type.
//
// Product links: /product/p-00042 is served from /product/p-00042.html, the same app shell
// with that product's name and price in its preview tags (written by
// scripts/product-previews.mjs). Ids outside the catalog go to /index.html, where the app
// shows its own "product not found" page.
//
// The query string is untouched: ?q=shoes&category=Apparel,Sports reaches the browser as-is.

// Number of product pages uploaded. Set to 0 when dist/product/ was not generated.
var PRODUCT_PAGES = 5000;
var PRODUCT_PATH = /^\/product\/p-(\d{5})$/;

function handler(event) {
  var request = event.request;
  var uri = request.uri;

  var product = PRODUCT_PATH.exec(uri);
  if (product) {
    var number = Number(product[1]);
    request.uri = number >= 1 && number <= PRODUCT_PAGES ? uri + '.html' : '/index.html';
    return request;
  }

  var lastSegment = uri.substring(uri.lastIndexOf('/') + 1);
  if (lastSegment.indexOf('.') === -1) {
    request.uri = '/index.html';
  }

  return request;
}
