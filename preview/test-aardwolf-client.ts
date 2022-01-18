import * as blessed from "neo-blessed";
import { aardwolfTui } from "../src/aardwolf-tui";
import { createAardwolfClient } from "../src/client";

const screen = blessed.screen({
  smartCSR: true,
  terminal: "xterm-256color",
  fullUnicode: true,
});

const client = createAardwolfClient();
aardwolfTui(screen, client, {
  key: "",
  lastLogin: 0,
  sign: "",
  username: "",
});
