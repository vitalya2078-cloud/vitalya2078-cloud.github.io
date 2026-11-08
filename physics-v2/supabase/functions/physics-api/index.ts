import postgres from "postgres";

const databaseUrl = Deno.env.get("SUPABASE_DB_URL");

if (!databaseUrl) {
  throw new Error("SUPABASE_DB_URL is not configured");
}

const database = postgres(databaseUrl, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey, x-client-info",
  "Access-Control-Max-Age": "86400",
};

function respond(body: unknown, status = 200, cache = "public, max-age=60, stale-while-revalidate=300") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache,
    },
  });
}

function fail(code: string, message: string, status: number) {
  return respond({ error: { code, message } }, status, "no-store");
}

const catalogQuery = [
  "select coalesce(jsonb_agg(program_document order by program_document->>'name'), '[]'::jsonb) as catalog",
  "from (",
  "  select jsonb_build_object(",
  "    'id', p.id, 'code', p.code, 'name', p.name,",
  "    'description', p.description, 'educationTrack', p.education_track,",
  "    'versions', coalesce((",
  "      select jsonb_agg(jsonb_build_object(",
  "        'id', v.id, 'code', v.version_code, 'title', v.title,",
  "        'effectiveFrom', v.effective_from, 'effectiveTo', v.effective_to,",
  "        'levels', coalesce((",
  "          select jsonb_agg(jsonb_build_object(",
  "            'id', lv.id, 'code', lv.code, 'title', lv.title, 'order', lv.sort_order,",
  "            'sections', coalesce((",
  "              select jsonb_agg(jsonb_build_object(",
  "                'id', s.id, 'slug', s.slug, 'title', s.title,",
  "                'description', s.description, 'order', s.sort_order,",
  "                'topics', coalesce((",
  "                  select jsonb_agg(jsonb_build_object(",
  "                    'id', t.id, 'slug', t.slug, 'title', t.title,",
  "                    'description', t.description, 'order', t.sort_order,",
  "                    'lessons', coalesce((",
  "                      select jsonb_agg(jsonb_build_object(",
  "                        'id', l.id, 'slug', l.slug, 'title', l.title,",
  "                        'summary', l.summary, 'order', l.sort_order,",
  "                        'estimatedMinutes', l.estimated_minutes,",
  "                        'contentVersion', l.content_version",
  "                      ) order by l.sort_order)",
  "                      from physics.lessons l",
  "                      where l.topic_id = t.id and l.status = 'published'",
  "                    ), '[]'::jsonb)",
  "                  ) order by t.sort_order)",
  "                  from physics.topics t",
  "                  where t.section_id = s.id and t.status = 'published'",
  "                ), '[]'::jsonb)",
  "              ) order by s.sort_order)",
  "              from physics.sections s",
  "              where s.level_id = lv.id and s.status = 'published'",
  "            ), '[]'::jsonb)",
  "          ) order by lv.sort_order)",
  "          from physics.education_levels lv",
  "          where lv.program_version_id = v.id",
  "        ), '[]'::jsonb)",
  "      ) order by v.effective_from desc nulls last, v.created_at desc)",
  "      from physics.program_versions v",
  "      where v.program_id = p.id and v.status = 'active'",
  "    ), '[]'::jsonb)",
  "  ) as program_document",
  "  from physics.education_programs p",
  "  where p.status = 'active'",
  ") active_programs",
].join("\n");

const lessonQuery = [
  "select jsonb_build_object(",
  "  'id', l.id, 'slug', l.slug, 'title', l.title, 'summary', l.summary,",
  "  'estimatedMinutes', l.estimated_minutes, 'contentVersion', l.content_version,",
  "  'topic', jsonb_build_object('id', t.id, 'slug', t.slug, 'title', t.title),",
  "  'blocks', coalesce((",
  "    select jsonb_agg(jsonb_build_object(",
  "      'id', b.id, 'type', b.block_type, 'title', b.title,",
  "      'content', b.content, 'order', b.sort_order, 'optional', b.is_optional",
  "    ) order by b.sort_order)",
  "    from physics.lesson_blocks b where b.lesson_id = l.id",
  "  ), '[]'::jsonb)",
  ") as lesson",
  "from physics.lessons l",
  "join physics.topics t on t.id = l.topic_id",
  "join physics.sections s on s.id = t.section_id",
  "join physics.education_levels lv on lv.id = s.level_id",
  "join physics.program_versions v on v.id = lv.program_version_id",
  "join physics.education_programs p on p.id = v.program_id",
  "where l.id = $1::uuid and l.status = 'published'",
  "and t.status = 'published' and s.status = 'published'",
  "and v.status = 'active' and p.status = 'active'",
  "limit 1",
].join("\n");

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return fail("METHOD_NOT_ALLOWED", "Only GET requests are supported.", 405);
  }

  const path = new URL(request.url).pathname.replace(/\/+$/, "");

  try {
    if (path.endsWith("/health")) {
      await database.unsafe("select 1");
      return respond({
        ok: true,
        service: "physics-api",
        database: "connected",
        timestamp: new Date().toISOString(),
      }, 200, "no-store");
    }

    if (path.endsWith("/v1/catalog")) {
      const rows = await database.unsafe(catalogQuery);
      const catalog = rows[0]?.catalog ?? [];
      return respond({
        data: catalog,
        meta: { count: catalog.length, version: 1 },
      });
    }

    const match = path.match(/\/v1\/lessons\/([0-9a-fA-F-]{36})$/);
    if (match) {
      const rows = await database.unsafe(lessonQuery, [match[1]]);
      const lesson = rows[0]?.lesson ?? null;

      if (!lesson) {
        return fail("LESSON_NOT_FOUND", "Published lesson was not found.", 404);
      }

      return respond({ data: lesson });
    }

    return fail("NOT_FOUND", "API route was not found.", 404);
  } catch (error) {
    console.error("PHYSICS API request failed:", error);
    return fail("INTERNAL_ERROR", "The request could not be completed.", 500);
  }
});
