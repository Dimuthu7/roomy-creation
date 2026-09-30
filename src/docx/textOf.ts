import JSZip from 'jszip'

// Test-only helper shared by every *.test.ts in this directory. Unlike the PDF tests,
// which walk an unrendered React element tree, a docx Document has no such tree to
// inspect before packing — so this extracts the plain text straight out of the real
// rendered .docx (a zip of XML parts), which also means the tests exercise the actual
// Packer output rather than an intermediate representation.
export async function textOf(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer)
  const xml = await zip.file('word/document.xml')!.async('string')
  return xml
    .replace(/<w:p[ >]/g, ' <w:p>')
    .replace(/<w:tab\/>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}
