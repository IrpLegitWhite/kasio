export { Lobby } from "./lobby";

export interface Env {
  LOBBY: DurableObjectNamespace;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      const lobbyId = url.searchParams.get("lobby") || "default";
      const id = env.LOBBY.idFromName(lobbyId);
      const stub = env.LOBBY.get(id);
      return stub.fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
};
