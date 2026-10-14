import { PageFrame } from "@/components/terminal/PageFrame";

export default function Home() {
  return (
    <PageFrame active="home" statusLeft="inkthread.dev ~/">
      <h1 className="font-mono text-4xl">inkthread</h1>
    </PageFrame>
  );
}
