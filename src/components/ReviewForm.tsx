"use client";

import React, { useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { Star } from "lucide-react";

type Props = {
  token: string;
  villaName?: string;
  guestName?: string;
};

type Ratings = {
  cleanliness_rating: number; // 1-5
  comfort_rating: number; // 1-5
  hospitality_rating: number; // 1-5
};

type Hovered = {
  cleanliness: number;
  comfort: number;
  hospitality: number;
};

const MAX_COMMENT_LEN = 2000;

export default function ReviewForm({ token, villaName, guestName }: Props) {
  const [ratings, setRatings] = useState<Ratings>({
    cleanliness_rating: 0,
    comfort_rating: 0,
    hospitality_rating: 0,
  });
  const [hovered, setHovered] = useState<Hovered>({
    cleanliness: 0,
    comfort: 0,
    hospitality: 0,
  });
  const [comment, setComment] = useState("");
  const [authorName, setAuthorName] = useState(guestName ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<null | { message: string }>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const allSet =
      ratings.cleanliness_rating >= 1 &&
      ratings.comfort_rating >= 1 &&
      ratings.hospitality_rating >= 1;
    const hasComment = comment.trim().length > 0;
    return !!token && allSet && hasComment && !submitting && !success;
  }, [ratings, comment, submitting, success, token]);

  const handleSetRating = (key: keyof Ratings, v: number) => {
    setRatings((prev) => ({ ...prev, [key]: Math.max(1, Math.min(5, v)) }));
  };

  const displayStars = (
    active: number,
    onPick: (v: number) => void,
    onHover: (v: number) => void,
    hoveredVal: number,
  ) => {
    const current = hoveredVal > 0 ? hoveredVal : active;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => onHover(i)}
            onMouseLeave={() => onHover(0)}
            onClick={() => onPick(i)}
            className="p-1"
            aria-label={`${i} yıldız`}
          >
            <Star
              className={`h-6 w-6 ${
                i <= current ? "fill-amber-400 text-amber-400" : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const sanitizeComment = (raw: string) => {
    try {
      return DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
    } catch {
      return raw.trim();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const body = {
      token,
      cleanliness_rating: ratings.cleanliness_rating,
      comfort_rating: ratings.comfort_rating,
      hospitality_rating: ratings.hospitality_rating,
      comment: sanitizeComment(comment).slice(0, MAX_COMMENT_LEN),
      author_name: authorName?.trim() || undefined,
    };

    try {
      const res = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Gönderim başarısız");
      }

      setSuccess({ message: "Teşekkürler! Değerlendirmeniz başarıyla alındı." });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Beklenmeyen bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Teşekkürler</h2>
          <p className="text-gray-700">{success.message}</p>
          <p className="text-sm text-gray-500 mt-2">
            Yorumunuz incelendikten sonra villa sayfasında yayınlanacaktır.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-6">
          {villaName ? (
            <h1 className="text-2xl font-bold">“{villaName}” için değerlendirme</h1>
          ) : (
            <h1 className="text-2xl font-bold">Konaklamanızı değerlendirin</h1>
          )}
          {guestName ? (
            <p className="text-gray-600 mt-1">Merhaba {guestName}, deneyiminizi paylaşın.</p>
          ) : (
            <p className="text-gray-600 mt-1">Lütfen deneyiminizi puanlayın ve yorumunuzu yazın.</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* İsim (opsiyonel) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">İsim (opsiyonel)</label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              maxLength={120}
              className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Adınız (isteğe bağlı)"
            />
          </div>

          {/* Temizlik */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Temizlik</label>
              <span className="text-sm text-gray-500">
                {ratings.cleanliness_rating > 0 ? `${ratings.cleanliness_rating}/5` : "–/5"}
              </span>
            </div>
            {displayStars(
              ratings.cleanliness_rating,
              (v) => handleSetRating("cleanliness_rating", v),
              (v) => setHovered((h) => ({ ...h, cleanliness: v })),
              hovered.cleanliness,
            )}
          </div>

          {/* Konfor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Konfor</label>
              <span className="text-sm text-gray-500">
                {ratings.comfort_rating > 0 ? `${ratings.comfort_rating}/5` : "–/5"}
              </span>
            </div>
            {displayStars(
              ratings.comfort_rating,
              (v) => handleSetRating("comfort_rating", v),
              (v) => setHovered((h) => ({ ...h, comfort: v })),
              hovered.comfort,
            )}
          </div>

          {/* Misafirperverlik */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Misafirperverlik</label>
              <span className="text-sm text-gray-500">
                {ratings.hospitality_rating > 0 ? `${ratings.hospitality_rating}/5` : "–/5"}
              </span>
            </div>
            {displayStars(
              ratings.hospitality_rating,
              (v) => handleSetRating("hospitality_rating", v),
              (v) => setHovered((h) => ({ ...h, hospitality: v })),
              hovered.hospitality,
            )}
          </div>

          {/* Yorum */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yorumunuz</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={6}
              maxLength={MAX_COMMENT_LEN}
              required
              className="w-full rounded-md border px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Deneyiminizi paylaşın…"
            />
            <p className="text-xs text-gray-500 mt-1">
              {comment.length}/{MAX_COMMENT_LEN} karakter
            </p>
          </div>

          {/* Hata */}
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Gönder */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={`w-full rounded-md px-5 py-3 font-semibold text-white transition ${
              canSubmit ? "bg-amber-500 hover:bg-amber-600" : "bg-gray-400 cursor-not-allowed"
            }`}
            aria-disabled={!canSubmit}
          >
            {submitting ? "Gönderiliyor…" : "Değerlendirmeyi Gönder"}
          </button>
        </form>
      </div>
    </div>
  );
}
