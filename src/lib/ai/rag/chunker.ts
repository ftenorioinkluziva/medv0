export function chunkText(
  text: string,
  chunkSize: number = 2000,
  overlap: number = 200,
): string[] {
  if (text.length <= chunkSize) {
    return [text]
  }

  const chunks: string[] = []
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0)
  let buffer = ''

  for (const para of paragraphs) {
    const candidate = buffer ? `${buffer}\n\n${para}` : para

    if (candidate.length <= chunkSize) {
      buffer = candidate
    } else {
      if (buffer) {
        chunks.push(buffer)
        buffer = `${buffer.slice(-overlap)}\n\n${para}`
      } else {
        buffer = para
      }

      // Paragraph too long to fit even with fresh buffer — slide through it
      while (buffer.length > chunkSize) {
        chunks.push(buffer.slice(0, chunkSize))
        buffer = buffer.slice(chunkSize - overlap)
      }
    }
  }

  if (buffer.trim()) {
    chunks.push(buffer)
  }

  return chunks
}
