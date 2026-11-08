import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container section prose">
      <h1>الصفحة غير موجودة</h1>
      <p className="muted">الرابط اللي فتحتي ما كاينش أو تبدل.</p>
      <Link className="button" href="/collections/all">رجع للمنتجات</Link>
    </main>
  );
}
