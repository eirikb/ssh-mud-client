import * as blessed from "neo-blessed";
import { Widgets } from "neo-blessed";
import { createTabish } from "./tabish";
import { createBarus } from "./barus";
import { createStats } from "./stats";
import { createPrompt } from "./promptly";
import { commands } from "./aardwolf-commands";
import Screen = Widgets.Screen;

export const aardwolfTui = (
  screen: Screen,
  client: AardwolfClient,
  userInfo: UserInfo
) => {
  let login = false;

  const scrollbar = {
    ch: "O",
    track: {
      bg: "cyan",
    },
    style: {
      inverse: true,
    },
  };

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
    scrollbar,
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
    height: "100%-5",
    border: {
      type: "line",
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar,
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
    scrollbar,
  });

  const map = blessed.log({
    parent: game2,
    label: "Map (F4 toggle)",
    left: "75%",
    width: "25%",
    height: 25,
    border: {
      type: "line",
    },
  });

  const stats = createStats({
    parent: game2,
    label: "Stats (F5 toggle)",
    top: 25,
    left: "75%",
    width: "25%",
    bottom: 0,
    border: {
      type: "line",
    },
  });

  const prompt = createPrompt({
    width: 50,
    height: 1,
    left: 2,
    commands,
    screen,
    main,
    debug,
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
  main.pushLine("Connecting to aardwolf...");

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
      prompt.password(enabled);
      if (!enabled) {
        main.pushLine("> (Password)");
      }
    })
    .onGmcp((packageName, messageName, data) => {
      debug.pushLine(
        `GMCP! ${packageName} :: ${messageName} :: ${JSON.stringify(data)}`
      );

      if (packageName === "char" && messageName === "maxstats") {
        hp.setMax(data.maxhp);
        mana.setMax(data.maxmana);
        moves.setMax(data.maxmoves);
        for (const [name, max] of Object.entries(data)) {
          stats.setMaxStat(name.replace("max", ""), Number(max));
        }
      }

      if (packageName === "char" && messageName === "stats") {
        for (const [name, max] of Object.entries(data)) {
          stats.setStat(name, Number(max));
        }
      }

      if (packageName === "char" && messageName === "worth") {
        for (const [name, max] of Object.entries(data)) {
          stats.setStat(name, Number(max));
        }
      }

      if (packageName === "char" && messageName === "vitals") {
        hp.setCurrent(data.hp);
        mana.setCurrent(data.mana);
        moves.setCurrent(data.moves);
      }

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
    chat.hide();
    debug.hide();
    game1.show();
    screen.render();
  });
  prompt.key("f2", () => {
    tabish.selectTab(1);
    game1.hide();
    debug.hide();
    chat.show();
    screen.render();
  });
  prompt.key("f3", () => {
    tabish.selectTab(2);
    debug.hide();
    game1.hide();
    chat.show();
    screen.render();
  });
  prompt.key("f4", () => {
    map.toggle();
    main.width = map.hidden && stats.hidden ? "100%" : "75%";
    stats.top = map.hidden ? 0 : map.height;
    screen.render();
  });
  prompt.key("f5", () => {
    stats.toggle();
    main.width = map.hidden && stats.hidden ? "100%" : "75%";
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

  prompt.on("command", ({ password, command }) => {
    if (!password) {
      main.setContent(main.getContent() + command + "\n");
    }
    client.write(command + "\n");
  });

  prompt.prompt();
};
