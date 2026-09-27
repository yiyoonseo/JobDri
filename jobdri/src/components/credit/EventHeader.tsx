import Image from "next/image";
import Link from "next/link";

export default function EventHeader() {
  return (
    <Link
      href="/event"
      className="my-16 flex items-center justify-center cursor-pointer z-50"
    >
      <Image
        src="/eventBanner.png"
        width={1200}
        height={300}
        alt="eventBanner"
        className="shrink-0 object-cover pr-4"
      />
    </Link>
  );
}
