export interface OcrWord {
  text: string
  x: number
  y: number
  w: number
  h: number
}

export interface OcrResult {
  text: string
  words: OcrWord[]
}
