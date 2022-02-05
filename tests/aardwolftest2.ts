import test from "ava";

import { AardwolfTagParser1500 } from "../src/aardwolf-tag-parser-1500";
import * as fs from "fs";

function run(input: string) {
  const data: string[] = [];
  const tags: { tag: string; data: string }[] = [];
  const p = new AardwolfTagParser1500();
  p.on("data", (d) => data.push(d));
  p.on("tag", (t) => tags.push(t));
  p.write(input);
  return { data, tags };
}

test("this is the way", (t: any) => {
  const files = fs
    .readdirSync(".")
    .filter((f) => f.startsWith("out-"))
    .sort((a, b) => parseInt(a.split("-")[1]!!) - parseInt(b.split("-")[1]!!));

  const p = new AardwolfTagParser1500();
  p.on("data", (d) => console.log("data", d));
  p.on("tag", (t) => console.log("tag", t));
  for (const file of files) {
    console.log(file);
    const data = fs.readFileSync(file).toString().replace(/\r/g, "");
    p.write(data);
  }
  t.pass();
});

test("No CR", (t: any) => {
  const res = run("hello\n\rworld\n");
  t.deepEqual(res.data, ["hello\nworld"]);
});

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
  t.deepEqual(res.data, ["with\ne{hello world}"]);
  t.is(res.tags.length, 0);
});

test("<> as well of chunk or line", (t: any) => {
  const res = run("hello\n<hello>world\n</hello>");
  t.deepEqual(res.data, ["hello"]);
  t.deepEqual(res.tags, [
    {
      tag: "hello",
      data: "world",
    },
  ]);
});

test("data over several lines", (t: any) => {
  const res = run("with\n<hello>\nworld\n</hello>\ndata");
  t.deepEqual(res.data, ["with\ndata"]);
  t.deepEqual(res.tags, [
    {
      tag: "hello",
      data: "world",
    },
  ]);
});

test("map is problematic", (t: any) => {
  const res = run("with\n<MAPSTART>\nworld\n<MAPEND>\ndata");
  t.deepEqual(res.data, ["with\ndata"]);
  t.deepEqual(res.tags, [
    {
      tag: "MAP",
      data: "world",
    },
  ]);
});

// Implement later, if needed
test.skip("bigmap is different", (t: any) => {
  const res = run("with\n{bigmap}has data\nworld\n{/bigmap}\ndata");
  t.deepEqual(res.data, ["with\ndata"]);
  t.deepEqual(res.tags, [
    {
      tag: "bigmap",
      data: "has data\nworld",
    },
  ]);
});
