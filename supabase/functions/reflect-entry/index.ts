import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const reflectionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'summary',
    'emotions',
    'themes',
    'gentle_questions',
    'supportive_note',
    'risk_level',
    'long_term_context_update',
  ],
  properties: {
    summary: { type: 'string' },
    emotions: {
      type: 'object',
      additionalProperties: false,
      required: ['primary', 'secondary', 'intensity'],
      properties: {
        primary: {
          type: 'array',
          items: { type: 'string' },
        },
        secondary: {
          type: 'array',
          items: { type: 'string' },
        },
        intensity: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
        },
      },
    },
    themes: {
      type: 'array',
      items: { type: 'string' },
    },
    gentle_questions: {
      type: 'array',
      items: { type: 'string' },
    },
    supportive_note: { type: 'string' },
    risk_level: {
      type: 'string',
      enum: ['none', 'low', 'medium', 'high'],
    },
    long_term_context_update: {
      type: 'object',
      additionalProperties: false,
      required: [
        'long_term_summary',
        'recurring_themes',
        'emotional_patterns',
        'helpful_response_style',
      ],
      properties: {
        long_term_summary: { type: 'string' },
        recurring_themes: {
          type: 'array',
          items: { type: 'string' },
        },
        emotional_patterns: {
          type: 'object',
          additionalProperties: false,
          required: ['recent_pattern', 'change_from_previous'],
          properties: {
            recent_pattern: { type: 'string' },
            change_from_previous: { type: 'string' },
          },
        },
        helpful_response_style: { type: 'string' },
      },
    },
  },
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function requireEnv(name: string) {
  const value = Deno.env.get(name)

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

function extractOutputText(openAiResponse: Record<string, unknown>) {
  if (typeof openAiResponse.output_text === 'string') {
    return openAiResponse.output_text
  }

  const output = Array.isArray(openAiResponse.output)
    ? openAiResponse.output
    : []

  for (const item of output) {
    if (!item || typeof item !== 'object') {
      continue
    }

    const content = Array.isArray((item as { content?: unknown }).content)
      ? (item as { content: unknown[] }).content
      : []

    for (const contentItem of content) {
      if (
        contentItem &&
        typeof contentItem === 'object' &&
        typeof (contentItem as { text?: unknown }).text === 'string'
      ) {
        return (contentItem as { text: string }).text
      }
    }
  }

  throw new Error('OpenAI response did not include output text.')
}

function createConciseMentalContext(
  mentalContext: Record<string, unknown> | null,
) {
  if (!mentalContext) {
    return null
  }

  return {
    long_term_summary: mentalContext.long_term_summary || '',
    recurring_themes: Array.isArray(mentalContext.recurring_themes)
      ? mentalContext.recurring_themes.slice(0, 8)
      : [],
    emotional_patterns: mentalContext.emotional_patterns || {},
    helpful_response_style: mentalContext.helpful_response_style || '',
    last_updated_entry_date: mentalContext.last_updated_entry_date || null,
  }
}

function createConciseRecentReflections(
  recentReflections: Record<string, unknown>[] | null,
) {
  if (!Array.isArray(recentReflections)) {
    return []
  }

  return recentReflections.map((reflection) => ({
    summary: reflection.summary || '',
    themes: Array.isArray(reflection.themes)
      ? reflection.themes.slice(0, 5)
      : [],
    emotions: reflection.emotions || {},
    risk_level: reflection.risk_level || 'none',
    updated_at: reflection.updated_at || null,
  }))
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405)
  }

  try {
    const authorization = request.headers.get('Authorization')

    if (!authorization) {
      return jsonResponse({ error: 'Missing Authorization header.' }, 401)
    }

    const supabase = createClient(
      requireEnv('SUPABASE_URL'),
      requireEnv('SUPABASE_ANON_KEY'),
      {
        global: {
          headers: { Authorization: authorization },
        },
      },
    )

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return jsonResponse({ error: 'Unauthenticated request.' }, 401)
    }

    const { entry_id } = await request.json()

    if (typeof entry_id !== 'string' || entry_id.length === 0) {
      return jsonResponse({ error: 'entry_id is required.' }, 400)
    }

    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .select('id,user_id,entry_date,content,created_at,updated_at')
      .eq('id', entry_id)
      .single()

    if (entryError || !entry) {
      return jsonResponse({ error: 'Journal entry not found.' }, 404)
    }

    if (entry.user_id !== user.id) {
      return jsonResponse({ error: 'Journal entry access denied.' }, 403)
    }

    const [
      { data: mentalContext },
      { data: recentReflections },
    ] = await Promise.all([
      supabase
        .from('user_mental_context')
        .select(
          'long_term_summary,recurring_themes,emotional_patterns,helpful_response_style,last_updated_entry_date,updated_at',
        )
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('entry_reflections')
        .select('summary,themes,emotions,risk_level,created_at,updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(3),
    ])

    const systemPrompt = `
You are a personal reflection companion. You are not a therapist, doctor, or medical professional.
Your role is to help organize personal reflections in gentle, nonjudgmental language.
Do not diagnose mental illness. Do not provide medical, clinical, or treatment advice.
Do not claim to replace professional medical or mental health care.
If the journal suggests self-harm, suicide, abuse, or immediate danger, set risk_level to "high", encourage contacting trusted people or local emergency/professional support, and avoid detailed therapeutic analysis.
Return strict JSON only. Do not include markdown, prose outside JSON, or code fences.
`

    const userPrompt = JSON.stringify(
      {
        current_entry: {
          entry_date: entry.entry_date,
          content: entry.content || '',
        },
        existing_long_term_context:
          createConciseMentalContext(mentalContext),
        recent_reflections:
          createConciseRecentReflections(recentReflections),
        output_requirements: {
          summary: 'short summary of the selected entry',
          emotions:
            'primary and secondary emotion labels plus low, medium, or high intensity',
          themes: 'two to five concise recurring or entry-specific themes',
          gentle_questions:
            'one to three gentle, nonjudgmental questions for personal reflection',
          supportive_note: 'brief supportive note without therapy claims',
          risk_level: 'none, low, medium, or high',
          long_term_context_update:
            'updated context summary and patterns using current and previous entries',
        },
      },
      null,
      2,
    )

    const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requireEnv('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_MODEL') || 'gpt-4.1-mini',
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_output_tokens: 850,
        text: {
          format: {
            type: 'json_schema',
            name: 'entry_reflection',
            strict: true,
            schema: reflectionSchema,
          },
        },
        temperature: 0.4,
      }),
    })

    const openAiJson = await openAiResponse.json()

    if (!openAiResponse.ok) {
      return jsonResponse(
        {
          error:
            openAiJson?.error?.message ||
            'OpenAI reflection request failed.',
        },
        502,
      )
    }

    const parsedReflection = JSON.parse(extractOutputText(openAiJson))
    const now = new Date().toISOString()

    const { data: savedReflection, error: reflectionWriteError } =
      await supabase
        .from('entry_reflections')
        .upsert(
          {
            entry_id: entry.id,
            user_id: user.id,
            summary: parsedReflection.summary,
            emotions: parsedReflection.emotions,
            themes: parsedReflection.themes,
            gentle_questions: parsedReflection.gentle_questions,
            supportive_note: parsedReflection.supportive_note,
            risk_level: parsedReflection.risk_level,
            updated_at: now,
          },
          { onConflict: 'entry_id' },
        )
        .select(
          'id,entry_id,user_id,summary,emotions,themes,gentle_questions,supportive_note,risk_level,created_at,updated_at',
        )
        .single()

    if (reflectionWriteError) {
      return jsonResponse({ error: reflectionWriteError.message }, 500)
    }

    const contextUpdate = parsedReflection.long_term_context_update
    const { data: savedMentalContext, error: contextWriteError } =
      await supabase
        .from('user_mental_context')
        .upsert(
          {
            user_id: user.id,
            long_term_summary: contextUpdate.long_term_summary,
            recurring_themes: contextUpdate.recurring_themes,
            emotional_patterns: contextUpdate.emotional_patterns,
            helpful_response_style: contextUpdate.helpful_response_style,
            last_updated_entry_date: entry.entry_date,
            updated_at: now,
          },
          { onConflict: 'user_id' },
        )
        .select(
          'user_id,long_term_summary,recurring_themes,emotional_patterns,helpful_response_style,last_updated_entry_date,updated_at',
        )
        .single()

    if (contextWriteError) {
      return jsonResponse({ error: contextWriteError.message }, 500)
    }

    return jsonResponse({
      reflection: savedReflection,
      mental_context: savedMentalContext,
    })
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected reflection error.',
      },
      500,
    )
  }
})
