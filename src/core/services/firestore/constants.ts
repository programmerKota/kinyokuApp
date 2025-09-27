export const DISABLE_FIRESTORE = process.env.EXPO_PUBLIC_DISABLE_FIRESTORE === 'true';

type EnvLike = { [key: string]: string | undefined };
const ENV: EnvLike =
  typeof process !== 'undefined' && (process as unknown as { env?: EnvLike }).env
    ? ((process as unknown as { env?: EnvLike }).env as EnvLike)
    : ({} as EnvLike);

const rawPrefix = (ENV.EXPO_PUBLIC_FS_PREFIX || '').trim();
const FS_PREFIX = rawPrefix && rawPrefix !== 'undefined' && rawPrefix !== 'null' ? rawPrefix : '';
const withPrefix = (name: string) => (FS_PREFIX ? `${FS_PREFIX}_${name}` : name);

export const COLLECTIONS = {
  USERS: withPrefix('users'),
  CHALLENGES: withPrefix('challenges'),
  TOURNAMENTS: withPrefix('tournaments'),
  TOURNAMENT_PARTICIPANTS: withPrefix('tournamentParticipants'),
  TOURNAMENT_JOIN_REQUESTS: withPrefix('tournamentJoinRequests'),
  TOURNAMENT_MESSAGES: withPrefix('tournamentMessages'),
  COMMUNITY_POSTS: withPrefix('communityPosts'),
  COMMUNITY_COMMENTS: withPrefix('communityComments'),
  COMMUNITY_LIKES: withPrefix('communityLikes'),
  PAYMENTS: withPrefix('payments'),
  DIARIES: withPrefix('diaries'),
  FOLLOWS: withPrefix('follows'),
  BLOCKS: withPrefix('blocks'),
  RANKINGS: withPrefix('rankings'),
  SYSTEM: withPrefix('system'),
} as const;

