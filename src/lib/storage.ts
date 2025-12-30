import { supabase } from './supabase'

/**
 * Upload a file to Supabase Storage
 * Returns the file path that can be used to download/process the file
 */
export async function uploadToStorage(
  file: File,
  bucket: string = 'documents'
): Promise<{ path: string; error: string | null }> {
  try {
    // Create a unique file name to avoid collisions
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop()
    const fileName = `${timestamp}-${randomSuffix}.${extension}`
    const filePath = `uploads/${fileName}`

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return { path: '', error: error.message }
    }

    return { path: filePath, error: null }
  } catch (err) {
    console.error('Upload error:', err)
    return { path: '', error: 'Kunde inte ladda upp filen' }
  }
}

/**
 * Download a file from Supabase Storage as ArrayBuffer
 */
export async function downloadFromStorage(
  filePath: string,
  bucket: string = 'documents'
): Promise<{ data: ArrayBuffer | null; error: string | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath)

    if (error) {
      console.error('Storage download error:', error)
      return { data: null, error: error.message }
    }

    const arrayBuffer = await data.arrayBuffer()
    return { data: arrayBuffer, error: null }
  } catch (err) {
    console.error('Download error:', err)
    return { data: null, error: 'Kunde inte hämta filen' }
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFromStorage(
  filePath: string,
  bucket: string = 'documents'
): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath])

    if (error) {
      console.error('Storage delete error:', error)
      return { error: error.message }
    }

    return { error: null }
  } catch (err) {
    console.error('Delete error:', err)
    return { error: 'Kunde inte ta bort filen' }
  }
}

/**
 * Get a signed URL for a file (for temporary access)
 */
export async function getSignedUrl(
  filePath: string,
  bucket: string = 'documents',
  expiresIn: number = 3600
): Promise<{ url: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn)

    if (error) {
      console.error('Signed URL error:', error)
      return { url: null, error: error.message }
    }

    return { url: data.signedUrl, error: null }
  } catch (err) {
    console.error('Signed URL error:', err)
    return { url: null, error: 'Kunde inte skapa länk till filen' }
  }
}
