"use client";

interface TagChipsProps {
  tags: string[];
  activeTag: string | null;
  onTagClick: (tag: string | null) => void;
}

export default function TagChips({
  tags,
  activeTag,
  onTagClick,
}: TagChipsProps) {
  return (
    <div className="overflow-x-auto whitespace-nowrap pb-2">
      <div className="inline-flex gap-2">
        <button
          onClick={() => onTagClick(null)}
          className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
            activeTag === null
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-900 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => onTagClick(tag)}
            className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
              activeTag === tag
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-900 hover:bg-gray-200"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
