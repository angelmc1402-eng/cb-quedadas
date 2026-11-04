import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
export default defineConfig({root:resolve(import.meta.dirname,'pages'),base:'/cb-quedadas/',publicDir:resolve(import.meta.dirname,'public'),plugins:[react()],build:{outDir:resolve(import.meta.dirname,'dist-pages'),emptyOutDir:true},server:{fs:{allow:[import.meta.dirname]}}});
