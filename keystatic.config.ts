import { config, fields, collection } from '@keystatic/core';

export default config({
    storage: {
        kind: 'local',
    },
    collections: {
        posts: collection({
            label: 'Posts',
            slugField: 'title',
            path: 'src/content/posts/*',
            format: { contentField: 'content' },
            schema: {
                title: fields.slug({ name: { label: 'Title' } }),
                description: fields.text({ label: 'Description', multiline: true }),
                pubDate: fields.date({ label: 'Publication Date' }),
                category: fields.text({ label: 'Category' }),
                coverImage: fields.image({
                    label: 'Cover Image',
                    directory: 'public/images/posts',
                    publicPath: '/images/posts/',
                }),
                content: fields.document({
                    label: 'Content',
                    formatting: true,
                    dividers: true,
                    links: true,
                    images: {
                        directory: 'public/images/posts',
                        publicPath: '/images/posts/',
                    },
                }),
            },
        }),
    },
});
