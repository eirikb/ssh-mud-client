import * as blessed from "blessed";
import teleTui from "./tele-tui";
import * as net from "net";
import * as fs from "fs";
import { Socket } from "net";

const screen = blessed.screen({
  smartCSR: true,
  terminal: "xterm-256color",
  fullUnicode: true,
});

const realClient = true;
const logOutput = true;
const loadOutput = true;

const client = realClient
  ? net
      .connect({
        host: "aardwolf.org",
        port: 4000,
      })
      .on("data", (data: Buffer) => {
        if (logOutput) {
          fs.appendFileSync("./output.out", data);
          fs.appendFileSync("./output-ascii.out", data.toString("ascii"));
        }
      })
  : ({
      on(event: string, cb: (data: any) => void): Socket {
        if (loadOutput && event === "data") {
          fs.readFile("output.out", (_, data) => {
            cb(data);
          });
        }
        return client;
      },
      write(_): any {
        return this;
      },
    } as Socket);
teleTui(screen, client);
