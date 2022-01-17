import * as blessed from "neo-blessed";
import { Widgets } from "blessed";
import Screen = Widgets.Screen;

import { sansa } from "../sansa";
import { createAardwolfClient, createClient } from "./client";
import aardwolfClient from "../src/aardwolf-client";
import generalClient from "./general-client";

let i = 0;
const sansaLines = sansa
  .split("")
  .flatMap((c) => {
    if (c === " ") {
      if (i++ === 130) {
        i = 0;
        return [c, "\n"];
      }
    }
    return c;
  })
  .join("");

export default (screen: Screen, userInfo: UserInfo) => {
  const parent = blessed.box({
    parent: screen,
    width: "100%",
    height: "100%",
    content: sansaLines,
    wrap: false,
  });
  const popup = blessed.text({
    parent: parent,
    top: "center",
    left: "center",
    width: "30%",
    height: 30,
    border: "line",
  });
  blessed.box({
    parent: popup,
    tags: true,
    content: `{center}{bold}SSH MUD CLIENT v${process.env["npm_package_version"]}{/bold}{/center}`,
  });
  blessed.box({
    parent: popup,
    top: 2,
    tags: true,
    content: `Welcome {bold}${userInfo.username}{/bold}`,
  });

  const list = blessed.list({
    parent: popup,
    top: 4,
    items: ["Play Aardwolf", "Play Procedural Realms", "Quit"],
    keyable: true,
    keys: true,
    style: {
      selected: {
        bg: "blue",
        fg: "white",
      },
    },
  });

  const pick = () =>
    // @ts-ignore
    list.pick((err: any, value: string) => {
      const cmd = value.replace(/.* /, "").toLowerCase();
      if (cmd === "aardwolf") {
        const client = createAardwolfClient();
        aardwolfClient(screen, client, userInfo);
      } else if (cmd === "realms") {
        const client = createClient("procrealms.ddns.net", 3000);
        generalClient(screen, client, userInfo);
      } else if (cmd === "about") {
        blessed
          .message({
            parent: screen,
          })
          .log(`{bold}About{/bold} about`, () => {
            pick();
          });
      } else if (cmd === "quit") {
        screen.destroy();
      }
    });
  pick();
  screen.render();
};
