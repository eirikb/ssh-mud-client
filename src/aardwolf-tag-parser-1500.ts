import { Transform, TransformCallback } from "stream";

/**
 * Hi again.
 *
 * This was written _after_ 2000, but it is a worse implementation than the original one.
 * Instead of going char by char it goes line by line - but handle it only in chunks when I don't know what I'm doing.
 * What I'm trying to say is that this implementation is not perfect, since data comes in chunks, and might
 * be cut in the middle of a line. This is bothersome when working with tags.
 */

interface TagMess {
  tag: string;
  lines: string[];
}

export class AardwolfTagParser1500 extends Transform {
  emitData(lines: string[]) {
    const data = lines.filter((l) => l).join("\n");
    if (data) {
      this.emit("data", data);
    }
  }

  emitTag(tagMess: TagMess) {
    const tag = tagMess.tag;
    const data = tagMess.lines.filter((l) => l).join("\n");
    this.emit("tag", { tag, data });
  }

  override _transform(
    data: Uint8Array,
    _: BufferEncoding,
    callback: TransformCallback
  ) {
    const lines = data.toString().replace(/\r/g, "").split(/\n/);
    const buff = [];
    const tagMess: TagMess[] = [];
    let currentTag: TagMess | undefined = undefined;

    for (const line of lines) {
      if (line.startsWith("{")) {
        const i = line.indexOf("}");
        const tag = line.slice(1, i);
        this.emitTag({ tag, lines: [line.slice(i + 1)] });
      } else if (line.startsWith("<")) {
        const i = line.indexOf(">");
        const tag = line.slice(1, i).replace("START", "");
        const lines = [line.slice(i + 1)];
        if (currentTag && tag.includes(currentTag.tag)) {
          if (lines[0]) {
            currentTag.lines.push(lines[0]);
          }
          this.emitTag(currentTag);
          tagMess.pop();
          currentTag = tagMess[tagMess.length - 1];
        } else {
          currentTag = { tag, lines };
          tagMess.push(currentTag);
        }
      } else if (currentTag) {
        currentTag.lines.push(line);
      } else {
        buff.push(line);
      }
    }
    this.emitData(buff);
    callback();
  }
}
