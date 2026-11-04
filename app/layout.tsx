import type {Metadata,Viewport} from 'next';
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#f5f2e9'};
import './globals.css';
export const metadata:Metadata={title:'C&B — Nos vemos fuera',description:'Menos a ver si quedamos. Más nos vemos. El calendario, los planes y los recuerdos de C&B.',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:'C&B',statusBarStyle:'default'},icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
