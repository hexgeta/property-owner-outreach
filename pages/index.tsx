import { GetStaticProps } from 'next';
import ReadingPractice from '../components/reading-practice';

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        <ReadingPractice />
      </div>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {
      hideNav: true,
      hideFooter: true
    }
  };
};