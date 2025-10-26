import { useCallback, useMemo, useState } from "react";

import { TournamentService } from "@core/services/firestore";
import type { StrictTournamentParticipant } from "@project-types/strict";

interface UseTournamentParticipantsState {
  participants: Record<string, StrictTournamentParticipant[]>;
  loading: boolean;
  error: string | null;
}

interface UseTournamentParticipantsActions {
  refreshParticipants: (tournamentIds: string[]) => Promise<void>;
  getParticipants: (tournamentId: string) => StrictTournamentParticipant[];
}

export const useTournamentParticipants = (): [
  UseTournamentParticipantsState,
  UseTournamentParticipantsActions,
] => {
  const [participants, setParticipants] = useState<
    Record<string, StrictTournamentParticipant[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshParticipants = useCallback(async (tournamentIds: string[]) => {
    const uniqueIds = Array.from(
      new Set(tournamentIds.filter((id): id is string => !!id)),
    );
    if (uniqueIds.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const grouped =
        await TournamentService.getParticipantsForTournaments(uniqueIds);
      setParticipants((prev) => ({ ...prev, ...grouped }));
    } catch (err) {
      console.warn("[useTournamentParticipants] bulk fetch failed", err);
      setError(
        err instanceof Error ? err.message : "参加者情報の取得に失敗しました",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const getParticipants = useCallback(
    (tournamentId: string): StrictTournamentParticipant[] => {
      return participants[tournamentId] || [];
    },
    [participants],
  );

  const state: UseTournamentParticipantsState = useMemo(
    () => ({
      participants,
      loading,
      error,
    }),
    [participants, loading, error],
  );

  const actions: UseTournamentParticipantsActions = useMemo(
    () => ({
      refreshParticipants,
      getParticipants,
    }),
    [refreshParticipants, getParticipants],
  );

  return [state, actions];
};

export default useTournamentParticipants;
