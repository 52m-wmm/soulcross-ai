import ReadingResultClient from "./reading-result-client";

export default function ReadingPage({ params }: { params: { id: string } }) {
  return <ReadingResultClient readingId={params.id} />;
}
