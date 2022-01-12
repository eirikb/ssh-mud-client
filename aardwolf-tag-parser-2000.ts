import { Transform, TransformCallback } from "stream";

const cr = "\r".charCodeAt(0);
const lf = "\n".charCodeAt(0);
const a = "<".charCodeAt(0);
const b = "{".charCodeAt(0);
const a2 = ">".charCodeAt(0);
const b2 = "}".charCodeAt(0);

export class AardwolfTagParser2000 extends Transform {
  private tag = 0;
  private begin1 = 0;
  private begin2 = 0;

  private buffer: number[] = [];

  // private tagName: string = "";

  override _transform(
    data: Uint8Array,
    _: BufferEncoding,
    callback: TransformCallback
  ) {
    data = data.filter((byte) => byte !== cr);

    const pad = this.buffer.length;
    for (let i = 0; i < data.length; i++) {
      const byte = data[i];
      this.buffer.push(byte || 0);
      if (byte === lf && this.tag === 3) {
        this.tag = 4;
      } else if (i === 0 && (byte === a || byte === b)) {
        this.begin1 = i + pad;
        this.tag = 2;
      } else if (byte === lf) {
        this.tag = 1;
      } else if (this.tag === 1 && (byte === a || byte === b)) {
        this.begin1 = i + pad;
        this.tag = 2;
      } else if (this.tag === 2 && (byte === a2 || byte === b2)) {
        this.begin2 = i + pad;
        this.tag = 3;
      } else if (this.tag === 1) {
        this.tag = 0;
      }

      if (this.tag === 4) {
        const t = Buffer.from(this.buffer)
          .slice(this.begin1 + 1, this.begin2)
          .toString();
        const d = Buffer.from(this.buffer)
          .slice(this.begin2 + 1, i + pad)
          .toString();
        this.emit("tag", { tag: t, data: d });
        this.tag = 1;
      }
    }

    if (this.tag === 0) {
      this.emit("data", Buffer.from(this.buffer));
      this.buffer = [];
    }

    callback();
  }
}
