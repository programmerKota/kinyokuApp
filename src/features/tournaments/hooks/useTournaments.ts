import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "@app/config/supabase.config";
import { useAuth } from "@app/contexts/AuthContext";
import {
  FirestoreUserService,
  TournamentService,
} from "@core/services/firestore";
import type { FirestoreTournament } from "@core/services/firestore/types";
import ProfileCache, { type UserProfileLite } from "@core/services/profileCache";
import UserService from "@core/services/userService";
import useErrorHandler from "@shared/hooks/useErrorHandler";
import type { StrictTournamentParticipant } from "@project-types/strict";

import useTournamentParticipants from "./useTournamentParticipants";

export type TournamentFilter = "all" | "joined";

export interface TournamentListItem {
  id: string;
  name: string;
  description: string;
  participantCount: number;
  status: "upcoming" | "active" | "completed" | "cancelled";
  isJoined: boolean;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  recruitmentOpen?: boolean;
  requestPending?: boolean;
}

export interface UseTournamentsState {
  tournaments: TournamentListItem[];
  visibleTournaments: TournamentListItem[];
  filter: TournamentFilter;
  loading: boolean;
  refreshing: boolean;
  showCreateModal: boolean;
  myIds: Set<string>;
}

export interface UseTournamentsActions {
  setFilter: (filter: TournamentFilter) => void;
  setShowCreateModal: (show: boolean) => void;
  refresh: () => Promise<void>;
  createTournament: (data: { name: string; description: string }) => Promise<void>;
  joinTournament: (tournamentId: string) => Promise<void>;
  toggleRecruitment: (tournamentId: string, open: boolean) => Promise<void>;
  deleteTournament: (tournamentId: string) => Promise<void>;
}

