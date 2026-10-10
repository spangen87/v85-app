-- Starttider sparades som ATG:s svenska lokaltid tolkad som UTC (två timmar fel på
-- sommaren, en på vintern). Från och med nu gör hämtningen om tiden till svensk tid
-- (lib/atg.ts → atgLocalTimeToIso). Den här migrationen rättar raderna som redan finns:
-- väggklockan i UTC tolkas om som Europe/Stockholm.
--
-- KÖR BARA EN GÅNG. Körs den igen flyttas tiderna ännu en gång.
update races
set start_time = (start_time at time zone 'UTC') at time zone 'Europe/Stockholm'
where start_time is not null;
