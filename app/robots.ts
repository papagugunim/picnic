import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/chats/', '/settings/', '/profile/'],
    },
    sitemap: 'https://picnic-app.vercel.app/sitemap.xml',
  }
}
