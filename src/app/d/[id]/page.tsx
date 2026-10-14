import type { Metadata } from "next";
import { AppNav } from "@/components/terminal/AppNav";
import { StatusBar } from "@/components/terminal/StatusBar";
import { DocumentScreen } from "@/features/workspace/DocumentScreen";

export const metadata: Metadata = { title: "inkthread — document graph" };

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
