/**
 * Resize + compress an image in the browser before uploading to R2.
 * Keeps gear photos light (usually < 300 KB) without visible quality loss.
 */
export async function compressImage(file: File, maxSize = 1400): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('画像を処理できませんでした')
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', 0.86)
  })
  if (blob) return blob

  const fallback = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.88)
  })
  if (!fallback) throw new Error('画像を圧縮できませんでした')
  return fallback
}

export async function uploadGearImage(file: File): Promise<string> {
  const blob = await compressImage(file)
  const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
  const formData = new FormData()
  formData.append('file', blob, `gear.${extension}`)
  const response = await fetch('/api/gear/upload', {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || '画像のアップロードに失敗しました')
  }
  const data = (await response.json()) as { key?: string }
  if (!data.key) throw new Error('画像キーを取得できませんでした')
  return data.key
}
