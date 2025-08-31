import type { LinksFunction, MetaFunction } from 'react-router'
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import stylesUrl from './styles/tailwind.css?url'
import { getSiteUrl } from './services/url.ts'
import iconPngUrl from './icon.png?url'

const App = () => (
  <html lang='en'>
    <head>
      <meta charSet='utf-8' />
      <meta
        name='viewport'
        content='width=device-width,initial-scale=1,viewport-fit=cover'
      />
      <Meta />
      <Links />
    </head>
    <body>
      <Outlet />
      <ScrollRestoration />
      <Scripts />
    </body>
  </html>
)

export const meta: MetaFunction = ({ location }) => {
  const title = `True Random For Spotify`
  const description = `An application for unbiased truly random playlist and library shuffling with Spotify.`
  const url = getSiteUrl(location.pathname)

  return [
    { title },
    { tagName: `link`, rel: `canonical`, href: url },
    { name: `description`, content: description },
    {
      name: `keywords`,
      content: [`spotify`, `true`, `random`, `shuffle`, `music`].join(`,`),
    },
    { name: `author`, content: `Tomer Aberbach` },

    // https://ogp.me
    { property: `og:title`, content: title },
    { property: `og:description`, content: description },
    { property: `og:url`, content: url },

    // X
    { name: `twitter:site`, content: `@TomerAberbach` },
    { name: `twitter:title`, content: title },
    { name: `twitter:description`, content: description },
  ]
}

export const links: LinksFunction = () => [
  { rel: `stylesheet`, href: stylesUrl },
  { rel: `icon`, href: iconPngUrl, sizes: `any` },
]

export default App
