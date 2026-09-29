import { useCallback, useEffect, useReducer, useRef } from "react";
import type { TurnEvent } from "assemblyai/streaming";
import { TranscriptionSession, type TranscriptionStatus } from "./transcription-session";

interface Turn {
  order: number;
  text: string;
  isFinal: boolean;
}

interface State {
  status: TranscriptionStatus;
  turns: Turn[];
  errorMessage: string | null;
}

type Action =
  | { type: "start" }
  | { type: "status"; status: TranscriptionStatus }
  | { type: "turn"; turn: TurnEvent }
  | { type: "error"; message: string };

const initialState: State = { status: "idle", turns: [], errorMessage: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "start":
      return { ...initialState, status: "connecting" };
    case "status":
      if (action.status === "completed" || action.status === "error") {
        // The session is over: keep any unfinished turn as part of the final transcript.
        return {
          ...state,
          status: action.status,
          turns: state.turns.map((turn) => ({ ...turn, isFinal: true })),
        };
      }
      return { ...state, status: action.status };
    case "turn":
      return { ...state, turns: upsertTurn(state.turns, action.turn) };
    case "error":
      return { ...state, errorMessage: action.message };
  }
}

/**
 * Every Turn message carries the full text of its turn so far, so a newer
 * message replaces the previous one with the same `turn_order`.
 */
function upsertTurn(turns: Turn[], event: TurnEvent): Turn[] {
  const turn: Turn = {
    order: event.turn_order,
    text: event.transcript.trim(),
    isFinal: event.end_of_turn,
  };
  const index = turns.findIndex((existing) => existing.order === turn.order);
  if (index === -1) return [...turns, turn].sort((a, b) => a.order - b.order);
  return turns.with(index, turn);
}

function joinTurns(turns: Turn[]): string {
  return turns
    .map((turn) => turn.text)
    .filter(Boolean)
    .join(" ");
}

export interface Transcription {
  status: TranscriptionStatus;
  /** Text of the turn currently being spoken; it may still change. */
  liveTranscript: string;
  /** Text of all completed turns. */
  finalTranscript: string;
  errorMessage: string | null;
  start(): void;
  stop(): void;
}

/** Live transcription state for one speaker; at most one session runs at a time. */
export function useTranscription(): Transcription {
  const [state, dispatch] = useReducer(reducer, initialState);
  const sessionRef = useRef<TranscriptionSession | null>(null);

  const start = useCallback(() => {
    if (sessionRef.current) return;

    const session = new TranscriptionSession({
      onStatusChange: (status) => dispatch({ type: "status", status }),
      onTurn: (turn) => dispatch({ type: "turn", turn }),
      onError: (error) => dispatch({ type: "error", message: error.message }),
    });
    sessionRef.current = session;
    dispatch({ type: "start" });
    void session.run().finally(() => {
      if (sessionRef.current === session) sessionRef.current = null;
    });
  }, []);

  const stop = useCallback(() => sessionRef.current?.stop(), []);

  // Release the microphone and socket if the component unmounts mid-session.
  useEffect(() => () => sessionRef.current?.stop(), []);

  return {
    status: state.status,
    liveTranscript: joinTurns(state.turns.filter((turn) => !turn.isFinal)),
    finalTranscript: joinTurns(state.turns.filter((turn) => turn.isFinal)),
    errorMessage: state.errorMessage,
    start,
    stop,
  };
}
