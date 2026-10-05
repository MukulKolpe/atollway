import Link from "next/link";
import { Button } from "~~/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">The page you are looking for does not exist.</p>
      <Button asChild className="mt-3 rounded-full">
        <Link href="/">Back to the overview</Link>
      </Button>
    </div>
  );
}
