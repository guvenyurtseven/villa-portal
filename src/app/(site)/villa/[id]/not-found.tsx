import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="p-6 text-center min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">Villa Bulunamadı</h1>
      <p className="text-gray-500 mb-8">Aradığınız villa mevcut değil veya kaldırılmış olabilir.</p>
      <Button asChild>
        <Link href="/">Ana Sayfaya Dön</Link>
      </Button>
    </main>
  );
}
