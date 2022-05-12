const { DateTime } = require("luxon");
const CleanCSS = require("clean-css");
const UglifyJS = require("uglify-js");
const htmlmin = require("html-minifier");
const eleventyNavigationPlugin = require("@11ty/eleventy-navigation");

const Image = require("@11ty/eleventy-img");
const path = require("path");

const PhotoswipeJS = require.resolve("photoswipe");
const PhotoswipeCSS = require.resolve("photoswipe/photoswipe.css");

async function imageShortcode(src, cls, alt) {
    if(alt === undefined) {
        throw new Error(`Missing \`alt\` on myImage from: ${src}`);
      }
      
    let metadata = await Image(src, {
      widths: [500, 750, 1000, 1250, 1500],
      formats: ['jpeg'],
      urlPath: "../../static/img/sizes",
      outputDir: "./static/img/sizes"
    });

    // get metadata even the images are not fully generated
    let src500 = metadata.jpeg[0];
    let src750 = metadata.jpeg[1];
    let src1000 = metadata.jpeg[2];
    let src1250 = metadata.jpeg[3];
    let data = metadata.jpeg[metadata.jpeg.length - 1];
    return `<a class="post__gallery-image" href="${data.url}" 
            data-pswp-width="${data.width}" 
            data-pswp-height="${data.height}"
            data-pswp-srcset="${src500.url} 500w, ${src750.url} 750w, ${src1000.url} 1000w, ${src1250.url} 1250w" target="_blank">
            <img srcset="${src500.url} 500w, ${src750.url} 750w, ${src1000.url} 1000w, ${src1250.url} 1250w" class="${cls}" sizes="100vw" width="${data.width}" height="${data.height}" alt="${alt}" loading="lazy" decoding="async">
            </a>`;
  }

module.exports = function(eleventyConfig) {

  // Eleventy Navigation https://www.11ty.dev/docs/plugins/navigation/
  eleventyConfig.addPlugin(eleventyNavigationPlugin);

  // Configuration API: use eleventyConfig.addLayoutAlias(from, to) to add
  // layout aliases! Say you have a bunch of existing content using
  // layout: post. If you don’t want to rewrite all of those values, just map
  // post to a new file like this:
  // eleventyConfig.addLayoutAlias("post", "layouts/my_new_post_layout.njk");

  // Merge data instead of overriding
  // https://www.11ty.dev/docs/data-deep-merge/
  eleventyConfig.setDataDeepMerge(true);

  // Add support for maintenance-free post authors
  // Adds an authors collection using the author key in our post frontmatter
  // Thanks to @pdehaan: https://github.com/pdehaan
  eleventyConfig.addCollection("authors", collection => {
    const blogs = collection.getFilteredByGlob("posts/*.md");
    return blogs.reduce((coll, post) => {
      const author = post.data.author;
      if (!author) {
        return coll;
      }
      if (!coll.hasOwnProperty(author)) {
        coll[author] = [];
      }
      coll[author].push(post.data);
      return coll;
    }, {});
  });

  // Date formatting (human readable)
  eleventyConfig.addFilter("readableDate", dateObj => {
    return DateTime.fromJSDate(dateObj).toFormat("dd LLL yyyy");
  });

  // Date formatting (machine readable)
  eleventyConfig.addFilter("machineDate", dateObj => {
    return DateTime.fromJSDate(dateObj).toFormat("yyyy-MM-dd");
  });

  // Minify CSS
  eleventyConfig.addFilter("cssmin", function(code) {
    return new CleanCSS({}).minify(code).styles;
  });

  // Minify JS
  eleventyConfig.addFilter("jsmin", function(code) {
    let minified = UglifyJS.minify(code);
    if (minified.error) {
      console.log("UglifyJS error: ", minified.error);
      return code;
    }
    return minified.code;
  });

  // Minify HTML output
  eleventyConfig.addTransform("htmlmin", function(content, outputPath) {
    if (outputPath.indexOf(".html") > -1) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true
      });
      return minified;
    }
    return content;
  });

  // Don't process folders with static assets e.g. images
  eleventyConfig.addPassthroughCopy("favicon.ico");
  eleventyConfig.addPassthroughCopy("static/img");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("_includes/assets/css/inline.css");
  eleventyConfig.addPassthroughCopy("_includes/assets/css/variables.css");
  eleventyConfig.addPassthroughCopy({[PhotoswipeJS]: "_includes/assets/js/photoswipe.esm.min.js"});
  eleventyConfig.addPassthroughCopy({[PhotoswipeCSS]: "_includes/assets/css/photoswipe.css"});

  /* Markdown Plugins */
  let markdownIt = require("markdown-it");
  let markdownItAnchor = require("markdown-it-anchor");
  let options = {
    html: true,
    breaks: true,
    linkify: true
  };
  let opts = {
    permalink: false
  };

  eleventyConfig.setLibrary("md", markdownIt(options)
    .use(markdownItAnchor, opts)
  );

  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);
  
  eleventyConfig.addNunjucksAsyncShortcode("image", imageShortcode);
  eleventyConfig.addLiquidShortcode("image", imageShortcode);
  eleventyConfig.addJavaScriptFunction("image", imageShortcode);

  return {
    templateFormats: ["md", "njk", "html", "liquid"],

    // If your site lives in a different subdirectory, change this.
    // Leading or trailing slashes are all normalized away, so don’t worry about it.
    // If you don’t have a subdirectory, use "" or "/" (they do the same thing)
    // This is only used for URLs (it does not affect your file structure)
    pathPrefix: "/",

    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site"
    }
  };
};
