declare module "neo-blessed" {
  export * from "blessed";
}

interface Client {
  onData(listener: (data: Buffer) => void): Client;

  onConnect(listener: () => void): Client;

  onEnd(listener: () => void): Client;

  onPassword(listener: (enabled: boolean) => void): Client;

  onError(listener: (data: any) => void): Client;

  write(data: any): Client;

  reconnect(): void;

  onGmcp(
    listener: (packageName: string, messageName: String, data: any) => void
  ): Client;

  sendGmcp(packageName: string, messageName: string, data: any);

  pipe<T extends NodeJS.WritableStream>(destination: T): T;
}

interface AardwolfClient extends Client {
  onParsedData(listener: (data: string) => void): AardwolfClient;

  onTag(
    listener: (data: { tag: string; data: string }) => void
  ): AardwolfClient;
}
