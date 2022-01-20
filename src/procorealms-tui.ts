import * as blessed from "neo-blessed";
import { Widgets } from "neo-blessed";
import Screen = Widgets.Screen;
import { createTabish } from "./tabish";
import { createBarus } from "./barus";
import { createStats } from "./stats";
import { createPrompt } from "./promptly";
import { commands } from "./aardwolf-commands";

export const procoRealmsClient = (
  screen: Screen,
  client: WsClient,
  userInfo: UserInfo
) => {
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

  const prompt = createPrompt({
    commands,
    main,
    debug,
    screen,
    client,
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
    children: [prompt.prePrompt, prompt, hp, mana, moves],
  });

  main.pushLine(
    `Welcome to ssh-mud-client version ${process.env["npm_package_version"]}`
  );
  main.pushLine("Connecting...");

  screen.render();

  screen.key("esc", () => {
    prompt.focus();
  });

  let auth = true;
  let name = "";

  client
    .onData((data) => {
      debug.pushLine(JSON.stringify(data));
      const d = data as any;
      if (d.cmd === "out") {
        main.setContent(main.getContent() + d.msg);
      } else if (d.cmd === "login.fail") {
        auth = true;
        main.pushLine("Login fail, try again");
        main.pushLine("Enter username:");
      } else if (d.cmd === "state.update") {
      }
    })
    .onConnect(() => {
      debug.pushLine("Connected!");
      main.pushLine("Connected!");
      main.pushLine("");
      main.pushLine("Enter username:");
    })
    .onPassword((enabled) => {
      prompt.password(enabled);
      if (!enabled) {
        main.pushLine("> (Password)");
      }
    })
    .onGmcp((packageName, messageName, data) => {})
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
  prompt.key(["C-h", "C-left"], () => {
    client.write("w");
  });
  prompt.key(["C-j", "C-down"], () => {
    client.write("s");
  });
  prompt.key(["C-k", "C-up"], () => {
    client.write("n");
  });
  prompt.key(["C-l", "C-right"], () => {
    client.write("e");
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
  prompt.key("f5", () => {
    stats.toggle();
    main.width = stats.hidden ? "100%" : "75%";
    screen.render();
  });

  screen.on("warning", (w) => debug.pushLine(`Warning: ${w}`));

  prompt.on("command", ({ password, command }) => {
    main.pushLine(password + " :: " + command);

    if (auth) {
      if (!password) {
        name = command;
        client.forcePassword(true);
      } else {
        auth = false;
        client.forcePassword(false);
        client.send({
          cmd: "login",
          msg: {
            name,
            password: command,
          },
        });
      }
    }
  });
  prompt.prompt();
};
