import test from "ava";

import { AardwolfTagParser2000 } from "../aardwolf-tag-parser-2000";

function run(input: string) {
  const data: string[] = [];
  const tags: { tag: string; data: string }[] = [];
  const p = new AardwolfTagParser2000();
  p.on("data", (d) => data.push(d));
  p.on("tag", (t) => tags.push(t));
  p.write(input);
  return { data, tags };
}

test("Beginning of chunk", (t: any) => {
  const res = run("{hello}world\n");
  console.log(res.data);
  t.is(res.data.length, 0);
  t.deepEqual(res.tags, [
    {
      tag: "hello",
      data: "world",
    },
  ]);
});

test("Beginning of chunk with data", (t: any) => {
  const res = run("{hello}world\nwith data");
  t.deepEqual(res.data, ["with data"]);
  t.deepEqual(res.tags, [
    {
      tag: "hello",
      data: "world",
    },
  ]);
});

test("Beginning of line", (t: any) => {
  const res = run("with\n{hello}world\ndata");
  t.deepEqual(res.data, ["with\ndata"]);
  t.deepEqual(res.tags, [
    {
      tag: "hello",
      data: "world",
    },
  ]);
});

test("NOT unless beginning of chunk or line", (t: any) => {
  const res = run("with\ne{hello world}\n");
  t.deepEqual(res.data, ["with\ne{hello world}\n"]);
  t.is(res.tags.length, 0);
});

test("<> as well of chunk or line", (t: any) => {
  const res = run("hello\n<hello>world\n");
  t.deepEqual(res.data, ["hello\n"]);
  t.deepEqual(res.tags, [
    {
      tag: "hello",
      data: "world",
    },
  ]);
});
