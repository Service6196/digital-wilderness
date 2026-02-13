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
        works: collection({
            label: 'Works (Portfolio)',
            slugField: 'title',
            path: 'src/content/works/*',
            format: { contentField: 'content' },
            schema: {
                title: fields.slug({ name: { label: 'Project Name' } }),
                description: fields.text({ label: 'Short Description', multiline: true }),
                pubDate: fields.date({ label: 'Date' }),
                role: fields.text({ label: 'My Role' }),
                outcome: fields.text({ label: 'Key Outcome' }),
                heroImage: fields.image({
                    label: 'Hero Image',
                    directory: 'public/images/works',
                    publicPath: '/images/works/',
                }),
                content: fields.document({
                    label: 'Case Study Content',
                    formatting: true,
                    dividers: true,
                    links: true,
                    images: { directory: 'public/images/works', publicPath: '/images/works/' },
                }),
            },
        }),
        signals: collection({
            label: 'Signals (Memos)',
            slugField: 'pubDate',
            path: 'src/content/signals/*',
            format: { contentField: 'content' },
            schema: {
                pubDate: fields.slug({ name: { label: 'Date (YYYY-MM-DD)' } }),
                tags: fields.array(fields.text({ label: 'Tag' }), { label: 'Tags' }),
                content: fields.document({
                    label: 'Thought',
                    formatting: { inlineMarks: true, listTypes: true }, // Simple formatting for memos
                }),
            },
        }),
        stack: collection({
            label: 'Stack (Tools)',
            slugField: 'name',
            path: 'src/content/stack/*',
            schema: {
                name: fields.slug({ name: { label: 'Tool Name' } }),
                type: fields.select({
                    label: 'Type',
                    options: [
                        { label: 'Software', value: 'Software' },
                        { label: 'Hardware', value: 'Hardware' },
                        { label: 'Book', value: 'Book' },
                    ],
                    defaultValue: 'Software',
                }),
                link: fields.url({ label: 'Link' }),
                comment: fields.text({ label: 'Why I use it' }),
                icon: fields.text({ label: 'Lucide Icon Name' }),
            },
        }),
        now: collection({
            label: 'Now (Status)',
            slugField: 'updatedDate',
            path: 'src/content/now/*',
            schema: {
                updatedDate: fields.slug({ name: { label: 'Update Date' } }),
                location: fields.text({ label: 'Current Location', defaultValue: 'Digital Wilderness' }),
                status: fields.text({ label: 'Status', defaultValue: 'Online' }),
                reading: fields.text({ label: 'Reading' }),
                readingProgress: fields.number({ label: 'Progress (%)', validation: { min: 0, max: 100 } }),
                building: fields.text({ label: 'Building' }),
                learning: fields.text({ label: 'Learning' }),
            },
        }),
    },
});
