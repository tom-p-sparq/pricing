import fs from "fs";
import path from "path";

export default function(eleventyConfig) {
  const pathPrefix = process.env.PATHPREFIX ?? "/";

  eleventyConfig.addPassthroughCopy("pages/style.css");
  eleventyConfig.addPassthroughCopy({ "pricing-core": "pricing-core" });

  // Co-locate each page's companion JS into its output folder as script.js
  const passthroughMap = {};
  fs.readdirSync("pages")
    .filter(f => /^\d\d-.*\.js$/.test(f))
    .forEach(f => {
      const slug = path.basename(f, ".js");
      passthroughMap[`pages/${f}`] = `${slug}/script.js`;
    });
  eleventyConfig.addPassthroughCopy(passthroughMap);

  // Rewrite root-relative href/src attributes to include the path prefix,
  // so the site works correctly when served from a subdirectory on GitHub Pages.
  if (pathPrefix !== "/") {
    eleventyConfig.addTransform("prefix-urls", function(content) {
      if ((this.page?.outputPath ?? "").endsWith(".html")) {
        return content.replace(
          / (href|src)="(?!\/\/)\/([^"]*?)"/g,
          ` $1="${pathPrefix}$2"`
        );
      }
      return content;
    });
  }

  return {
    pathPrefix,
    dir: {
      input: "pages",
      layouts: "_layouts",
      output: "_site",
    }
  };
}
