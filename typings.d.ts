declare module "neo-blessed" {
  export * from "blessed";
}

interface Client {
  onData(listener: (data: Buffer) => void): Client;

  onConnect(listener: () => void): Client;

  onEnd(listener: () => void): Client;

  onPassword(listener: (enabled: boolean) => void): Client;

  write(data: any): Client;

  reconnect(): void;
}
