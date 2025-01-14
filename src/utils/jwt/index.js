import { decodeFromBase64 } from '../base64';

/**
 * Decode a JWT token
 */
export function decodeJWTtoken(token) {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  // no need to check availability of `encodeURIComponent`, since it is a function highly supported in browsers, node and other platforms.
  var jsonPayload = decodeURIComponent(decodeFromBase64(base64).split('').map(function (c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
}