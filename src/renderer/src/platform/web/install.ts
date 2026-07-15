import { createWebApi } from './api'
import './web.css'

if (!window.api) {
  document.documentElement.classList.add('web')
  window.api = createWebApi()
}
