import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const categories = [
  { name: 'ورزش', slug: 'sports' },
  { name: 'موسیقی', slug: 'music' },
  { name: 'آموزش و تقویت درسی', slug: 'academic' },
  { name: 'هنر', slug: 'art' },
  { name: 'زبان', slug: 'language' },
  { name: 'کودک', slug: 'kids' },
  { name: 'مهارت‌های حرفه‌ای', slug: 'professional' },
];

// CLAUDE.md Section 5.5: wire the extensibility mechanism end-to-end for a
// handful of categories to validate the architecture, not all of them.
const fieldDefinitions: Record<
  string,
  { fieldKey: string; label: string; type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'DATE'; required?: boolean; options?: string[]; order: number }[]
> = {
  sports: [
    {
      fieldKey: 'skill_level',
      label: 'سطح مهارت',
      type: 'SELECT',
      required: true,
      options: ['مبتدی', 'متوسط', 'پیشرفته'],
      order: 1,
    },
    { fieldKey: 'equipment', label: 'تجهیزات مورد نیاز', type: 'TEXT', order: 2 },
    {
      fieldKey: 'track',
      label: 'نوع دوره',
      type: 'SELECT',
      options: ['تفریحی', 'رقابتی'],
      order: 3,
    },
  ],
  music: [
    { fieldKey: 'instrument', label: 'ساز', type: 'TEXT', required: true, order: 1 },
    { fieldKey: 'instrument_rental', label: 'امکان اجاره‌ی ساز', type: 'BOOLEAN', order: 2 },
  ],
  academic: [
    { fieldKey: 'textbook', label: 'کتاب/سرفصل درسی', type: 'TEXT', order: 1 },
    { fieldKey: 'target_exam_date', label: 'تاریخ آزمون هدف', type: 'DATE', order: 2 },
  ],
};

const cities = [
  { city: 'تهران', province: 'تهران' },
  { city: 'مشهد', province: 'خراسان رضوی' },
  { city: 'اصفهان', province: 'اصفهان' },
  { city: 'شیراز', province: 'فارس' },
  { city: 'تبریز', province: 'آذربایجان شرقی' },
  { city: 'کرج', province: 'البرز' },
  { city: 'اهواز', province: 'خوزستان' },
  { city: 'قم', province: 'قم' },
  { city: 'رشت', province: 'گیلان' },
  { city: 'یزد', province: 'یزد' },
];

async function main() {
  for (const category of categories) {
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });

    const defs = fieldDefinitions[category.slug] ?? [];
    for (const def of defs) {
      await prisma.categoryFieldDefinition.upsert({
        where: { categoryId_fieldKey: { categoryId: saved.id, fieldKey: def.fieldKey } },
        update: {
          label: def.label,
          type: def.type,
          required: def.required ?? false,
          options: def.options ?? [],
          order: def.order,
        },
        create: {
          categoryId: saved.id,
          fieldKey: def.fieldKey,
          label: def.label,
          type: def.type,
          required: def.required ?? false,
          options: def.options ?? [],
          order: def.order,
        },
      });
    }
  }

  for (const location of cities) {
    await prisma.location.upsert({
      where: { city_province: { city: location.city, province: location.province } },
      update: {},
      create: location,
    });
  }

  console.log(`Seeded ${categories.length} categories and ${cities.length} locations.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
