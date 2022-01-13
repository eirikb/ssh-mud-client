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

  override _transform(
    data: Uint8Array,
    _: BufferEncoding,
    callback: TransformCallback
  ) {
    const pad = this.buffer.length;
    let i = -1;
    for (let byte of data) {
      if (byte !== cr) {
        i++;
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

          this.buffer = this.buffer
            .slice(0, this.begin1)
            .concat(this.buffer.slice(i + pad + 1));
          this.tag = 1;
        }
      }
    }

    // If we end with single (tag 1) \n just skip the parsing
    if (this.tag === 1) this.tag = 0;

    if (this.tag === 0 && this.buffer.length > 0) {
      this.emit("data", Buffer.from(this.buffer).toString());
      this.buffer = [];
    }

    callback();
  }
}
