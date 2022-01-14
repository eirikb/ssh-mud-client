import * as blessed from "neo-blessed";
import { Widgets } from "neo-blessed";
import Screen = Widgets.Screen;

export default (screen: Screen, client: AardwolfClient, userInfo: UserInfo) => {
  let login = false;

  blessed.text({
    parent: screen,
    width: "50%",
    height: 1,
    content: "F1 main      F2 chat      F3 debug",
  });

  const main = blessed.log({
    parent: screen,
    width: "75%",
    top: 1,
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

  const debug = blessed.log({
    parent: screen,
    top: 1,
    label: "Debug",
    hidden: true,
    width: "75%",
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
    width: "75%",
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

  screen.key("esc", () => {
    prompt.focus();
  });

  client
    .onParsedData((data) => {
      main.setContent(main.getContent() + data);
    })
    .onTag(({ tag, data }) => {
      if (tag === "MAPSTART") {
        map.setContent(data);
      } else if (tag.startsWith("chan")) {
        chat.pushLine(data);
        main.setContent(main.getContent() + data);
      } else if (tag.startsWith("tell")) {
        chat.pushLine(data);
        main.setContent(main.getContent() + data);
      } else {
        main.setContent(main.getContent() + data);
        debug.pushLine(`Unknown tag! ${tag} :: ${data}`);
      }
    })
    .onConnect(() => {
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
      }
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
    [main, chat, debug]
      .filter((w) => !w.hidden)
      .forEach((w) => w.scroll(-(Number(w.height) / 2)));
    screen.render();
  });
  prompt.key("pagedown", () => {
    [main, chat, debug]
      .filter((w) => !w.hidden)
      .forEach((w) => w.scroll(Number(w.height) / 2));
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
  prompt.key("f1", () => {
    chat.hidden = true;
    debug.hidden = true;
    main.hidden = false;
    screen.render();
  });
  prompt.key("f2", () => {
    main.hidden = true;
    debug.hidden = true;
    chat.hidden = false;
    screen.render();
  });
  prompt.key("f3", () => {
    debug.hidden = false;
    main.hidden = true;
    chat.hidden = true;
    screen.render();
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