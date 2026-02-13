// Astro v5 Content Collections Configuration
// Location: src/content.config.ts (v5 recommended)
import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

// Posts/Journal Collection
const posts = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.coerce.date(),
        updatedDate: z.coerce.date().optional(),
        heroImage: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).default([]),
        featured: z.boolean().default(false),
        draft: z.boolean().default(false),
    }),
});

// Works/Projects Collection
const works = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/works' }),
    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.coerce.date(),
        heroImage: z.string().optional(),
        role: z.string().default('Product Manager'),
        outcome: z.string().optional(),
        draft: z.boolean().default(false),
    }),
});

// Signals (Short-form content)
const signals = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/signals' }),
    schema: z.object({
        pubDate: z.coerce.date(),
        tags: z.array(z.string()).default([]),
    }),
});

// Stack (Tools, Hardware, Books) - JSON data
const stack = defineCollection({
    loader: glob({ pattern: '**/*.json', base: './src/content/stack' }),
    schema: z.object({
        name: z.string(),
        type: z.enum(['Software', 'Hardware', 'Book']),
        link: z.string().url().optional(),
        comment: z.string(),
        icon: z.string().optional(),
        spineColor: z.string().optional(),
        rating: z.enum(['Must Read', 'Thought Provoking', 'Reference']).optional(),
        takeaway: z.string().optional(),
        progress: z.number().min(0).max(100).default(0),
        cover: z.string().optional(),
    }),
});

// Now Status
const now = defineCollection({
    loader: glob({ pattern: '**/*.{md,json}', base: './src/content/now' }),
    schema: z.object({
        updatedDate: z.coerce.date(),
        location: z.string().default('Digital Wilderness'),
        status: z.string().default('Online'),
        reading: z.string().optional(),
        readingProgress: z.number().min(0).max(100).default(0),
        building: z.string().optional(),
        learning: z.string().optional(),
    }),
});

// Manual (User Guide) - JSON data
const manual = defineCollection({
    loader: glob({ pattern: '**/*.json', base: './src/content/manual' }),
    schema: z.object({
        section: z.enum(['Style', 'Values', 'Weaknesses', '风格', '价值观', '弱点']),
        title: z.string(),
        content: z.string(),
        order: z.number(),
    }),
});

export const collections = { posts, works, signals, stack, now, manual };
