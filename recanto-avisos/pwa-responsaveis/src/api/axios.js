import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// Injeta JWT em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 401 → logout e redirect para login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('jwt')
      localStorage.removeItem('userInfo')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

export default api
