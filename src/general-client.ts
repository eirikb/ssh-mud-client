import * as blessed from "neo-blessed";
import { Widgets } from "neo-blessed";
import Screen = Widgets.Screen;
import { createTabish } from "./tabish";
import { createBarus } from "./barus";
import { createStats } from "./stats";

export default (screen: Screen, client: Client, userInfo: UserInfo) => {
  const tabish = createTabish({
    parent: screen,
    width: "100%",
    height: 1,
    left: 1,
    tabs: ["F1 main", "F2 debug"],
  });

  const game1 = blessed.box({
    parent: screen,
    width: "100%",
    top: 1,
    height: "100%-5",
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
    height: "100%-5",
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

  const stats = createStats({
    parent: game2,
    label: "Stats (F5 toggle)",
    top: 0,
    left: "75%",
    width: "25%",
    bottom: 0,
    border: {
      type: "line",
    },
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

  const barWidth = 30;
  const hp = createBarus({
    top: 1,
    left: 0,
    name: "HP",
    current: 0,
    max: 0,
    width: barWidth,
    color: "red",
  });
  const mana = createBarus({
    top: 1,
    left: barWidth,
    name: "Mana",
    current: 0,
    max: 0,
    width: barWidth,
    color: "blue",
  });
  const moves = createBarus({
    top: 1,
    left: barWidth * 2,
    name: "Moves",
    current: 0,
    max: 0,
    width: barWidth,
    color: "yellow",
  });

  blessed.box({
    parent: screen,
    bottom: 0,
    height: 4,
    width: "100%",
    border: "line",
    children: [prePrompt, prompt, hp, mana, moves],
  });

  main.pushLine(
    `Welcome to ssh-mud-client version ${process.env["npm_package_version"]}`
  );
  main.pushLine("Connecting...");

  screen.render();

  screen.key("esc", () => {
    prompt.focus();
  });

  client
    .onData((data) => {
      main.setContent(main.getContent() + data);
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
      packageName = packageName.toLowerCase();
      messageName = messageName.toLowerCase();
      debug.pushLine(
        `GMCP! ${packageName} :: ${messageName} :: ${JSON.stringify(data)}`
      );

      if (packageName === "char" && messageName === "vitals") {
        for (const [name, value] of Object.entries(data)) {
          const v = Number(value);
          if (name === "maxhp") hp.setMax(v);
          else if (name === "hp") hp.setCurrent(v);

          if (name.startsWith("max")) {
            stats.setMaxStat(name.replace("max", ""), v);
          } else {
            stats.setStat(name, v);
          }
        }
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
    [main, debug]
      .filter((w) => !w.hidden)
      .forEach((w) => w.scroll(-Math.floor(Number(w.height) / 2)));
    screen.render();
  });
  prompt.key("pagedown", () => {
    [main, debug]
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
    debug.hide();
    game1.show();
    screen.render();
  });
  prompt.key("f2", () => {
    tabish.selectTab(2);
    debug.show();
    game1.hide();
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
      const cmd = history.find((w) => w.toLowerCase().startsWith(q));
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
