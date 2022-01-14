import { Widgets } from "neo-blessed";
import * as blessed from "neo-blessed";

interface TabishOptions extends Widgets.BoxOptions {
  tabs: string[];
}

interface Tabish extends Widgets.BoxElement {
  selectTab(index: number): void;
}

export const createTabish = (options: TabishOptions): Tabish => {
  const tabs: Widgets.TextElement[] = [];

  const w = 10;
  const children: any = [];
  for (let i = 0; i < options.tabs.length; i++) {
    tabs[i] = blessed.text({
      left: w * 2 * i,
      width: w,
      content: options.tabs[i],
    });
    children.push(tabs[i], blessed.box({ width: w, left: w + w * 2 * i }));
  }
  children.push(
    blessed.text({
      right: 2,
      width: `v${process.env["npm_package_version"]}`.length,
      content: `v${process.env["npm_package_version"]}`,
    })
  );
  const box = blessed.box({ ...options, ...{ children } });

  const res = Object.assign(box, {
    selectTab(index: number) {
      const tab = tabs[index];
      if (tab) {
        tabs.forEach(
          (tab: Widgets.BoxElement) =>
            (tab.style = {
              inverse: false,
            })
        );
        tab.style = {
          inverse: true,
        };
      }
    },
  });
  res.selectTab(0);
  return res;
};
