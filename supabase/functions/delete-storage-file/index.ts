import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// CORS Headers for safety
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Preflight check
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Initialise Supabase Admin Client using Service Role Key
    // This allows us to delete files bypassing RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    )

    // 2. Parse the Webhook payload from Database
    const payload = await req.json()
    console.log('Webhook payload received:', payload)

    // Ensure it's a DELETE operation
    if (payload.type !== 'DELETE' || !payload.old_record) {
      return new Response(JSON.stringify({ message: 'Ignored: Not a DELETE operation' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const deletedRecord = payload.old_record
    const filesToDelete: string[] = []

    // 3. Extract file paths from the deleted record
    // Depending on the table, the column might be 'file_url', 'thumbnail_url', or 'avatar_url'
    if (deletedRecord.file_url) filesToDelete.push(deletedRecord.file_url)
    if (deletedRecord.thumbnail_url) filesToDelete.push(deletedRecord.thumbnail_url)
    if (deletedRecord.avatar_url) filesToDelete.push(deletedRecord.avatar_url)

    if (filesToDelete.length === 0) {
      return new Response(JSON.stringify({ message: 'No files to delete in this record' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Delete the files from Supabase Storage
    const results = []
    for (const fileUrl of filesToDelete) {
      // Find the bucket name by splitting the URL
      // Example public URL: https://[project].supabase.co/storage/v1/object/public/library/my-image.jpg
      const urlMatches = fileUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
      
      if (urlMatches && urlMatches.length === 3) {
        const bucketId = urlMatches[1]
        const filePath = urlMatches[2]

        const { data, error } = await supabaseAdmin
          .storage
          .from(bucketId)
          .remove([filePath])

        if (error) {
          console.error(`Error deleting ${filePath} from ${bucketId}:`, error)
          results.push({ file: filePath, status: 'error', error: error.message })
        } else {
          console.log(`Successfully deleted ${filePath} from ${bucketId}`)
          results.push({ file: filePath, status: 'deleted' })
        }
      } else {
         console.warn(`Could not parse bucket and path from URL: ${fileUrl}`)
         results.push({ file: fileUrl, status: 'skipped', reason: 'Invalid URL format' })
      }
    }

    // 5. Respond back
    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Unhandled Server Error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
