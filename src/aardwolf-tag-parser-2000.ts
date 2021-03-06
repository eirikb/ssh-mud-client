import { Transform, TransformCallback } from "stream";

/**
 * Hi.
 * What you see here might not look pretty, because it's not.
 *
 * Parsing output from a MUD turned out to be pretty complicated.
 * At first, I tried parsing line by line.
 * But it turns out MUDs often don't send a newline on prompt.
 * And data is sent in chunks, meaning you might not see the full output yet.
 * In other words it is impossible to know when the data has ended,
 * without detecting the prompt, but that's hard since the prompt can be user defined.
 *
 * Notes on approaches:
 *   * Aardwolf allows disabling prompt. This makes newline parsing possible,
 *     but the prompt can include additional information, and it can't be queried over GMCP.
 *   * Aardwolf allows setting a custom prompt, so one could force the prompt to end with a newline.
 *     This could work, but there are different types of prompts, e.g., paging.
 *     And I don't want to force this on users.
 *
 *  What I have done instead:
 *    * Deal with the data as a stream of bytes, and spit that out to the user.
 *    * Search for Aardwolf tags, such as <> and {} on this basis:
 *      ** If { or < starts the chunk it is a tag. It could not be, as it could be in a chat,
 *         but very unlikely.
 *      ** If \n is followed by { or < it is a tag
 *      ** If the tag has data between } or > and \n that is tag data.
 *      ** If a tag has tag data, unless it is called "bigmap", it ends.
 *      ** Tags without data don't end until their corresponding tag.
 */

const cr = "\r".charCodeAt(0);
const lf = "\n".charCodeAt(0);
const a = "<".charCodeAt(0);
const b = "{".charCodeAt(0);
const a2 = ">".charCodeAt(0);
const b2 = "}".charCodeAt(0);
const slash = "/".charCodeAt(0);

export class AardwolfTagParser2000 extends Transform {
  private tag = 0;
  private begin1 = 0;
  private begin2 = 0;

  private buffer: number[] = [];

  private tagStart:
    | {
        begin: number;
        end: number;
        data: number[];
        tag: number[];
        isBloodyMap: boolean;
      }
    | undefined;

  emitData(data: number[]) {
    this.emit("data", Buffer.from(data).toString());
  }

  emitTag(tag: number[], data: number[]) {
    this.emit("tag", {
      tag: Buffer.from(tag).toString(),
      data: Buffer.from(data).toString(),
    });
  }

  override _transform(
    data: Uint8Array,
    _: BufferEncoding,
    callback: TransformCallback
  ) {
    for (let byte of data) {
      // Buzz off CR
      if (byte !== cr) {
        this.buffer.push(byte || 0);
        const i = this.buffer.length - 1;
        if (byte === lf && this.tag === 3) {
          this.tag = 4;
        } else if (i === 0 && (byte === a || byte === b)) {
          this.begin1 = i;
          this.tag = 2;
        } else if (this.tagStart && (byte === a || byte === b)) {
          this.begin1 = i + 1;
          this.tag = 2;
        } else if (byte === lf) {
          this.tag = 1;
        } else if (this.tag === 1 && (byte === a || byte === b)) {
          this.begin1 = i;
          this.tag = 2;
        } else if (this.tag === 2 && (byte === a2 || byte === b2)) {
          this.begin2 = i;
          this.tag = 3;
        } else if (this.tag === 1) {
          this.tag = 0;
        }

        if (this.tag === 4) {
          const t = this.buffer.slice(this.begin1 + 1, this.begin2);
          let d = this.buffer.slice(this.begin2 + 1, i);

          // Ugh
          if (d.length === 1 && d[0] === lf) {
            d = [];
          }

          if (this.tagStart) {
            let doit = true;

            if (this.tagStart.isBloodyMap) {
              doit = Buffer.from(t).toString().endsWith("APEND");
            }

            if (doit) {
              d = this.buffer.slice(this.tagStart.end + 1, this.begin1 - 1);
              this.emitTag(this.tagStart.tag, d);

              this.buffer = this.buffer
                .slice(0, this.tagStart.begin)
                .concat(this.buffer.slice(i + 1));
              this.tag = 1;
              this.tagStart = undefined;
            }
          } else if (d.length > 0 || t[0] === slash) {
            this.emitTag(t, d);

            this.buffer = this.buffer
              .slice(0, this.begin1)
              .concat(this.buffer.slice(i + 1));
            this.tag = 1;
          } else {
            const isBloodyMap = Buffer.from(t).toString() === "MAPSTART";
            this.tagStart = {
              begin: this.begin1,
              tag: t,
              data: d,
              end: i,
              isBloodyMap,
            };
            this.tag = 1;
          }
        }
      }
    }

    // If we end with single (tag 1) \n just skip the parsing
    if (this.tag === 1) this.tag = 0;

    if (this.tag === 0 && this.buffer.length > 0 && !this.tagStart) {
      this.emitData(this.buffer);
      this.buffer = [];
    }

    callback();
  }
}
