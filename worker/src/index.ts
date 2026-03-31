export { StackRoom } from "./room";

interface Env {
  STACK_ROOM: DurableObjectNamespace;
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function generateRoomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (path === "/api/rooms" && request.method === "POST") {
      const roomCode = generateRoomCode();
      const id = env.STACK_ROOM.idFromName(roomCode);
      const stub = env.STACK_ROOM.get(id);
      await stub.fetch(new Request("https://do/setup", {
        method: "POST",
        body: JSON.stringify({ roomCode }),
      }));
      return json({ roomCode });
    }

    const roomMatch = path.match(/^\/api\/rooms\/(\d{6})(\/.*)?$/);
    if (roomMatch) {
      const roomCode = roomMatch[1]!;
      const sub = roomMatch[2] || "";
      const id = env.STACK_ROOM.idFromName(roomCode);
      const stub = env.STACK_ROOM.get(id);

      if (!sub && request.method === "GET") {
        return stub.fetch(new Request("https://do/info"));
      }

      if (sub === "/quickleave" && request.method === "POST") {
        return stub.fetch(new Request("https://do/quickleave", {
          method: "POST",
          body: request.body,
        }));
      }

      if (sub === "/ws" && request.headers.get("Upgrade") === "websocket") {
        return stub.fetch(request);
      }
    }

    return json({ error: "Not found" }, 404);
  },
};
