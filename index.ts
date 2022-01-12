import * as blessed from "neo-blessed";
import * as fs from "fs";
import { Server } from "ssh2";
import * as telnetlib from "telnetlib";
import teleTui from "./tele-tui";

const { GMCP, MCCP } = telnetlib.options;

new Server(
  {
    hostKeys: [fs.readFileSync("host.key")],
  },
  (client) => {
    let username = "";
    let key = "";
    client
      .on("authentication", (ctx) => {
        console.log(ctx.username, ctx.method);

        if (ctx.method === "none") return ctx.reject();
        else if (ctx.method === "keyboard-interactive") ctx.accept();
        else if (ctx.method === "password") return ctx.reject();

        username = ctx.username;

        const k = (ctx as any).key;
        if (k) {
          key = k.data.toString("hex");
        }

        console.log("auth", username, key);
        ctx.accept();
      })
      .on("session", (accept) => {
        const session = accept();
        let rows = 0;
        let cols = 0;

        session.on("pty", (accept, _, info) => {
          console.log("pty", username, info);
          rows = info.rows;
          cols = info.cols;
          if (accept) accept();
        });

        session.on("shell", (accept) => {
          console.log("shell", username, key);
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
            console.log(username, "close");
            screen.destroy();
          });

          // const c = telnetlib.createConnection(
          //   {
          //     host: "aardwolf.org",
          //     port: 23,
          //     remoteOptions: [GMCP, MCCP],
          //     localOptions: [GMCP, MCCP],
          //   },
          //   () => {
          //     // Hack
          //     (c as any).reader.flushPolicy.endOfChunk = true;
          //   }
          // );
          //
          // teleTui(screen, c);
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
