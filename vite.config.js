import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3001
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.API_URL': JSON.stringify(process.env.NODE_ENV === 'production' 
      ? 'https://localhost:8443/api' 
      : 'http://localhost:3000/api')
  }
})
