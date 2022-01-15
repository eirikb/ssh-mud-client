import * as blessed from "neo-blessed";
import { Widgets } from "neo-blessed";
import Screen = Widgets.Screen;
import { createTabish } from "./tabish";
import { commands } from "./aardwolf-commands";

const commandsLowerCase = commands.map((c) => c.toLowerCase());

export default (screen: Screen, client: AardwolfClient, userInfo: UserInfo) => {
  let login = false;

  const tabish = createTabish({
    parent: screen,
    width: "100%",
    height: 1,
    left: 1,
    tabs: ["F1 main", "F2 chat", "F3 debug"],
  });

  const game1 = blessed.box({
    parent: screen,
    width: "100%",
    top: 1,
    height: "100%-4",
  });

  const game2 = blessed.box({
    parent: game1,
    width: "100%",
    height: "100%",
  });

  const main = blessed.log({
    parent: game2,
    width: "75%",
    height: "100%",
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

  const debug = blessed.log({
    parent: screen,
    top: 1,
    label: "Debug",
    hidden: true,
    width: "100%",
    height: "100%-4",
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

  debug.pushLine(`User ${userInfo.username}`);
  if (userInfo.lastLogin > 0) {
    debug.pushLine(`Last login ${new Date(userInfo.lastLogin)}`);
  }
  debug.pushLine(`Key ${userInfo.key}`);
  debug.pushLine(`Sign ${userInfo.sign}`);

  const chat = blessed.log({
    parent: screen,
    hidden: true,
    width: "100%",
    top: 1,
    label: "Chat",
    height: "100%-4",
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

  const chat2 = blessed.log({
    parent: game1,
    hidden: true,
    width: "50%",
    left: "50%",
    label: "Chat",
    height: "100%",
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

  const map = blessed.log({
    parent: game2,
    label: "Map (F4 toggle)",
    left: "75%",
    width: "25%",
    height: "50%",
    border: {
      type: "line",
    },
  });

  const stats = blessed.box({
    parent: game2,
    label: "Stats (F5 toggle)",
    top: "50%",
    left: "75%",
    width: "25%",
    height: "50%",
    border: {
      type: "line",
    },
    children: [
      // blessed.progressbar({
      //   orientation: "horizontal",
      //   filled: 45,
      // }),
    ],
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

  screen.key("esc", () => {
    prompt.focus();
  });

  client
    .onParsedData((data) => {
      main.setContent(main.getContent() + data);
    })
    .onTag(({ tag, data }) => {
      debug.pushLine(`Tag! ${tag} `);
      if (tag === "MAPSTART") {
        map.setContent(data);
      } else if (tag.startsWith("chan")) {
        chat.pushLine(data);
        chat2.pushLine(data);
        main.setContent(main.getContent() + data);
      } else if (tag.startsWith("tell")) {
        chat.pushLine(data);
        chat2.pushLine(data);
        main.setContent(main.getContent() + data);
      } else {
        main.setContent(main.getContent() + data);
        debug.pushLine(`Unknown tag! ${tag}`);
      }
    })
    .onConnect(() => {
      debug.pushLine("Connected!");
      main.pushLine("Connected!");
      main.pushLine("");
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
    .onGmcp((packageName, messageName, data) => {
      debug.pushLine(
        `GMCP! ${packageName} :: ${messageName} :: ${JSON.stringify(data)}`
      );

      // First GMCP message prooobably means user logged in
      if (!login) {
        login = true;
        main.pushLine("Welcome!");
        client.write("tags map on\n");
        client.write("tags mapexits on\n");
        client.write("tags mapnames on\n");
        client.write("tags channels on\n");
        client.write("map\n");
      }
    })
    .onError((err) => {
      main.pushLine(`Error: ${err}`);
      debug.pushLine(`Error: ${err}`);
    })
    .onEnd(() => {
      debug.pushLine("Disconnected!");
      main.pushLine("Disconnected!");
      main.pushLine("Type /connect or /c to reconnect");
    });

  const history: string[] = [];
  let historyPos = 0;
  prompt.key("pageup", () => {
    [main, chat, debug]
      .filter((w) => !w.hidden)
      .forEach((w) => w.scroll(-Math.floor(Number(w.height) / 2)));
    screen.render();
  });
  prompt.key("pagedown", () => {
    [main, chat, debug]
      .filter((w) => !w.hidden)
      .forEach((w) => w.scroll(Math.floor(Number(w.height) / 3)));
    screen.render();
  });
  prompt.key(["C-p", "up"], () => {
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
  prompt.key("f1", () => {
    tabish.selectTab(0);
    chat.hidden = true;
    debug.hidden = true;
    game1.hidden = false;
    screen.render();
  });
  prompt.key("f2", () => {
    tabish.selectTab(1);
    game1.hidden = true;
    debug.hidden = true;
    chat.hidden = false;
    screen.render();
  });
  prompt.key("f3", () => {
    tabish.selectTab(2);
    debug.hidden = false;
    game1.hidden = true;
    chat.hidden = true;
    screen.render();
  });
  prompt.key("f4", () => {
    map.toggle();
    main.width = map.hidden && stats.hidden ? "100%" : "75%";
    screen.render();
  });
  prompt.key("f5", () => {
    stats.toggle();
    main.width = map.hidden && stats.hidden ? "100%" : "75%";
    screen.render();
  });
  prompt.key("C-w", () => {
    prompt.value = prompt.value.split(" ").slice(0, -1).join(" ");
    screen.render();
  });
  prompt.key("tab", () => {
    const q = prompt.value.replace(/\t/g, "");
    const lastSpace = q.lastIndexOf(" ");
    const oneWord = lastSpace < 0;

    if (oneWord) {
      const cmd = commandsLowerCase.find((w) => w.startsWith(q));
      if (cmd) {
        prompt.value = cmd + " ";
        screen.render();
        return;
      }
    } else {
      const word = q.substring(lastSpace + 1);
      const cmd = main
        .getText()
        .slice(-1000)
        .split(" ")
        .find((w) => w.toLowerCase().startsWith(word));
      if (cmd) {
        prompt.value = q.slice(0, lastSpace) + " " + cmd + " ";
        screen.render();
        return;
      }
    }

    prompt.value = q;
    screen.render();
  });

  screen.on("warning", (w) => debug.pushLine(`Warning: ${w}`));

  function perhapsShowChat2() {
    if (screen.width > 230) {
      game2.width = "50%";
      chat2.show();
    } else {
      game2.width = "100%";
      chat2.hide();
    }
  }

  screen.on("resize", () => {
    debug.pushLine(
      `Resize: ${JSON.stringify({
        width: screen.width,
        height: screen.height,
      })}`
    );
    perhapsShowChat2();
  });
  perhapsShowChat2();

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
              screen.destroy();
              client.end();
            } else if (cmd === "help") {
              main.pushLine("Help herp derp no time to write such things");
            } else if (cmd === "screen") {
              debug.pushLine(
                JSON.stringify({
                  height: screen.height,
                  width: screen.width,
                })
              );
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
            main.setContent(main.getContent() + " " + value + "\n");
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
