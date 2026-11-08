export type LessonBlockType =
  | 'introduction'
  | 'intuition'
  | 'concept'
  | 'law'
  | 'formula'
  | 'worked_example'
  | 'illustration'
  | 'simulation'
  | 'experiment'
  | 'practice'
  | 'summary'
  | 'extension'
  | 'other';

export interface LessonBlockInput {
  id: string;
  blockType: LessonBlockType;
  title?: string;
  content: unknown;
  sortOrder: number;
  isOptional: boolean;
}

export interface LessonReviewState {
  physicsReviewed: boolean;
  pedagogyReviewed: boolean;
  rightsReviewed: boolean;
}

export interface LessonPublicationInput {
  title: string;
  summary: string;
  estimatedMinutes: number;
  learningOutcomes: string[];
  sourceReferences: string[];
  review: LessonReviewState;
  blocks: unknown;
}

export interface LessonValidationIssue {
  path: string;
  message: string;
}

const blockTypes = new Set<LessonBlockType>([
  'introduction',
  'intuition',
  'concept',
  'law',
  'formula',
  'worked_example',
  'illustration',
  'simulation',
  'experiment',
  'practice',
  'summary',
  'extension',
  'other',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasStringArray(value: unknown, minimum = 1): value is string[] {
  return Array.isArray(value)
    && value.length >= minimum
    && value.every(isNonEmptyString);
}

function addRequiredStringIssue(
  content: Record<string, unknown>,
  key: string,
  path: string,
  issues: LessonValidationIssue[],
): void {
  if (!isNonEmptyString(content[key])) {
    issues.push({ path: `${path}.${key}`, message: 'A non-empty string is required.' });
  }
}

function validateBlockContent(
  blockType: LessonBlockType,
  contentValue: unknown,
  path: string,
  issues: LessonValidationIssue[],
): void {
  if (!isRecord(contentValue)) {
    issues.push({ path: `${path}.content`, message: 'Content must be an object.' });
    return;
  }

  const content = contentValue;

  switch (blockType) {
    case 'introduction':
      addRequiredStringIssue(content, 'lead', path, issues);
      addRequiredStringIssue(content, 'body', path, issues);
      break;

    case 'intuition':
      addRequiredStringIssue(content, 'analogy', path, issues);
      addRequiredStringIssue(content, 'explanation', path, issues);
      break;

    case 'concept':
      addRequiredStringIssue(content, 'term', path, issues);
      addRequiredStringIssue(content, 'definition', path, issues);
      break;

    case 'law':
      addRequiredStringIssue(content, 'name', path, issues);
      addRequiredStringIssue(content, 'statement', path, issues);
      if (!hasStringArray(content.conditions)) {
        issues.push({
          path: `${path}.content.conditions`,
          message: 'At least one condition of applicability is required.',
        });
      }
      break;

    case 'formula':
      addRequiredStringIssue(content, 'latex', path, issues);
      if (
        !Array.isArray(content.variables)
        || content.variables.length === 0
        || !content.variables.every((variable) => (
          isRecord(variable)
          && isNonEmptyString(variable.symbol)
          && isNonEmptyString(variable.name)
          && isNonEmptyString(variable.unit)
        ))
      ) {
        issues.push({
          path: `${path}.content.variables`,
          message: 'Every formula variable needs a symbol, name, and SI unit.',
        });
      }
      if (!hasStringArray(content.conditions)) {
        issues.push({
          path: `${path}.content.conditions`,
          message: 'Formula applicability conditions are required.',
        });
      }
      break;

    case 'worked_example':
      addRequiredStringIssue(content, 'problem', path, issues);
      addRequiredStringIssue(content, 'find', path, issues);
      addRequiredStringIssue(content, 'answer', path, issues);
      if (
        !Array.isArray(content.steps)
        || content.steps.length < 2
        || !content.steps.every((step) => (
          isRecord(step)
          && isNonEmptyString(step.explanation)
        ))
      ) {
        issues.push({
          path: `${path}.content.steps`,
          message: 'A worked example needs at least two explained solution steps.',
        });
      }
      break;

    case 'illustration':
      addRequiredStringIssue(content, 'assetId', path, issues);
      addRequiredStringIssue(content, 'alt', path, issues);
      addRequiredStringIssue(content, 'caption', path, issues);
      break;

    case 'simulation':
      addRequiredStringIssue(content, 'objective', path, issues);
      addRequiredStringIssue(content, 'description', path, issues);
      if (!isRecord(content.config)) {
        issues.push({
          path: `${path}.content.config`,
          message: 'Simulation configuration must be an object.',
        });
      }
      if (!hasStringArray(content.controls)) {
        issues.push({
          path: `${path}.content.controls`,
          message: 'List the available simulation controls.',
        });
      }
      if (!hasStringArray(content.expectedObservations)) {
        issues.push({
          path: `${path}.content.expectedObservations`,
          message: 'List the observations learners should investigate.',
        });
      }
      break;

    case 'experiment':
      addRequiredStringIssue(content, 'objective', path, issues);
      if (!hasStringArray(content.equipment)) {
        issues.push({
          path: `${path}.content.equipment`,
          message: 'List the classroom equipment.',
        });
      }
      if (!hasStringArray(content.steps)) {
        issues.push({
          path: `${path}.content.steps`,
          message: 'A classroom experiment needs a sequence of steps.',
        });
      }
      if (!hasStringArray(content.safetyNotes)) {
        issues.push({
          path: `${path}.content.safetyNotes`,
          message: 'Safety notes are required for every experiment.',
        });
      }
      if (!['standard_classroom', 'teacher_demonstration'].includes(String(content.safetyClass))) {
        issues.push({
          path: `${path}.content.safetyClass`,
          message: 'Only standard classroom work or teacher-managed demonstration is supported.',
        });
      }
      if (
        content.safetyClass === 'teacher_demonstration'
        && content.teacherSupervisionRequired !== true
      ) {
        issues.push({
          path: `${path}.content.teacherSupervisionRequired`,
          message: 'Teacher demonstrations must explicitly require teacher supervision.',
        });
      }
      break;

    case 'practice':
      addRequiredStringIssue(content, 'instructions', path, issues);
      if (!hasStringArray(content.taskIds)) {
        issues.push({
          path: `${path}.content.taskIds`,
          message: 'At least one practice task reference is required.',
        });
      }
      if (!['basic', 'medium', 'advanced'].includes(String(content.difficulty))) {
        issues.push({
          path: `${path}.content.difficulty`,
          message: 'Difficulty must be basic, medium, or advanced.',
        });
      }
      break;

    case 'summary':
      if (!hasStringArray(content.keyPoints)) {
        issues.push({
          path: `${path}.content.keyPoints`,
          message: 'A summary needs at least one key point.',
        });
      }
      break;

    case 'extension':
    case 'other':
      addRequiredStringIssue(content, 'body', path, issues);
      break;
  }
}

export function validateLessonBlocks(value: unknown): LessonValidationIssue[] {
  const issues: LessonValidationIssue[] = [];
  if (!Array.isArray(value) || value.length < 2) {
    return [{
      path: 'blocks',
      message: 'A lesson needs at least two content blocks.',
    }];
  }

  const ids = new Set<string>();
  const sortOrders = new Set<number>();

  value.forEach((item, index) => {
    const path = `blocks[${index}]`;
    if (!isRecord(item)) {
      issues.push({ path, message: 'Block must be an object.' });
      return;
    }

    if (!isNonEmptyString(item.id)) {
      issues.push({ path: `${path}.id`, message: 'A stable block ID is required.' });
    } else if (ids.has(item.id)) {
      issues.push({ path: `${path}.id`, message: 'Block IDs must be unique within a lesson.' });
    } else {
      ids.add(item.id);
    }

    if (!blockTypes.has(item.blockType as LessonBlockType)) {
      issues.push({ path: `${path}.blockType`, message: 'Unsupported lesson block type.' });
    } else {
      validateBlockContent(item.blockType as LessonBlockType, item.content, path, issues);
    }

    if (!Number.isInteger(item.sortOrder) || (item.sortOrder as number) < 0) {
      issues.push({ path: `${path}.sortOrder`, message: 'Sort order must be a non-negative integer.' });
    } else if (sortOrders.has(item.sortOrder as number)) {
      issues.push({ path: `${path}.sortOrder`, message: 'Sort order values must be unique.' });
    } else {
      sortOrders.add(item.sortOrder as number);
    }

    if (typeof item.isOptional !== 'boolean') {
      issues.push({ path: `${path}.isOptional`, message: 'isOptional must be a boolean.' });
    }

    if (item.title !== undefined && (
      !isNonEmptyString(item.title) || item.title.length > 120
    )) {
      issues.push({ path: `${path}.title`, message: 'Block title must be 1–120 characters.' });
    }
  });

  return issues;
}

export function validateLessonForPublication(
  lesson: LessonPublicationInput,
): LessonValidationIssue[] {
  const issues: LessonValidationIssue[] = [];

  if (!isNonEmptyString(lesson.title) || lesson.title.length > 180) {
    issues.push({ path: 'title', message: 'Lesson title must be 1–180 characters.' });
  }
  if (!isNonEmptyString(lesson.summary) || lesson.summary.length < 20) {
    issues.push({ path: 'summary', message: 'A meaningful lesson summary is required.' });
  }
  if (!Number.isInteger(lesson.estimatedMinutes) || lesson.estimatedMinutes < 1) {
    issues.push({ path: 'estimatedMinutes', message: 'Estimated duration must be a positive integer.' });
  }
  if (!hasStringArray(lesson.learningOutcomes)) {
    issues.push({ path: 'learningOutcomes', message: 'At least one measurable learning outcome is required.' });
  }
  if (!hasStringArray(lesson.sourceReferences)) {
    issues.push({ path: 'sourceReferences', message: 'At least one source reference is required.' });
  }

  for (const [key, value] of Object.entries(lesson.review)) {
    if (value !== true) {
      issues.push({ path: `review.${key}`, message: 'All required reviews must be approved before publication.' });
    }
  }

  issues.push(...validateLessonBlocks(lesson.blocks));
  return issues;
}
