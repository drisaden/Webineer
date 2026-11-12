import { notFound } from "next/navigation";
import { AttendeeRoom } from "@/components/room/attendee-room";
import { mockWebinarRepository } from "@/services/mock-webinar-repository";

export default async function WebinarRoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const webinar = mockWebinarRepository.getBySlug(slug);

  if (!webinar) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-4 py-8 text-primaryText md:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-secondaryText">Attendee room</p>
            <h1 className="mt-1 text-2xl font-semibold text-primaryText">{webinar.title}</h1>
          </div>
        </header>
        <AttendeeRoom webinar={webinar} />
      </div>
    </main>
  );
}
