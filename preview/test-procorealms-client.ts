import * as blessed from "neo-blessed";
import { createWsClient } from "../src/ws-client";
import { procoRealmsClient } from "../src/procorealms-tui";

const screen = blessed.screen({
  smartCSR: true,
  terminal: "xterm-256color",
  fullUnicode: true,
});

const client = createWsClient("procrealms.ddns.net", 8000);
procoRealmsClient(screen, client, {
  key: "",
  lastLogin: 0,
  sign: "",
  username: "",
});
