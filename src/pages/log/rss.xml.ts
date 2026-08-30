import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context: { site: URL }) {
  const entries = (await getCollection('logs', ({ data }) => !data.draft))
    .sort((a, b) => b.data.publishedAt.valueOf() - a.data.publishedAt.valueOf());
  return rss({
    title: 'Pratyush Kiran — Daily Log',
    description: 'A curated journal about engineering, learning, life, and electronics.',
    site: context.site,
    items: entries.map((entry) => ({ title: entry.data.title, description: entry.data.summary, pubDate: entry.data.publishedAt, link: `/log/${entry.id}/` })),
  });
}
