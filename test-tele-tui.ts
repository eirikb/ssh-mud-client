import * as blessed from "neo-blessed";
import teleTui from "./tele-tui";
import { createAardwolfClient } from "./client";
import * as fs from "fs";

const screen = blessed.screen({
  smartCSR: true,
  terminal: "xterm-256color",
  fullUnicode: true,
});

const client = createAardwolfClient();

client.onError((e) => fs.appendFileSync("./log.out", `\n ${e} ${e.stack}`));
client.onEnd(() => fs.appendFileSync("./log.out", "\nend"));
screen.on("error", (e) => fs.appendFileSync("./log.out", `\n${e} ${e.stack}`));
screen.on("end", () => fs.appendFileSync("./log.out", "\nend"));

teleTui(screen, client);
