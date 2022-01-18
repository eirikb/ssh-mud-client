import * as blessed from "neo-blessed";
import { Widgets } from "neo-blessed";
import BoxElement = Widgets.BoxElement;

interface BarusOptions extends Widgets.BoxOptions {
  name: string;
  color: string;
  current: number;
  max: number;
}

interface Barus {
  setMax(max: number): void;

  setCurrent(current: number): void;
}

export const createBarus = (options: BarusOptions): BoxElement & Barus => {
  const box = blessed.box({
    width: options.width,
    height: 1,
    ...options,
  });

  const label = blessed.text({
    parent: box,
    height: 1,
  });
  const pb = blessed.progressbar({
    parent: box,
    style: {
      bar: {
        fg: options.color,
      },
    },
    ch: "|",
    height: 1,
    top: 0,
  });

  function update() {
    if (options.max > 0) {
      label.setContent(`${options.name} (${options.current}/${options.max}) `);
      (pb as any).filled = (options.current / options.max) * 100;
    } else {
      label.setContent("");
      (pb as any).filled = 0;
    }
    label.width = label.content.length;
    pb.width = Number(options.width) - label.content.length - 2;
    pb.left = label.content.length;
  }

  update();

  return Object.assign(box, {
    setMax(max: number) {
      options.max = max;
      update();
    },
    setCurrent(current: number) {
      options.current = current;
      update();
    },
  });
};
