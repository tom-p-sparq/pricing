export default function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("pages/style.css");
  eleventyConfig.addPassthroughCopy("pages/*.js");

  return {
    dir: {
      input: "pages",
      layouts: "_layouts",
      output: "_site",
    }
  };
}
