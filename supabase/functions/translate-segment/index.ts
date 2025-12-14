
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    const { record } = payload
    
    // Validate payload (must be from database webhook on caption_segments)
    if (!record || !record.meeting_id || !record.text_final || !record.source_lang) {
        return new Response(JSON.stringify({ message: 'Invalid payload' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }

    const { id: segmentId, meeting_id, text_final, source_lang } = record

    console.log(`Processing translation for segment ${segmentId} (${source_lang} -> ?)`)

    // 1. Get active target languages for this meeting
    const { data: targets, error: targetError } = await supabaseClient
        .from('meeting_language_targets')
        .select('target_lang')
        .eq('meeting_id', meeting_id)

    if (targetError) throw targetError

    // 2. Get unique languages excluding source
    const uniqueTargets = [...new Set(targets.map(t => t.target_lang))]
        .filter(lang => lang !== source_lang)

    if (uniqueTargets.length === 0) {
        return new Response(JSON.stringify({ message: 'No target languages found' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }

    console.log(`Translating to: ${uniqueTargets.join(', ')}`)

    // 3. Translate for each language (using Gemini)
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) throw new Error('GEMINI_API_KEY not set')

    const translations = await Promise.all(uniqueTargets.map(async (targetLang) => {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `Translate the following text from ${source_lang} to ${targetLang}. Return ONLY the translated text, no explanation or quotes.\n\nText: "${text_final}"` }]
                    }]
                })
            })

            const data = await response.json()
            const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

            if (!translatedText) return null

            return {
                meeting_id,
                segment_id: segmentId,
                target_lang: targetLang,
                translated_text: translatedText
            }
        } catch (e) {
            console.error(`Translation failed for ${targetLang}:`, e)
            return null
        }
    }))

    const validTranslations = translations.filter(t => t !== null)

    // 4. Insert translations back to DB
    if (validTranslations.length > 0) {
        const { error: insertError } = await supabaseClient
            .from('caption_translations')
            .upsert(validTranslations, { onConflict: 'segment_id, target_lang' })

        if (insertError) throw insertError
    }

    return new Response(JSON.stringify({ success: true, count: validTranslations.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
