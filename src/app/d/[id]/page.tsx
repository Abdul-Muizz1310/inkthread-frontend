import type { Metadata } from "next";
import { AppNav } from "@/components/terminal/AppNav";
import { StatusBar } from "@/components/terminal/StatusBar";
import { DocumentScreen } from "@/features/workspace/DocumentScreen";

// An upload, kept for an hour: previewable when shared, never in search results.
export const metadata: Metadata = { title: "document graph", robots: { index: false } };

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex min-h-screen flex-col">
      <AppNav active="document" />
      <main className="flex-1">
        <DocumentScreen id={id} />
      </main>
      <StatusBar left={`inkthread.dev ~/d/${id.slice(0, 8)}`} right="UTF-8 · verbatim · grounded" />
    </div>
  );
}
