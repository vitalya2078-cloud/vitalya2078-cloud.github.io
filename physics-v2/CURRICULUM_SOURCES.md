# PHYSICS — official school curriculum source register

Last reviewed: 2026-11-08

## Authority and use

The initial Russian school track is based on the federal working programs published by the federal educational content portal, Единое содержание общего образования (ЕДСОО). The portal lists the federal working programs for Physics at basic and advanced levels. The Federal State Educational Programs register is the authority for the current editions of the overall federal educational programs.

Sources are recorded as source metadata in `physics.program_versions`. Program records and versions are initially stored as `draft`; they are not exposed through the student-facing public catalog until the extracted hierarchy, outcomes, and content have been reviewed.

## Initial school tracks

| PHYSICS program | Grades | Level | Source |
|---|---:|---|---|
| School Physics — Basic OOO | 7–9 | Basic | [Federal working program, 2025](https://edsoo.ru/wp-content/uploads/2025/07/2025_ooo_frp_fizika-7-9_baz.pdf) |
| School Physics — Advanced OOO | 7–9 | Advanced | [Federal working program, 2025](https://edsoo.ru/wp-content/uploads/2025/07/2025_ooo_frp_fizika_7-9_ugl.pdf) |
| School Physics — Basic SOO | 10–11 | Basic | [Federal working program, 2025](https://edsoo.ru/wp-content/uploads/2025/07/2025_soo_frp_fizika_10_11_baz.pdf) |
| School Physics — Advanced SOO | 10–11 | Advanced | [Federal working program, 2025](https://edsoo.ru/wp-content/uploads/2025/07/2025_soo_frp_fizika_10_11_ugl.pdf) |

The source portal: https://edsoo.ru/rabochie-programmy/

The current Federal Educational Programs register must also be checked before every curriculum release:
https://fgosreestr.edsoo.ru/educational-programs

## Ingestion rules

1. Keep each official program and level as its own PHYSICS education program where the source documents distinguish them.
2. Preserve the original grade allocation, mandatory content, planned outcomes, and official sequence in the curriculum metadata.
3. Do not copy entire textbooks or reproduce protected textbook explanations. PHYSICS lesson prose is authored independently and fact-checked against approved sources.
4. Record exact source title, source URL, edition/version, effective period when explicitly stated, and review date.
5. Keep topic-to-question-bank mappings separate. The approved 900-question institutional bank remains immutable and does not define the school curriculum.
6. Publish only after hierarchy validation, scientific review, lesson review, and API smoke tests.
7. Re-check the official register and annual teaching guidance for changes before publishing a new academic-year edition.

## Important distinction

The federal working programs describe required subject content, planned outcomes, and recommended thematic planning. They are not complete digital lesson scripts. PHYSICS must create its own lessons, examples, explanations, exercises, diagrams, and simulations while retaining traceability to the official curriculum.


## 2026/2027 academic-year review

The EDSOO physics methodology index now lists an information-methodological letter on teaching physics in the 2026/2027 academic year (published 17 August 2026):

https://edsoo.ru/category/mmposob/fiz/

This annual letter is a supplementary methodological source. It does not replace the federal working program PDFs registered above. Before publishing any academic-year curriculum release, review the current letter and the current Federal Educational Programs register. Record any resulting curriculum changes as a new version rather than silently changing the 2025 source snapshot.

The 2025 PDF files were checked against the EDSOO working-program index. The 10–11 basic and advanced documents explicitly allocate learning content by grade (10 and 11) and distinguish required content, outcomes, thematic planning, and recommended experiments. The 7–9 basic program likewise allocates content by grade (7, 8, 9). These divisions are preserved as separate PHYSICS grade nodes.


## Registered curriculum outline

The 2025 source headings have been imported as draft metadata into the private `physics` schema:

- OOO basic: grades 7–9, one source section per grade and 14 topic headings.
- OOO advanced: grades 7–9, one source section per grade and 13 topic headings.
- SOO basic: grades 10–11, one source section per grade and 10 topic headings.
- SOO advanced: grades 10–11, one source section per grade and 11 topic headings.

The outline seeds are reproducible and idempotent:

- `supabase/seed/school-curriculum-outline-ooo.sql`
- `supabase/seed/school-curriculum-outline-soo.sql`

All 10 sections and 48 topic headings remain `draft`. No curriculum program or lesson has been published to the public API. This is deliberate: each outline must still be checked against the complete thematic planning, expected outcomes, and recommended laboratory work before lesson authoring and publication.
