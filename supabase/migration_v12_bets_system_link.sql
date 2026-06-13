-- v12: koppla insatser till sparade system.
-- En insats kan registreras direkt från ett systemkort ("Jag spelade detta
-- system") — då fylls insatsen (rader × radpris) i automatiskt och kopplas till
-- systemet så att ROI-tabellen kan visa systemets träff. system_id är nullable;
-- manuellt inmatade insatser saknar koppling.

ALTER TABLE bets
  ADD COLUMN IF NOT EXISTS system_id uuid REFERENCES game_systems(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bets_system ON bets(system_id);
