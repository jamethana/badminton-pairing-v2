/**
 * Placeholder for a deleted user in pairing slots (DB stores NULL; UI shows "Deleted user").
 * Use when resolving pairing player ids to display objects (getPlayerById(id) for null or missing id).
 */

export const DELETED_USER_DISPLAY_NAME = "Deleted user";

export const DELETED_USER_ID = "deleted-user";

export type DeletedUserPlaceholder = {
  id: string;
  display_name: string;
  skill_level: number;
  picture_url: null;
};

const placeholder: DeletedUserPlaceholder = {
  id: DELETED_USER_ID,
  display_name: DELETED_USER_DISPLAY_NAME,
  skill_level: 0,
  picture_url: null,
};

export function getDeletedUserPlaceholder(): DeletedUserPlaceholder {
  return placeholder;
}
