import { createWebApi } from './api'
import './web.css'

export const isWeb = !window.api

if (isWeb) {
  document.documentElement.classList.add('web')
  window.api = createWebApi()
}
