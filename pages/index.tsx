import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/portugal-outreach');
  }, [router]);

  return null;
}

export const getStaticProps = async () => {
  return {
    props: {
      hideNav: true,
      hideFooter: true,
    },
  };
};
