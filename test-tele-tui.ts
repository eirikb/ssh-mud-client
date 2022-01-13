import * as blessed from "neo-blessed";
import teleTui from "./tele-tui";
import { createAardwolfClient } from "./client";

const screen = blessed.screen({
  smartCSR: true,
  terminal: "xterm-256color",
  fullUnicode: true,
});

const client = createAardwolfClient();

teleTui(screen, client);
