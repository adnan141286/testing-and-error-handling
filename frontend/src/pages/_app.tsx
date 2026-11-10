import React from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';

/**
 * Root Next.js App wrapper component.
 * Injects global full-viewport dark background and box-sizing reset to eliminate any white space.
 *
 * @param props - Next.js AppProps
 * @returns React element
 */
export function App({ Component, pageProps }: AppProps): React.JSX.Element {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="theme-color" content="#090514" />
        <style>{`
          html, body {
            margin: 0;
            padding: 0;
            background-color: #090514 !important;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
            width: 100%;
            min-height: 100vh;
            overflow-x: hidden;
            box-sizing: border-box;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: #090514;
          }
          ::-webkit-scrollbar-thumb {
            background: #2a1b4d;
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #472b82;
          }
        `}</style>
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default App;
