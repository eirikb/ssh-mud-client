import * as telnetlib from "telnetlib";

const { MCCP, GMCP, ECHO } = telnetlib.options;

const host = "aardwolf.org";
const port = 23;

const connect = (c: () => void) => {
  const client = telnetlib.createConnection(
    {
      host,
      port,
      remoteOptions: [GMCP, MCCP, ECHO],
      localOptions: [GMCP, MCCP],
    },
    c
  );
  return client;
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
      "Char 1",
      "Comm 1",
      "Room 1",
      "Group 1",
    ]);
  });

  return {
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
      // @ts-ignore
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
    // @ts-ignore
    sendGmcp(packageName: string, messageName: string, data: any) {
      const gmcp = client.getOption(GMCP);
      gmcp.send(packageName, messageName, data);
    },
  };
};
