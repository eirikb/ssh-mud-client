import * as blessed from "neo-blessed";
import aardwolfClient from "./aardwolf-client";
import { createAardwolfClient } from "./client";

const screen = blessed.screen({
  smartCSR: true,
  terminal: "xterm-256color",
  fullUnicode: true,
});

const client = createAardwolfClient();
aardwolfClient(screen, client, {
  key: "",
  lastLogin: 0,
  sign: "",
  username: "",
});
