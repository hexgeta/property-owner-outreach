import { GetStaticProps } from 'next';
import ReadingPractice from '../components/reading-practice';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
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