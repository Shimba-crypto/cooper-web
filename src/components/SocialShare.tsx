import { MessageCircle, Share2 } from "lucide-react";

interface Props {
  title: string;
  url: string;
}

export default function SocialShare({ title, url }: Props) {
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);
  const text = encodeURIComponent(`${title} - ${url}`);

  const links = [
    {
      label: "Share on X (Twitter)",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      className: "bg-black text-white hover:bg-slate-800",
      content: <span className="text-sm font-bold">𝕏</span>,
    },
    {
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      className: "bg-blue-600 text-white hover:bg-blue-700",
      content: <span className="text-sm font-bold">f</span>,
    },
    {
      label: "Share on WhatsApp",
      href: `https://wa.me/?text=${text}`,
      className: "bg-green-600 text-white hover:bg-green-700",
      content: <MessageCircle className="h-4 w-4" />,
    },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="mr-1 flex items-center gap-1.5 text-sm font-semibold text-slate-500 dark:text-slate-400">
        <Share2 className="h-4 w-4" /> Share
      </span>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition ${link.className}`}
        >
          {link.content}
        </a>
      ))}
    </div>
  );
}
