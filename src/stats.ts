import * as blessed from "neo-blessed";
import { Widgets } from "neo-blessed";
import BoxElement = Widgets.BoxElement;
import BoxOptions = Widgets.BoxOptions;
import TextElement = Widgets.TextElement;

interface Stats {
  setStat(name: string, value: number): void;

  setMaxStat(name: string, max: number): void;
}

export const createStats = (options: BoxOptions): BoxElement & Stats => {
  const box = blessed.box({
    ...options,
  });

  const statElement: { [name: string]: TextElement } = {};
  const statValue: { [name: string]: { value: number; max: number } } = {};

  function updateStat(name: string) {
    const val = statValue[name];
    if (val) {
      const { value, max } = val;
      let element = statElement[name];
      if (!element) {
        element = blessed.text({
          parent: box,
          top: Object.keys(statElement).length,
          left: 0,
          // width: "100%",
          height: 1,
          tags: true,
        });
        statElement[name] = element;
      }
      const gold = name === "gold";
      element.setContent(
        `${name}{|}{bold}${gold ? "{yellow-fg}" : ""}${value}${
          gold ? "{/yellow-fg}" : ""
        }{/bold}${max > 0 ? "/" + max : ""}`
      );
    }
  }

  return Object.assign(box, {
    setStat(name: string, value: number) {
      statValue[name] = statValue[name] || { value: 0, max: 0 };
      statValue[name]!.value = value;
      updateStat(name);
    },
    setMaxStat(name: string, max: number) {
      statValue[name] = statValue[name] || { value: 0, max: 0 };
      statValue[name]!.max = max;
      updateStat(name);
    },
  });
};
