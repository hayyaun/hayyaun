/** r3f-perf maps this JS module to binary WOFF data; Turbopack cannot decode it. */
module.exports = function perfFont(source) {
  return source.replace(/^\/\/[#@]\s*sourceMappingURL=.*$/gm, "");
};
