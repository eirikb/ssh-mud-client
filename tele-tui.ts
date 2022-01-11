import * as blessed from "neo-blessed";
import { Widgets } from "neo-blessed";
import Screen = Widgets.Screen;

export default (screen: Screen, client: Client) => {
  const main = blessed.log({
    parent: screen,
    width: "75%",
    height: "100%-3",
    border: {
      type: "line",
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: "O",
      track: {
        bg: "cyan",
      },
      style: {
        inverse: true,
      },
    },
  });

  // @ts-ignore
  const debug = blessed.log({
    parent: screen,
    hidden: true,
    width: "100%",
    height: "100%-3",
    border: {
      type: "line",
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: "O",
      track: {
        bg: "cyan",
      },
      style: {
        inverse: true,
      },
    },
  });

  // @ts-ignore
  const map = blessed.log({
    parent: screen,
    label: "Map",
    left: "75%",
    width: "25%",
    height: "100%-3",
    border: {
      type: "line",
    },
    scrollable: true,
    alwaysScroll: true,
  });

  const prePrompt = blessed.text({
    width: 1,
    height: 1,
    content: ">",
  });
  const prompt = blessed.textbox({
    width: 50,
    height: 1,
    left: 2,
  });

  blessed.box({
    parent: screen,
    bottom: 0,
    height: 3,
    width: "100%",
    border: "line",
    children: [prePrompt, prompt],
  });

  main.pushLine(
    `Welcome to ssh-mud-client version ${process.env["npm_package_version"]}`
  );
  main.pushLine("Connecting to aardwolf...");

  screen.render();

  client
    .onConnect(() => {
      main.pushLine("Connected!");
    })
    .onPassword((enabled) => {
      if (enabled) {
        prompt.left = 11;
        prePrompt.width = 10;
        prePrompt.setText("(Password)");
        prompt.secret = true;
        prompt.value = "";
        screen.render();
      } else {
        prompt.secret = false;
        prompt.value = "";
        prompt.left = 2;
        prePrompt.width = 1;
        prePrompt.setText(">");
        main.pushLine("> (Password)");
        screen.render();
      }
    })
    .onData((data: Buffer) => {
      // main.add(data.toString());
      main.add(data.toString().replace(/\r/g, ""));
      // const printable = data.toString("ascii").replace(/[\r\n]$/g, "");

      // debug.pushLine(printable);

      // let lines = printable.split("\n");

      // let bloodyMap: number;
      // do {
      //   bloodyMap = lines.findIndex((line) => line.match(/\x1b\[1;35m#\x1b/));
      //   if (bloodyMap >= 0) {
      //     const eh = lines[bloodyMap]?.slice(0, 3);
      //     if (eh) {
      //       const start =
      //         bloodyMap -
      //         lines
      //           .slice(0, bloodyMap)
      //           .reverse()
      //           .findIndex(
      //             (line) => line.trim() === "" || !line.startsWith(eh)
      //           );
      //       const end =
      //         bloodyMap +
      //         lines.slice(bloodyMap).findIndex((line) => !line.startsWith(eh)) +
      //         1;
      //
      //       if (start >= 0 && end > start) {
      //         map.setContent(lines.slice(start, end).join("\n"));
      //         lines = lines.slice(0, start).concat(lines.slice(end));
      //       } else {
      //         bloodyMap = -1;
      //       }
      //     } else {
      //       bloodyMap = -1;
      //     }
      //   }
      // } while (bloodyMap >= 0);

      // main.pushLine(lines.join("\n"));
    })
    .onGmcp((packageName, messageName, data) => {
      main.pushLine(
        `GMCP! ${packageName} :: ${messageName} :: ${JSON.stringify(data)}`
      );
    })
    .onError((err) => {
      main.pushLine(`Error: ${err}`);
    })
    .onEnd(() => {
      main.pushLine("Disconnected!");
      main.pushLine("Type /connect or /c to reconnect");
    });

  const history: string[] = [];
  let historyPos = 0;
  prompt.key("pageup", () => {
    main.scroll(-10);
    screen.render();
  });
  prompt.key("pagedown", () => {
    main.scroll(10);
    screen.render();
  });
  prompt.key("up", () => {
    historyPos--;
    prompt.value = history[historyPos] || "";
    screen.render();
  });
  prompt.key("down", () => {
    historyPos = Math.min(historyPos + 1, history.length);
    prompt.value = history[historyPos] || "";
    screen.render();
  });
  prompt.key(["C-h", "C-left"], () => {
    client.write("w\n");
  });
  prompt.key(["C-j", "C-down"], () => {
    client.write("s\n");
  });
  prompt.key(["C-k", "C-up"], () => {
    client.write("n\n");
  });
  prompt.key(["C-l", "C-right"], () => {
    client.write("e\n");
  });

  const p = () => {
    prompt.readInput((_, value) => {
      if (value !== undefined) {
        if (!prompt.secret) {
          history.push(value);
          historyPos = history.length;
          if (value.startsWith("/")) {
            const parts = value.split(" ");
            const cmd = parts[0]!.slice(1);
            if (cmd === "q" || cmd === "quit") {
              //process.exit();
              screen.destroy();
            } else if (cmd === "help") {
              main.pushLine("Help herp derp no time to write such things");
            } else if (cmd === "connect" || cmd === "c") {
              main.pushLine("Re-connecting...");
              client.reconnect();
            } else if (cmd === "gmcp") {
              main.pushLine(`gmcp: ${parts.slice(1).join(" ")}`);
              const p = parts[1];
              if (p) {
                const m = parts[2];
                if (m) {
                  const d = parts[3];
                  if (d) {
                    client.sendGmcp(p, m, d);
                  }
                }
              }
            } else {
              main.pushLine(`Unknown command: ${cmd}`);
            }
          } else {
            main.pushLine("> " + value);
            client.write(value + "\n");
          }
        } else {
          client.write(value + "\n");
        }
      }
      prompt.value = "";
      p();
    });
  };
  p();
};
