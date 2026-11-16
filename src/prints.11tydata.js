// The Prints page is only published when "prints.enabled" is true in site settings.
export default {
  eleventyComputed: {
    permalink: (d) => (d.site.prints.enabled ? "/prints/" : false),
    eleventyExcludeFromCollections: (d) => !d.site.prints.enabled,
  },
};