export const useTournaments = (): [
  UseTournamentsState,
  UseTournamentsActions,
] => {
  const { user } = useAuth();
  const { handleError } = useErrorHandler();
  const [, participantsActions] = useTournamentParticipants();

  const [baseTournaments, setBaseTournaments] = useState<TournamentListItem[]>(
    [],
  );
  const [filter, setFilter] = useState<TournamentFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [myIds, setMyIds] = useState<Set<string>>(new Set());
  const [profilesMap, setProfilesMap] = useState<
    Map<string, UserProfileLite | undefined>
  >(new Map());
  const optimisticRef = useRef<Map<string, TournamentListItem>>(new Map());

  // デバイスID（レガシー）と Supabase UID をセット化
  useEffect(() => {
    const ids = new Set<string>();
    if (user?.uid) ids.add(user.uid);
    (async () => {
      try {
        const resolved = await FirestoreUserService.getCurrentUserId();
        if (resolved) ids.add(resolved);
      } catch {
        /* noop */
      }
      setMyIds(ids);
    })();
  }, [user?.uid]);

  // オーナープロフィールの購読（Community / Diary のパターンを踏襲）
  useEffect(() => {
    const ownerIds = Array.from(new Set(baseTournaments.map((t) => t.ownerId)));
    if (ownerIds.length === 0) {
      setProfilesMap(new Map());
      return;
    }
    const unsub = ProfileCache.getInstance().subscribeMany(ownerIds, (map) => {
      setProfilesMap(map);
    });
    return () => {
      try {
        unsub?.();
      } catch {
        /* noop */
      }
    };
  }, [baseTournaments]);

  const tournaments = useMemo(() => {
    if (!baseTournaments.length) return baseTournaments;
    return baseTournaments.map((tournament) => {
      const prof = profilesMap.get(tournament.ownerId);
      if (!prof) return tournament;
      return {
        ...tournament,
        ownerName: prof.displayName ?? tournament.ownerName,
        ownerAvatar: prof.photoURL ?? tournament.ownerAvatar,
      };
    });
  }, [baseTournaments, profilesMap]);

  const visibleTournaments = useMemo(
    () =>
      filter === "joined"
        ? tournaments.filter((t) => t.isJoined)
        : tournaments,
    [filter, tournaments],
  );

  const isJoinedByMe = useCallback(
    (
      tournament: FirestoreTournament,
      participants: StrictTournamentParticipant[],
      currentUserId?: string,
    ) => {
      const identity = new Set<string>(myIds);
      if (currentUserId) identity.add(currentUserId);
      if (identity.has(tournament.ownerId)) return true;
      return participants.some((p) => identity.has(p.userId));
    },
    [myIds],
  );

  const fetchPendingRequests = useCallback(
    async (
      tournamentIds: string[],
      currentUserId?: string,
    ): Promise<Set<string>> => {
      if (!currentUserId || tournamentIds.length === 0) return new Set();
      try {
        const { data, error } = await supabase
          .from("tournament_join_requests")
          .select("tournamentId")
          .eq("userId", currentUserId)
          .eq("status", "pending")
          .in("tournamentId", tournamentIds);
        if (error) throw error;
        return new Set(
          (data || []).map((row) =>
            String((row as { tournamentId: string }).tournamentId),
          ),
        );
      } catch (e) {
        console.warn("[useTournaments] fetchPendingRequests failed", e);
        return new Set();
      }
    },
    [],
  );

  const getLocalOwnerProfile = useCallback(async () => {
    const userService = UserService.getInstance();
    return {
      name: (await userService.getUserName()) || "ユーザー",
      avatar: await userService.getAvatarUrl(),
    };
  }, []);

  const mergeWithOptimistic = useCallback(
    (list: TournamentListItem[]): TournamentListItem[] => {
      if (optimisticRef.current.size === 0) return list;
      const extras: TournamentListItem[] = [];
      const nextList = [...list];
      optimisticRef.current.forEach((optimistic, id) => {
        const exists = nextList.some((t) => t.id === id);
        if (exists) {
          optimisticRef.current.delete(id);
        } else {
          extras.push(optimistic);
        }
      });
      return extras.length > 0 ? [...extras, ...nextList] : nextList;
    },
    [],
  );

  const buildTournamentItems = useCallback(
    (
      firestoreTournaments: FirestoreTournament[],
      pendingSet: Set<string>,
      currentUserId?: string,
      localOwnerProfile?: { name: string; avatar?: string | null },
    ): TournamentListItem[] => {
      return firestoreTournaments.map((tournament) => {
        const participants = participantsActions.getParticipants(tournament.id);
        const participantCount = participants.some(
          (p) => p.userId === tournament.ownerId,
        )
          ? participants.length
          : participants.length + 1;
        const joined = isJoinedByMe(tournament, participants, currentUserId);

        const ownerParticipant = participants.find(
          (p) => p.userId === tournament.ownerId,
        );
        let ownerName = ownerParticipant?.userName || "ユーザー";
        let ownerAvatar = ownerParticipant?.userAvatar ?? undefined;
        if (!ownerParticipant && currentUserId === tournament.ownerId) {
          ownerName = user?.displayName || localOwnerProfile?.name || "ユーザー";
          ownerAvatar =
            user?.avatarUrl || localOwnerProfile?.avatar || undefined;
        }

        return {
          id: tournament.id,
          name: tournament.name,
          description: tournament.description ?? "",
          participantCount,
          status: tournament.status,
          isJoined: joined,
          ownerId: tournament.ownerId,
          ownerName,
          ownerAvatar,
          recruitmentOpen: tournament.recruitmentOpen ?? true,
          requestPending: pendingSet.has(tournament.id),
        };
      });
    },
    [isJoinedByMe, participantsActions, user?.avatarUrl, user?.displayName],
  );

  const hydrateTournaments = useCallback(
    async (firestoreTournaments: FirestoreTournament[]) => {
      if (firestoreTournaments.length === 0) {
        setBaseTournaments([]);
        return;
      }

      const tournamentIds = firestoreTournaments.map((t) => t.id);

      const currentUserId = await FirestoreUserService.getCurrentUserId();
      const pendingSet = await fetchPendingRequests(
        tournamentIds,
        currentUserId,
      );
      const needsLocalOwner = currentUserId
        ? firestoreTournaments.some((t) => t.ownerId === currentUserId)
        : false;
      const localOwnerProfile = needsLocalOwner
        ? await getLocalOwnerProfile()
        : null;

      const initialMapped = buildTournamentItems(
        firestoreTournaments,
        pendingSet,
        currentUserId,
        localOwnerProfile || undefined,
      );
      setBaseTournaments(mergeWithOptimistic(initialMapped));

      void participantsActions
        .refreshParticipants(tournamentIds)
        .then(() => {
          const updated = buildTournamentItems(
            firestoreTournaments,
            pendingSet,
            currentUserId,
            localOwnerProfile || undefined,
          );
          setBaseTournaments((prev) => {
            // avoid unnecessary updates if nothing changed and no optimistic entries
            if (
              optimisticRef.current.size === 0 &&
              prev.length === updated.length &&
              prev.every((item, idx) => item.id === updated[idx].id)
            ) {
              return prev;
            }
            return mergeWithOptimistic(updated);
          });
        })
        .catch((error) => {
          console.warn("[useTournaments] refreshParticipants failed", error);
        });
    },
    [
      fetchPendingRequests,
      getLocalOwnerProfile,
      buildTournamentItems,
      mergeWithOptimistic,
      participantsActions,
    ],
  );

  // Posts / Diary と同様、購読でリストを常時同期
  useEffect(() => {
    if (!user) {
      setBaseTournaments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = TournamentService.subscribeToTournaments(
      (firestoreTournaments) => {
        void hydrateTournaments(firestoreTournaments)
          .catch((error) => {
            handleError(
              error,
              { component: "useTournaments", action: "subscribe" },
              { fallbackMessage: "トーナメント一覧の購読に失敗しました" },
            );
          })
          .finally(() => {
            setLoading(false);
          });
      },
    );
    return () => {
      unsubscribe();
    };
  }, [user, hydrateTournaments, handleError]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const firestoreTournaments = await TournamentService.getTournaments();
      await hydrateTournaments(firestoreTournaments);
    } finally {
      setRefreshing(false);
    }
  }, [hydrateTournaments]);

  const createTournament = useCallback(
    async (data: { name: string; description: string }) => {
      const now = new Date();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const ownerId = await FirestoreUserService.getCurrentUserId();
      const tournamentId = await TournamentService.createTournament({
        name: data.name,
        description: data.description,
        ownerId,
        status: "upcoming",
        recruitmentOpen: true,
        startDate: now,
        endDate,
      });
      await TournamentService.joinTournament(tournamentId);

      const localProfile = await getLocalOwnerProfile();
      const optimistic: TournamentListItem = {
        id: tournamentId,
        name: data.name,
        description: data.description,
        participantCount: 1,
        status: "upcoming",
        isJoined: true,
        ownerId,
        ownerName: user?.displayName || localProfile.name,
        ownerAvatar: user?.avatarUrl || localProfile.avatar || undefined,
        recruitmentOpen: true,
        requestPending: false,
      };

      optimisticRef.current.set(tournamentId, optimistic);
      setBaseTournaments((prev) => [
        optimistic,
        ...prev.filter((t) => t.id !== tournamentId),
      ]);

      void refresh();
    },
    [getLocalOwnerProfile, refresh, user?.avatarUrl, user?.displayName],
  );

  const joinTournament = useCallback(async (tournamentId: string) => {
    await TournamentService.requestJoin(tournamentId);
    setBaseTournaments((prev) =>
      prev.map((t) => {
        if (t.id !== tournamentId || t.isJoined) return t;
        return { ...t, requestPending: true };
      }),
    );
  }, []);

  const toggleRecruitment = useCallback(
    async (tournamentId: string, open: boolean) => {
      let previous: boolean | undefined;
      let optimisticCopy: TournamentListItem | undefined;
      setBaseTournaments((prev) => {
        const next = prev.map((t) => {
          if (t.id !== tournamentId) return t;
          previous = t.recruitmentOpen;
          optimisticCopy = { ...t, recruitmentOpen: open };
          return optimisticCopy;
        });
        if (optimisticCopy) optimisticRef.current.set(tournamentId, optimisticCopy);
        return next;
      });
      try {
        await TournamentService.setRecruitmentOpen(tournamentId, open);
      } catch (error) {
        optimisticRef.current.delete(tournamentId);
        setBaseTournaments((prev) =>
          prev.map((t) =>
            t.id === tournamentId && previous !== undefined
              ? { ...t, recruitmentOpen: previous }
              : t,
          ),
        );
        throw error;
      }
    },
    [],
  );

  const deleteTournament = useCallback(async (tournamentId: string) => {
    await TournamentService.deleteTournament(tournamentId);
    setBaseTournaments((prev) => prev.filter((t) => t.id !== tournamentId));
  }, []);

  const state = useMemo<UseTournamentsState>(
    () => ({
      tournaments,
      visibleTournaments,
      filter,
      loading,
      refreshing,
      showCreateModal,
      myIds,
    }),
    [tournaments, visibleTournaments, filter, loading, refreshing, showCreateModal, myIds],
  );

  const actions = useMemo<UseTournamentsActions>(
    () => ({
      setFilter,
      setShowCreateModal,
      refresh,
      createTournament,
      joinTournament,
      toggleRecruitment,
      deleteTournament,
    }),
    [
      refresh,
      createTournament,
      joinTournament,
      toggleRecruitment,
      deleteTournament,
    ],
  );

  return [state, actions];
};

export default useTournaments;
