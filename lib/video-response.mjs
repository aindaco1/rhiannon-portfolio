// Serve bounded, prepared videos consistently in local and protected previews.
export function videoResponse(bytes, request) {
  const headers = {
    "content-type": "video/mp4",
    "accept-ranges": "bytes",
    "x-content-type-options": "nosniff",
  };
  const range = request?.method === "GET" ? request.headers.get("range") : null;
  let start = 0, end = bytes.length - 1;
  if (range) {
    const match = range.match(/^bytes=(\d*)-(\d*)$/);
    if (match?.[1]) {
      start = Number(match[1]);
      end = match[2] ? Math.min(Number(match[2]), end) : end;
    } else if (match?.[2]) start = Math.max(0, bytes.length - Number(match[2]));
    if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) || start > end || start >= bytes.length)
      return new Response(null, { status: 416, headers: { ...headers, "content-range": `bytes */${bytes.length}` } });
    headers["content-range"] = `bytes ${start}-${end}/${bytes.length}`;
  }
  headers["content-length"] = String(end - start + 1);
  return new Response(request?.method === "HEAD" ? null : bytes.subarray(start, end + 1), {
    status: range ? 206 : 200,
    headers,
  });
}
