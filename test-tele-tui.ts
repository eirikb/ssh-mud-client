import * as blessed from "neo-blessed";
import teleTui from "./tele-tui";
import { createClient } from "./client";

const screen = blessed.screen({
  smartCSR: true,
  terminal: "xterm-256color",
  fullUnicode: true,
});

const client = createClient();

teleTui(screen, client);
