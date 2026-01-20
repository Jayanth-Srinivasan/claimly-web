# PDF Processing Fix

## Problem Identified

PDFs were not being processed correctly because:
1. **OpenAI's vision API doesn't support PDFs directly** - it only supports images
2. **PDFs were not being sent to OpenAI** - the code was only describing PDFs in text, not actually processing them
3. **No PDF parsing library** - there was no way to extract text from PDFs

## Solution Implemented

1. **Installed pdf-parse library** (`yarn add pdf-parse`)
   - This library extracts text from PDF files
   - Works server-side in Node.js

2. **Updated `lib/ai/document-processor.ts`**:
   - Added PDF text extraction using pdf-parse
   - Fetches PDF from signed URL
   - Extracts text content
   - Sends extracted text to OpenAI for analysis
   - Includes proper error handling and fallbacks

## How It Works Now

1. **PDF Upload**: User uploads PDF → stored in Supabase Storage
2. **Auto-Processing**: When PDF is attached in claim mode:
   - System fetches PDF from signed URL
   - Uses pdf-parse to extract text
   - Sends extracted text to OpenAI GPT-4o
   - AI analyzes text and extracts structured information
   - Validates document (relevance, context match, legitimacy)
   - Saves extracted info to database

## Testing

To test PDF processing:
1. Upload a PDF document in claim mode
2. Check server logs for:
   - `[extractDocumentInfo] Processing PDF - fetching and extracting text`
   - `[extractDocumentInfo] PDF text extracted - X characters`
3. Verify extracted information is saved to `claim_extracted_information` table
4. Check AI response includes extracted details

## Future Improvements

1. **PDF to Image Conversion**: Convert PDF pages to images and send to vision API for better visual analysis
2. **Multi-page Support**: Currently extracts text from all pages, but could process page-by-page
3. **Image Extraction**: Extract images from PDFs and analyze them separately
4. **Better Error Handling**: More specific error messages for different PDF issues

## Files Modified

- `lib/ai/document-processor.ts` - Added PDF text extraction
- `package.json` - Added pdf-parse dependency
