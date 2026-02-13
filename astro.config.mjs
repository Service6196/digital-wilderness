import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';

// https://astro.build/config
export default defineConfig({
  site: 'https://theframe.design',
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  markdown: {
    rehypePlugins: [
      rehypeSlug,
      [rehypeAutolinkHeadings, { behavior: 'wrap' }],
    ],
  },
  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    react(),
    keystatic(),
    sitemap({
      filter: (page) => !page.includes('/keystatic'),
    }),
  ]
});
