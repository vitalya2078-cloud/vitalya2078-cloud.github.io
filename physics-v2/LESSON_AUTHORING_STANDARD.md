# PHYSICS lesson authoring standard

Status: content-production contract. This document does not publish lessons or create learner-facing screens.

## 1. Lesson identity and scope

Every lesson is attached to one curriculum topic and one or more explicitly supported education tracks/levels. A lesson record must have:
- a concise, specific title;
- a short summary that explains what the learner will understand or be able to do;
- a realistic estimated duration;
- one or more measurable learning outcomes;
- prerequisite concepts, where relevant;
- versioned source references and editorial review state.

Shared lessons may be reused across tracks only when the learning outcomes, mathematical depth, terminology and expected prior knowledge genuinely match. Otherwise create a track-specific version and reuse individual blocks where appropriate.

## 2. Recommended explanatory progression

Use only the blocks that genuinely help teach the topic. A typical sequence is:

1. **Introduction** — why the topic matters and the question it answers.
2. **Intuition** — a concrete mental model before formal notation; clearly state where an analogy stops being accurate.
3. **Concepts** — precise definitions, quantities, symbols and distinctions.
4. **Laws** — statement, physical meaning, applicability conditions and limitations.
5. **Formulas** — readable mathematical form, symbol glossary, SI units and conditions of use.
6. **Worked example** — givens, requested quantity, model choice, sequential reasoning, substitution, units and final check.
7. **Illustration / simulation / experiment** — only when it adds explanatory or investigative value.
8. **Practice** — task references across basic, medium and advanced difficulty.
9. **Summary** — key ideas, formulas and short self-check.
10. **Extension** — optional deeper treatment for learners ready to go further.

This is a progression guide, not a mandatory fixed template. A lesson should not contain empty or decorative blocks merely to fill every slot.

## 3. Supported block types

The database block types and their canonical payload requirements are validated in `src/domain/lesson-content.ts`.

| Block type | Required content |
|---|---|
| `introduction` | lead and explanatory body |
| `intuition` | analogy and explanation |
| `concept` | term and precise definition |
| `law` | name, statement and applicability conditions |
| `formula` | LaTeX, variables with names and SI units, applicability conditions |
| `worked_example` | problem, what to find, at least two explained steps, answer |
| `illustration` | asset reference, meaningful alt text and caption |
| `simulation` | objective, description, configuration, controls and expected observations |
| `experiment` | objective, equipment, steps and safety notes |
| `practice` | task IDs, instructions and difficulty |
| `summary` | key points |
| `extension` | deeper explanation or optional enrichment |
| `other` | a clearly justified custom body |

## 4. Mathematical and scientific quality

- Define every symbol when it first appears.
- Use SI units consistently; show conversions explicitly when needed.
- Distinguish scalar and vector quantities.
- State assumptions and the conditions under which a formula or model is valid.
- Do not present an approximation as an exact law.
- In worked examples, preserve units through calculations and perform a plausibility check.
- Use diagrams and graphs with axes, units, legends and alternative text.
- Check formulas and numerical examples independently before publication.

## 5. Simulations and experiments

Interactive content must have a learning objective, meaningful controls, expected observations and an offline-friendly fallback or explanation.

Student-facing experiments are limited to ordinary, low-risk classroom work or a teacher-managed demonstration. Every experiment requires explicit safety notes. A teacher-managed demonstration must explicitly require teacher supervision. Do not author student procedures involving hazardous substances, dangerous energy sources, or unsafe equipment.

When a physical experiment is unsuitable, use a simulation, a prepared dataset, a diagram, or a teacher-provided demonstration recording instead.

## 6. Practice and assessment links

- Practice tasks are referenced by stable IDs; lesson content must not duplicate or mutate the approved 900-question bank.
- Every task must have an answer key and an explanatory rationale in its own assessment record.
- Difficulty labels are pedagogical: basic checks core understanding, medium applies concepts in familiar contexts, advanced combines ideas or requires model selection.
- Training mode remains non-punitive; final assessment is a separate assessment event.
- Wrong answers may inform recommendations but must not silently alter the official source question.

## 7. Sources, rights and review gates

Every publishable lesson must include at least one traceable source reference. Keep source version, page/section, access date and rights/permission notes in the editorial record.

Use official working programs to establish curriculum scope and sequence; use textbooks and trusted scientific references to develop explanations and examples. Write PHYSICS explanations in original language. Do not copy textbook paragraphs, diagrams, tasks or answer explanations unless the rights explicitly permit reuse.

Publication requires all three review gates:
- **Physics review** — formulas, units, definitions, assumptions and scientific accuracy.
- **Pedagogical review** — progression, clarity, age-appropriate language and alignment with outcomes.
- **Rights review** — source traceability, permitted reuse and original assets.

The current publication validator blocks release if source references or any of these review approvals are missing.

## 8. Versioning and maintenance

- A content change that can affect learning meaning increments the lesson content version.
- Published content is never silently overwritten; retain the prior version for audit and migration.
- Correct factual errors through a reviewed version, with a short change note.
- Reusable blocks should be shared only when their meaning and prerequisites remain identical across tracks.
