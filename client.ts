import * as telnetlib from "telnetlib";

const { GMCP, MCCP, ECHO } = telnetlib.options;

const host = "aardwolf.org";
const port = 23;

const connect = () => {
  const client = telnetlib.createConnection(
    {
      host,
      port,
      remoteOptions: [GMCP, MCCP, ECHO],
      localOptions: [GMCP, MCCP],
    },
    () => {
      (client as any).reader.flushPolicy.endOfChunk = true;
    }
  );
  return client;
};

export const createClient = (): Client => {
  const listeners: [string, any][] = [];

  let client = connect();

  const hack = (self: Client, event: string, listener: any) => {
    listeners.push([event, listener]);
    client.on(event, listener);
    return self;
  };

  return {
    onData(listener: (data: Buffer) => void): Client {
      return hack(this, "data", listener);
    },
    onConnect(listener: () => void): Client {
      return hack(this, "connect", listener);
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
      client = connect();
      for (let [event, listener] of listeners) {
        client.on(event, listener);
      }
    },
  };
};
