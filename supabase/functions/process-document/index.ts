import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// MIME types Claude can process natively as documents
const SUPPORTED_PDF_TYPE = 'application/pdf';

// Claude does not support binary Word formats natively.
// DOC/DOCX should be converted to PDF or TXT before upload.
// TXT files are handled directly in the frontend (InputZone.tsx) without calling this function.
const UNSUPPORTED_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const { document, fileName, mimeType } = await req.json();

    if (!document) {
      throw new Error('No document data provided');
    }

    console.log('Processing document:', fileName, 'type:', mimeType);

    // DOC/DOCX are not supported — Claude reads PDFs and images, not binary Word formats
    if (UNSUPPORTED_TYPES.includes(mimeType)) {
      return new Response(
        JSON.stringify({
          error: `Word documents (.doc/.docx) cannot be processed directly. Please save as PDF or copy the text and paste it into the narrative field.`
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build message content based on file type
    // PDFs: use Claude's native document support
    // Images (png/jpg/gif/webp): use vision
    const isPDF = mimeType === SUPPORTED_PDF_TYPE;
    const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType);

    if (!isPDF && !isImage) {
      return new Response(
        JSON.stringify({ error: `Unsupported file type: ${mimeType}. Please upload a PDF, image, or plain text file.` }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const documentContent = isPDF
      ? {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data: document,
          },
        }
      : {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: document,
          },
        };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25', // Required for PDF document support
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: 'You are a document text extraction assistant for a psychiatric clinical system. Extract ALL text content from the provided document faithfully and completely. Preserve structure (headings, paragraphs, lists, tables). Do not summarise or interpret — extract the raw text exactly as written. If the document contains clinical notes, patient narratives, or assessment data, preserve every detail.',
        messages: [
          {
            role: 'user',
            content: [
              documentContent,
              {
                type: 'text',
                text: `Extract all text content from this document (${fileName}). Return only the extracted text, preserving structure and formatting. Do not add commentary.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.content?.[0]?.text || '';

    console.log('Document processed successfully, extracted', extractedText.length, 'characters');

    return new Response(
      JSON.stringify({ text: extractedText, fileName }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing document:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
