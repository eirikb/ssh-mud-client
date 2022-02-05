import * as blessed from "neo-blessed";
import { Widgets } from "neo-blessed";
import BoxElement = Widgets.BoxElement;
import Screen = Widgets.Screen;
import TextElement = Widgets.TextElement;

interface Promptly {
  password(enable: boolean): void;

  prompt(): void;

  prePrompt: TextElement;
}

interface PromptlyOptions extends Widgets.BoxOptions {
  commands: string[];
  screen: Screen;
  main: BoxElement;
  debug?: BoxElement;
  client: Client;
}

export const createPrompt = (
  options: PromptlyOptions
): BoxElement & Promptly => {
  const commandsLowerCase = options.commands.map((c) => c.toLowerCase());
  const { screen, main, debug, client } = options;

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

  const history: string[] = [];
  let historyPos = 0;

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
        return;
      }
    }

    prompt.value = q;
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
              screen.destroy();
              client.end();
            } else if (cmd === "help") {
              main.pushLine("Help herp derp no time to write such things");
            } else if (cmd === "screen") {
              debug?.pushLine(
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
            prompt.emit("command", {
              password: prompt.secret,
              command: value,
            });
          }
        } else {
          prompt.emit("command", { password: prompt.secret, command: value });
        }
      }
      prompt.value = "";
      p();
    });
  };

  return Object.assign(prompt, {
    prompt: p,
    prePrompt,
    password(enable: boolean) {
      if (enable) {
        prompt.left = 11;
        prePrompt.width = 10;
        prePrompt.setText("(Password)");
        prompt.secret = true;
        prompt.value = "";
      } else {
        prompt.secret = false;
        prompt.value = "";
        prompt.left = 2;
        prePrompt.width = 1;
        prePrompt.setText(">");
      }
    },
  });
};
