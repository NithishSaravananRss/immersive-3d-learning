if (!("global" in globalThis)) {
  Object.defineProperty(globalThis, "global", {
    configurable: true,
    value: globalThis,
    writable: true
  });
}
