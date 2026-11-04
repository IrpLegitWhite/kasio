export class Lobby {
  private state: DurableObjectState;
  private sessions: Set<WebSocket> = new Set();

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get("Upgrade");
    if (upgrade !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.state.acceptWebSocket(server);
    this.sessions.add(server);

    server.send(JSON.stringify({ type: "hello", players: this.sessions.size }));
    this.broadcast({ type: "players", count: this.sessions.size });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string) {
    let data: any;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }

    if (data.type === "join") {
      ws.send(JSON.stringify({ type: "joined", name: data.name }));
      this.broadcast({ type: "players", count: this.sessions.size });
    }

    if (data.type === "spin") {
      const roll = Math.floor(Math.random() * 100);
      this.broadcast({ type: "spin_result", roll, from: data.name });
    }
  }

  async webSocketClose(ws: WebSocket) {
    this.sessions.delete(ws);
    this.broadcast({ type: "players", count: this.sessions.size });
  }

  async webSocketError(ws: WebSocket) {
    this.sessions.delete(ws);
  }

  private broadcast(msg: any) {
    const str = JSON.stringify(msg);
    for (const ws of this.sessions) {
      try {
        ws.send(str);
      } catch {
        this.sessions.delete(ws);
      }
    }
  }
}
