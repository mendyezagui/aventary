import VideoFeed, { type FeedItem } from "@/components/VideoFeed";
import { clockDuration, embedUrl, listVideos, mediaUrl, posterUrl } from "@/lib/videos";

export const revalidate = 60;

/**
 * Deliberately `noindex, follow`. Every clip in here is already indexable at its
 * own /videos/<slug>, and letting the feed into the index would just put one URL
 * in competition with all of them. `follow` keeps the links live for crawlers
 * that arrive here anyway.
 */
export const metadata = {
  title: "Feed",
  description: "Scroll the Aventary clip feed — one video at a time.",
  robots: { index: false, follow: true },
  alternates: { canonical: "https://aventary.com/videos" }
};

export default async function VideoFeedPage({
  searchParams
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const { v } = await searchParams;
  const videos = await listVideos();

  const items: FeedItem[] = videos.map((video) => ({
    slug: video.slug,
    title: video.title,
    description: video.description,
    poster: posterUrl(video),
    src: mediaUrl(video),
    embed: embedUrl(video),
    orientation: video.orientation,
    duration: clockDuration(video.duration_seconds),
    topics: video.topics,
    postSlug: video.post_slug
  }));

  return <VideoFeed items={items} startSlug={v} />;
}
