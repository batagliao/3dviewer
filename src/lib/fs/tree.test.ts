import { describe, it, expect } from "vitest";
import { isSupportedFile, sortNodes, filterNodes, insertChildren, toggleExpanded, visibleNodes, adjacentPath, parentPath, firstChildPath } from "./tree";

describe("tree", () => {
  it("filters to supported 3d files + dirs", () => {
    expect(isSupportedFile("a.stl")).toBe(true);
    expect(isSupportedFile("b.OBJ")).toBe(true);
    expect(isSupportedFile("c.3mf")).toBe(true);
    expect(isSupportedFile("d.txt")).toBe(false);
    expect(isSupportedFile("nodot")).toBe(false);
    const nodes = [
      { name: "b.txt", path: "/b.txt", isDir: false },
      { name: "a.stl", path: "/a.stl", isDir: false },
      { name: "dir", path: "/dir", isDir: true }
    ];
    expect(filterNodes(nodes).map((n) => n.name)).toEqual(["a.stl", "dir"]);
  });

  it("sorts dirs first then alpha", () => {
    const nodes = [
      { name: "z.stl", path: "/z.stl", isDir: false },
      { name: "adir", path: "/adir", isDir: true },
      { name: "a.stl", path: "/a.stl", isDir: false }
    ];
    expect(sortNodes(nodes).map((n) => n.name)).toEqual(["adir", "a.stl", "z.stl"]);
  });

  it("inserts children lazily and toggles", () => {
    const tree = [{ name: "d", path: "/d", isDir: true }];
    const t2 = insertChildren(tree, "/d", [
      { name: "b.stl", path: "/d/b.stl", isDir: false }
    ]);
    expect(t2[0].loaded).toBe(true);
    expect(t2[0].children?.length).toBe(1);
    const t3 = toggleExpanded(t2, "/d");
    expect(t3[0].expanded).toBe(false);
  });

  it("moves between visible rows, skipping collapsed children", () => {
    const tree = [
      {
        name: "d", path: "/d", isDir: true, loaded: true, expanded: true,
        children: [{ name: "a.stl", path: "/d/a.stl", isDir: false }]
      },
      { name: "b.stl", path: "/b.stl", isDir: false }
    ];
    expect(visibleNodes(tree).map((n) => n.path)).toEqual(["/d", "/d/a.stl", "/b.stl"]);
    expect(adjacentPath(tree, "/d", 1)).toBe("/d/a.stl");
    expect(adjacentPath(tree, "/b.stl", -1)).toBe("/d/a.stl");
    expect(adjacentPath(tree, "/b.stl", 1)).toBe(null);
    expect(adjacentPath(tree, null, 1)).toBe(null);
    const collapsed = toggleExpanded(tree, "/d");
    expect(visibleNodes(collapsed).map((n) => n.path)).toEqual(["/d", "/b.stl"]);
    expect(adjacentPath(collapsed, "/d", 1)).toBe("/b.stl");
  });

  it("finds parents and first children", () => {
    const tree = [
      {
        name: "d", path: "/d", isDir: true, loaded: true, expanded: true,
        children: [
          { name: "a.stl", path: "/d/a.stl", isDir: false },
          {
            name: "e", path: "/d/e", isDir: true, loaded: true, expanded: true,
            children: [{ name: "c.stl", path: "/d/e/c.stl", isDir: false }]
          }
        ]
      },
      { name: "b.stl", path: "/b.stl", isDir: false }
    ];
    expect(parentPath(tree, "/d/e/c.stl")).toBe("/d/e");
    expect(parentPath(tree, "/d/a.stl")).toBe("/d");
    expect(parentPath(tree, "/d")).toBe(null);
    expect(parentPath(tree, "/b.stl")).toBe(null);
    expect(parentPath(tree, "/nope")).toBe(null);
    expect(firstChildPath(tree, "/d")).toBe("/d/a.stl");
    expect(firstChildPath(tree, "/d/e")).toBe("/d/e/c.stl");
    expect(firstChildPath(tree, "/b.stl")).toBe(null);
    expect(firstChildPath(toggleExpanded(tree, "/d"), "/d")).toBe(null);
  });
});
