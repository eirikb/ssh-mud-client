import * as blessed from "neo-blessed";
import lobby from "../src/lobby";

const screen = blessed.screen({
  smartCSR: true,
  terminal: "xterm-256color",
  fullUnicode: true,
});

lobby(screen, {
  key: "",
  lastLogin: 0,
  sign: "",
  username: "",
});
