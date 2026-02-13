import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
    const posts = await getCollection('posts', ({ data }) => {
        return data.draft !== true;
    });

    const sortedPosts = posts.sort((a, b) =>
        b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
    );

    return rss({
        title: 'Digital Wilderness | 碎碎念',
        description: '一个结构主义的数字策展空间。探索代码与美学的边界，在无序的信息流中构建秩序。',
        site: context.site || 'https://theframe.design',
        items: sortedPosts.map((post) => ({
            title: post.data.title,
            pubDate: post.data.pubDate,
            description: post.data.description,
            link: `/journal/${post.id}/`,
            categories: post.data.tags || [],
        })),
        customData: `<language>zh-CN</language>`,
    });
}
