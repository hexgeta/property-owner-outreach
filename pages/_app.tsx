import '@/styles/global.css';
import React, { useEffect, useState } from 'react';
import type { AppProps } from 'next/app';
import NavigationBar from '../components/NavBar';
import Footer from '../components/Footer';
import Head from 'next/head';

// Extend pageProps to include our layout flags
interface CustomPageProps {
  hideNav?: boolean;
  hideFooter?: boolean;
}

function MyApp({ Component, pageProps }: AppProps<CustomPageProps>) {
  const [isPrivateAccess, setIsPrivateAccess] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const hostname = window.location.hostname;
    setIsPrivateAccess(hostname === 'private.lookintomaxi.com' || hostname === 'localhost');
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <div>
      <Head>
        <title>LookIntoMaxi Ⓜ️🛡️🍀🎲🟠</title>
        <meta name="description" content="Don't fade liquid hex stakes bro - This is a Maximus Dao stats & charts site. Earn passive yield in your cold hardware wallet & sell at any time!" />
        {isPrivateAccess && (
          <>
            <meta name="robots" content="noindex, nofollow" />
            <meta name="googlebot" content="noindex, nofollow" />
          </>
        )}
      </Head>
      {!pageProps.hideNav && <NavigationBar />}
      <div className="App">
        <Component {...pageProps} />
      </div>
      {!pageProps.hideFooter && <Footer/>}
    </div>
  );
}

export default MyApp;