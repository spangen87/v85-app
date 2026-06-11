-- Migration v10: Spara hästens fulla starthistorik per starter.
-- Tidigare hämtades historiken från ATG och användes bara in-memory för
-- spårfaktorberäkningen — den kastades efter hämtning, vilket gjorde
-- spårfaktorn omöjlig att backtesta i efterhand.
-- Format: jsonb-array av HorseStart: [{"place":"1","date":"2026-01-01","track":"Solvalla","time":"1:14,5","post_position":3}, ...]

alter table starters add column if not exists horse_starts_history jsonb;
