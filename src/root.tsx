import type { LinksFunction, MetaFunction } from '@remix-run/node'
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react'
import styles from './styles/index.css?url'

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

export const meta: MetaFunction = () => [
  { title: `True Random For Spotify` },
  { name: `author`, content: `Tomer Aberbach` },
  {
    name: `description`,
    content: `An application for unbiased truly random playlist and library shuffling with Spotify.`,
  },
  {
    name: `keywords`,
    content: [`spotify`, `true`, `random`, `shuffle`, `music`].join(`,`),
  },
]

export const links: LinksFunction = () => [{ rel: `stylesheet`, href: styles }]

export default App
