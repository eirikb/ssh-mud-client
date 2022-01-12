import * as telnetlib from "telnetlib";
import { AardwolfTagParser2000 } from "./aardwolf-tag-parser-2000";

const { MCCP, GMCP, ECHO } = telnetlib.options;

const host = "aardwolf.org";
const port = 23;

const connect = (c: () => void) => {
  return telnetlib.createConnection(
    {
      host,
      port,
      remoteOptions: [GMCP, MCCP, ECHO],
      localOptions: [GMCP, MCCP],
    },
    c
  ); //.pipe(new AardwolfTagParser2000());
};

export const createClient = (): Client => {
  const listeners: [string, any][] = [];

  const conlist: any[] = [];
  let client = connect(() => {
    conlist.forEach((l) => l());
  });
  (client as any).reader.flushPolicy.endOfChunk = true;

  const hack = (self: Client, event: string, listener: any) => {
    listeners.push([event, listener]);
    client.on(event, listener);
    return self;
  };

  hack({} as Client, "negotiated", () => {
    const gmcp = client.getOption(GMCP);
    gmcp.send("Core", "Hello", {
      client: "ssh-mud-client",
      version: process.env["npm_package_version"] || "",
    });
    gmcp.send("Core", "Supports.Set", [
      // "Char 1",
      // "Comm 1",
      // "Room 1",
      // "Group 1",
    ]);
  });

  return {
    pipe<T extends NodeJS.WritableStream>(destination: T): T {
      return client.pipe(destination);
    },
    onData(listener: (data: Buffer) => void): Client {
      return hack(this, "data", listener);
    },
    onConnect(listener: () => void): Client {
      conlist.push(listener);
      return this;
    },
    onEnd(listener: () => void): Client {
      hack(this, "end", () => client.emit("disable", 1));
      return hack(this, "end", listener);
    },
    onPassword(listener: (enable: boolean) => void): Client {
      hack(this, "enable", (option: number) => {
        if (option === 1) listener(true);
      });
      hack(this, "disable", (option: number) => {
        if (option === 1) listener(false);
      });
      return this;
    },
    write(data: any): Client {
      client.write(data);
      return this;
    },
    reconnect() {
      client = connect(() => {
        conlist.forEach((l) => l());
      });
      (client as any).reader.flushPolicy.endOfChunk = true;
      for (let [event, listener] of listeners) {
        client.on(event, listener);
      }
    },
    onGmcp(
      listener: (packageName: string, messageName: string, data: any) => void
    ): Client {
      return this.onConnect(() => {
        const gmcp = client.getOption(GMCP);
        gmcp.on("gmcp", listener);
      });
    },
    onError(listener: (data: any) => void): Client {
      return hack(this, "error", listener);
    },
    sendGmcp(packageName: string, messageName: string, data: any) {
      const gmcp = client.getOption(GMCP);
      gmcp.send(packageName, messageName, data);
    },
  };
};

export const createAardwolfClient = (): AardwolfClient => {
  const client = createClient();

  const eh = client.pipe(new AardwolfTagParser2000());

  return {
    onParsedData(listener: (data: Buffer) => void): AardwolfClient {
      eh.on("data", listener);
      return this;
    },
    onTag(
      listener: (data: { tag: string; data: string }) => void
    ): AardwolfClient {
      eh.on("tag", listener);
      return this;
    },
    ...client,
  };
};
