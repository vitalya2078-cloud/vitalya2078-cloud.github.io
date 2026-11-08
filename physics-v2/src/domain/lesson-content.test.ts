import { describe, expect, it } from 'vitest';
import {
  validateLessonBlocks,
  validateLessonForPublication,
} from './lesson-content';

const validBlocks = [
  {
    id: 'block-intro',
    blockType: 'introduction',
    title: 'Введение',
    sortOrder: 0,
    isOptional: false,
    content: {
      lead: 'Почему тело продолжает двигаться?',
      body: 'Разберём связь движения и взаимодействия тел.',
    },
  },
  {
    id: 'block-formula',
    blockType: 'formula',
    title: 'Основная формула',
    sortOrder: 1,
    isOptional: false,
    content: {
      latex: 'F = ma',
      variables: [
        { symbol: 'F', name: 'Сила', unit: 'Н' },
        { symbol: 'm', name: 'Масса', unit: 'кг' },
        { symbol: 'a', name: 'Ускорение', unit: 'м/с²' },
      ],
      conditions: ['Инерциальная система отсчёта'],
    },
  },
];

describe('lesson content validation', () => {
  it('accepts well-formed lesson blocks', () => {
    expect(validateLessonBlocks(validBlocks)).toEqual([]);
  });

  it('requires units and applicability conditions for formulas', () => {
    const blocks = [
      validBlocks[0],
      {
        ...validBlocks[1],
        content: {
          latex: 'F = ma',
          variables: [{ symbol: 'F', name: 'Сила', unit: '' }],
          conditions: [],
        },
      },
    ];

    const issues = validateLessonBlocks(blocks);
    expect(issues.some((issue) => issue.path.endsWith('.variables'))).toBe(true);
    expect(issues.some((issue) => issue.path.endsWith('.conditions'))).toBe(true);
  });

  it('requires alt text for illustrations', () => {
    const issues = validateLessonBlocks([
      validBlocks[0],
      {
        id: 'block-image',
        blockType: 'illustration',
        sortOrder: 1,
        isOptional: true,
        content: { assetId: 'asset-1', caption: 'Схема движения' },
      },
    ]);

    expect(issues).toContainEqual({
      path: 'blocks[1].alt',
      message: 'A non-empty string is required.',
    });
  });

  it('requires explicit safety notes and supervision for teacher demonstrations', () => {
    const issues = validateLessonBlocks([
      validBlocks[0],
      {
        id: 'block-experiment',
        blockType: 'experiment',
        sortOrder: 1,
        isOptional: false,
        content: {
          objective: 'Наблюдать зависимость периода колебаний',
          equipment: ['Учебный маятник'],
          steps: ['Провести измерения по плану учителя'],
          safetyNotes: [],
          safetyClass: 'teacher_demonstration',
          teacherSupervisionRequired: false,
        },
      },
    ]);

    expect(issues.some((issue) => issue.path.endsWith('.safetyNotes'))).toBe(true);
    expect(issues.some((issue) => issue.path.endsWith('.teacherSupervisionRequired'))).toBe(true);
  });

  it('rejects duplicate IDs and sort orders', () => {
    const issues = validateLessonBlocks([
      validBlocks[0],
      { ...validBlocks[1], id: 'block-intro', sortOrder: 0 },
    ]);

    expect(issues.some((issue) => issue.message.includes('IDs must be unique'))).toBe(true);
    expect(issues.some((issue) => issue.message.includes('Sort order values must be unique'))).toBe(true);
  });

  it('requires sources, measurable outcomes and three review gates before publication', () => {
    const issues = validateLessonForPublication({
      title: 'Законы Ньютона',
      summary: 'Краткое описание урока о причинах изменения движения тел.',
      estimatedMinutes: 35,
      learningOutcomes: ['Объяснить связь равнодействующей силы и ускорения'],
      sourceReferences: [],
      review: {
        physicsReviewed: true,
        pedagogyReviewed: false,
        rightsReviewed: true,
      },
      blocks: validBlocks,
    });

    expect(issues.some((issue) => issue.path === 'sourceReferences')).toBe(true);
    expect(issues.some((issue) => issue.path === 'review.pedagogyReviewed')).toBe(true);
  });
});
