export interface OcrLanguage {
  code: string
  label: string
}

export const OCR_LANGUAGES: OcrLanguage[] = [
  { code: 'eng', label: 'English' },
  { code: 'deu', label: 'German' },
  { code: 'fra', label: 'French' },
  { code: 'spa', label: 'Spanish' }
]

export const DEFAULT_OCR_LANGUAGE = 'eng'
