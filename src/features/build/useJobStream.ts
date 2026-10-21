"use client";

/**
 * Subscribes to a job's event stream. Named events, `?after=` resume on reconnect, jittered
 * backoff (0.5 s → 8 s), and a terminal latch: once `done` or `failed` arrives the stream never
 * reconnects (the cold-start reconnect storm inkprint learned about).
 */
import { useEffect, useReducer, useRef } from "react";
import { apiUrl } from "@/lib/api/client";
import {
  DeltaEvent,
  DoneEvent,
  FailedEvent,
  type JobEvent,
  LlmEvent,
  StageEvent,
} from "@/lib/contract/api";
import { type BuildState, initialBuild, reduceBuild } from "./reducer";

const SCHEMAS = {
  stage: StageEvent,
  delta: DeltaEvent,
  llm: LlmEvent,
  done: DoneEvent,
  failed: FailedEvent,
} as const;
type Name = keyof typeof SCHEMAS;

export function parseEvent(name: Name, id: string, raw: string): JobEvent | null {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  try {
    const parsed = SCHEMAS[name].safeParse(JSON.parse(raw));
    return parsed.success ? ({ id: n, type: name, data: parsed.data } as JobEvent) : null;
  } catch {
    return null;
  }
}

export function backoff(attempt: number, random = Math.random): number {
  const base = Math.min(8000, 500 * 2 ** attempt);
  return Math.round(base * (0.9 + random() * 0.2));
}

export function useJobStream(jobId: string | null): BuildState {
  const [state, dispatch] = useReducer(reduceBuild, undefined, initialBuild);
  const last = useRef(0);
  const done = useRef(false);
  useEffect(() => {
    last.current = state.lastId;
    done.current = state.status !== "building";
  }, [state.lastId, state.status]);

  useEffect(() => {
    if (!jobId) return;
    let source: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let closed = false;
    const open = () => {
      if (closed || done.current) return;
      const url = new URL(
        apiUrl(`/jobs/${encodeURIComponent(jobId)}/events`),
        window.location.origin,
      );
      if (last.current > 0) url.searchParams.set("after", String(last.current));
      source = new EventSource(url);
      for (const name of Object.keys(SCHEMAS) as Name[]) {
        source.addEventListener(name, (e) => {
          const msg = e as MessageEvent<string>;
          const ev = parseEvent(name, msg.lastEventId, msg.data);
          if (!ev) return;
          attempt = 0;
          dispatch(ev);
          if (name === "done" || name === "failed") {
            done.current = true;
            source?.close();
          }
        });
      }
      source.onerror = () => {
        source?.close();
        if (closed || done.current) return;
        timer = setTimeout(open, backoff(attempt++));
      };
    };
    open();
    return () => {
      closed = true;
      source?.close();
      if (timer) clearTimeout(timer);
    };
  }, [jobId]);

  return state;
}
