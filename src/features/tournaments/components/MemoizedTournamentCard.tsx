import React, { memo } from "react";

import type { UITournament } from "./TournamentCard";
import TournamentCard from "./TournamentCard";

interface MemoizedTournamentCardProps {
  tournament: UITournament;
  onJoin: (tournamentId: string) => void;
  onView: (idOrUserKey: string) => void;
  onToggleRecruitment: (id: string, open: boolean) => Promise<void>;
  showDelete: boolean;
  onDelete: (id: string) => void;
}

const MemoizedTournamentCard = memo<MemoizedTournamentCardProps>(
  ({
    tournament,
    onJoin,
    onView,
    onToggleRecruitment,
    showDelete,
    onDelete,
  }) => (
    <TournamentCard
      tournament={tournament}
      onJoin={onJoin}
      onView={onView}
      onToggleRecruitment={onToggleRecruitment}
      showDelete={showDelete}
      onDelete={onDelete}
    />
  ),
);

MemoizedTournamentCard.displayName = "MemoizedTournamentCard";

export default MemoizedTournamentCard;
