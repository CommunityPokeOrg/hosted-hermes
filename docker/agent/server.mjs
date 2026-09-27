// Minimal Hermes agent stub: an HTTP server that echoes its HERMES_* config
// on /config and reports liveness on /healthz. Replace with the real agent
// runtime image in production.
import http from "node:http";

const port = Number(process.env.PORT ?? 8080);

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  if (req.url === "/config") {
    const env = Object.fromEntries(
      Object.entries(process.env).filter(([k]) => k.startsWith("HERMES_")),
    );
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(env, null, 2));
    return;
  }
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ agent: process.env.HERMES_INSTANCE_NAME ?? "unknown" }));
});

server.listen(port, () => {
  console.log(`[hermes] listening on :${port}`);
});
