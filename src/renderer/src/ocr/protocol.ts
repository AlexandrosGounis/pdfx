import type { OcrWord } from './types'

export interface OcrSetLanguageRequest {
  type: 'setLanguage'
  lang: string
}

export interface OcrRecognizeRequest {
  type: 'recognize'
  jobId: string
  bitmap: ImageBitmap
}

export interface OcrCancelRequest {
  type: 'cancel'
  jobId: string
}

export interface OcrCancelAllRequest {
  type: 'cancelAll'
}

export interface OcrDisposeRequest {
  type: 'dispose'
}

export type OcrRequest =
  | OcrSetLanguageRequest
  | OcrRecognizeRequest
  | OcrCancelRequest
  | OcrCancelAllRequest
  | OcrDisposeRequest

export interface OcrResultResponse {
  type: 'result'
  jobId: string
  text: string
  words: OcrWord[]
}

export interface OcrErrorResponse {
  type: 'error'
  jobId: string
  message: string
}

export type OcrResponse = OcrResultResponse | OcrErrorResponse
