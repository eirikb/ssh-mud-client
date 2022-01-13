import * as blessed from "neo-blessed";
import * as fs from "fs";
import { Server } from "ssh2";
import aardwolfClient from "./aardwolf-client";
import { createAardwolfClient } from "./client";

let lastLogins: { [key: string]: number } = {};

new Server(
  {
    hostKeys: [fs.readFileSync("host.key")],
  },
  (client) => {
    const userInfo: UserInfo = {
      lastLogin: 0,
      key: "",
      sign: "",
      username: "",
    };
    client
      .on("authentication", (ctx) => {
        console.log(ctx.username, ctx.method);

        if (ctx.method === "none") return ctx.reject();
        else if (ctx.method === "keyboard-interactive") ctx.accept();
        else if (ctx.method === "password") return ctx.reject();

        userInfo.username = ctx.username;
        userInfo.lastLogin = lastLogins[userInfo.username] || 0;
        lastLogins[userInfo.username] = Date.now();

        const k = (ctx as any).key;
        if (k) {
          userInfo.key = k.data.toString("hex");
        }
        userInfo.sign = (ctx as any).sign;

        console.log("auth", userInfo);
        ctx.accept();
      })
      .on("session", (accept) => {
        const session = accept();
        let rows = 0;
        let cols = 0;

        session.on("pty", (accept, _, info) => {
          console.log("pty", userInfo.username, info);
          rows = info.rows;
          cols = info.cols;
          if (accept) accept();
        });

        session.on("shell", (accept) => {
          console.log("shell", userInfo.username);
          const stream = accept();

          const screen = blessed.screen({
            smartCSR: true,
            terminal: "xterm-256color",
            fullUnicode: true,
            input: stream,
            output: stream,
          });

          function resize() {
            // @ts-ignore
            stream.rows = rows;
            // @ts-ignore
            stream.columns = cols;
            stream.emit("resize");
          }

          session.on("window-change", (_, __, info) => {
            console.log("resize", info);
            rows = info.rows;
            cols = info.cols;
            resize();
          });

          resize();

          screen.on("destroy", () => {
            stream.exit(0);
            stream.end();
          });
          client.on("close", () => {
            console.log(userInfo.username, "close");
            screen.destroy();
          });

          aardwolfClient(screen, createAardwolfClient(), userInfo);
        });
      });
  }
)
  .on("error", (err) => {
    console.log(err);
  })
  .listen(2222, () => {
    console.log("Listening on 2222...");
  });
