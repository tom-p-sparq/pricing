export default function(eleventyConfig) {
  const pathPrefix = process.env.PATHPREFIX ?? "/";

  eleventyConfig.addPassthroughCopy("pages/style.css");
  eleventyConfig.addPassthroughCopy("pages/*.js");

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
