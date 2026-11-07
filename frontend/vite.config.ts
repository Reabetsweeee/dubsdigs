import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';
const t=process.env.API_TARGET||'http://localhost:8000';
export default defineConfig({plugins:[react()],server:{proxy:{'/api':t,'/ws':{target:t,ws:true}}}});
