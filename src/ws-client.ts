import { WebSocket } from "ws";
import { EventEmitter } from "events";

export const createWsClient = (host: string, port: number): WsClient => {
  const events = new EventEmitter();

  function connect() {
    const ws = new WebSocket(`ws://${host}:${port}`);

    ws.onopen = () => {
      events.emit("connect");
    };

    ws.onmessage = (event) => {
      try {
        // @ts-ignore
        events.emit("data", JSON.parse(event.data));
      } catch (e) {
        events.emit("error", e);
      }
    };
    return ws;
  }

  let ws = connect();

  return {
    send(data: any): void {
      ws.send(JSON.stringify(data));
    },
    forcePassword(enable: boolean): void {
      events.emit("password", enable);
    },
    end(): void {
      ws.close();
    },
    onConnect(listener: () => void): Client {
      events.on("connect", listener);
      return this;
    },
    onData(listener: (data: Buffer) => void): Client {
      events.on("data", listener);
      return this;
    },
    onEnd(listener: () => void): Client {
      events.on("end", listener);
      return this;
    },
    onError(listener: (data: any) => void): Client {
      events.on("error", listener);
      return this;
    },
    onGmcp(
      listener: (packageName: string, messageName: String, data: any) => void
    ): Client {
      events.on("gmcp", listener);
      return this;
    },
    onPassword(listener: (enabled: boolean) => void): Client {
      events.on("password", listener);
      return this;
    },
    pipe<T extends NodeJS.WritableStream>(destination: T): T {
      return this;
    },
    reconnect(): void {
      ws = connect();
    },
    sendGmcp(packageName: string, messageName: string, data: any) {
      throw new Error("Not implemented yet");
    },
    write(data: any): Client {
      ws.send(
        JSON.stringify({
          cmd: "cmd",
          msg: data,
        })
      );
      return this;
    },
  };
};
