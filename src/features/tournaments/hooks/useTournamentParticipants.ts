import { useCallback, useEffect, useMemo, useState } from "react";

import { TournamentService, FirestoreUserService } from "@core/services/firestore";
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
    if (tournamentIds.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // 並列で参加者情報を取得
      const participantPromises = tournamentIds.map(async (tournamentId) => {
        try {
          const tournamentParticipants =
            await TournamentService.getTournamentParticipants(tournamentId);
          return { tournamentId, participants: tournamentParticipants };
        } catch (err) {
          console.warn(
            `Failed to fetch participants for tournament ${tournamentId}:`,
            err,
          );
          return { tournamentId, participants: [] };
        }
      });

      const results = await Promise.allSettled(participantPromises);

      const newParticipants: Record<string, StrictTournamentParticipant[]> = {};

      results.forEach((result) => {
        if (result.status === "fulfilled") {
          newParticipants[result.value.tournamentId] =
            result.value.participants;
        }
      });

      setParticipants((prev) => ({ ...prev, ...newParticipants }));
    } catch (err) {
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
