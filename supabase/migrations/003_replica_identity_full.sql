-- Enable REPLICA IDENTITY FULL on tables used by Supabase Realtime so that
-- UPDATE and DELETE events include the full old row in payload.old.
-- Required for realtime DELETE handling in use-session-realtime.ts.

ALTER TABLE sessions REPLICA IDENTITY FULL;
ALTER TABLE session_players REPLICA IDENTITY FULL;
ALTER TABLE pairings REPLICA IDENTITY FULL;
ALTER TABLE game_results REPLICA IDENTITY FULL;
