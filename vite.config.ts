import { defineConfig } from 'vite'
import { sveltekit } from '@sveltejs/kit/vite'
// import fs from 'fs'
// import path from 'path'

// // Path to your SSL key and cert files
// const keyPath = path.resolve(__dirname, './ssl/key.pem')
// const certPath = path.resolve(__dirname, './ssl/cert.pem')

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port:  3000,
    strictPort: true,
    open: false,
    // https: {
    //   key: fs.readFileSync(keyPath),
    //   cert: fs.readFileSync(certPath),
    //   passphrase: 'passe fraise',
    // }
  },
});